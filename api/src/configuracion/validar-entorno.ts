import {
  BYTES_PER_GB,
  DEFAULT_PDF_SPACE_GB,
  MAX_PDF_SPACE_GB,
  MIN_PDF_SPACE_GB,
  PLANS,
  type Plan,
} from '../plan/reglas-plan.js';

export interface Environment {
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  JWT_SECRET: string;
  TRUST_PROXY_HOPS: number;
  FRONTEND_ORIGINS: string[];
  /** Modo demo (spec 009, RF-15): apagado si falta. */
  MODO_DEMO: boolean;
  /** Plan de la publicación (spec 011, RF-1, RF-2): obligatorio, sin valor por defecto. */
  PLAN: Plan;
  /**
   * Espacio para PDF en bytes (spec 011, RF-27), leído de ESPACIO_PDF_GB. Con el plan Básico no se
   * usa y queda en el valor por defecto.
   */
  ESPACIO_PDF_BYTES: number;
}

const MIN_JWT_SECRET_LENGTH = 32;

type RawEnvironment = Record<string, unknown>;

function readText(raw: RawEnvironment, name: string): string | undefined {
  const value = raw[name];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function readRequired(raw: RawEnvironment, name: string, errors: string[]): string {
  const value = readText(raw, name);
  if (value === undefined) {
    errors.push(`Falta la variable ${name}`);
    return '';
  }
  return value;
}

function readPort(raw: RawEnvironment, name: string, fallback: number, errors: string[]): number {
  const value = readText(raw, name);
  if (value === undefined) return fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push(`${name} debe ser un número entero entre 1 y 65535`);
  }
  return port;
}

function readProxyHops(raw: RawEnvironment, errors: string[]): number {
  const value = readText(raw, 'TRUST_PROXY_HOPS');
  if (value === undefined) return 0;
  const hops = Number(value);
  if (!Number.isInteger(hops) || hops < 0) {
    errors.push('TRUST_PROXY_HOPS debe ser un número entero mayor o igual a 0');
  }
  return hops;
}

function isOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === value;
  } catch {
    return false;
  }
}

function readOrigins(raw: RawEnvironment, errors: string[]): string[] {
  const value = readRequired(raw, 'FRONTEND_ORIGINS', errors);
  if (value === '') return [];
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '');
  for (const origin of origins) {
    if (!isOrigin(origin)) {
      errors.push(`FRONTEND_ORIGINS tiene un origen inválido: ${origin}`);
    }
  }
  return origins;
}

/**
 * Modo demo (spec 009, RF-15; plan 009, D4): solo "true" lo enciende; si falta, queda apagado. Un
 * valor que no sea true ni false frena el arranque, para que un error de tipeo no lo encienda ni
 * lo apague sin aviso.
 */
function readDemoMode(raw: RawEnvironment, errors: string[]): boolean {
  const value = readText(raw, 'MODO_DEMO');
  if (value === undefined || value === 'false') return false;
  if (value === 'true') return true;
  errors.push('MODO_DEMO debe ser true o false');
  return false;
}

/**
 * Plan de la publicación (spec 011, RF-2; plan 011, D1): exactamente "basico" o "premium", en
 * minúsculas. Si falta o es otro valor, la api no arranca.
 */
function readPlan(raw: RawEnvironment, errors: string[]): Plan {
  const value = readText(raw, 'PLAN');
  if (value === undefined) {
    errors.push('Falta la variable PLAN');
    return 'basico';
  }
  if (!(PLANS as readonly string[]).includes(value)) {
    errors.push('PLAN debe ser basico o premium');
    return 'basico';
  }
  return value as Plan;
}

/**
 * Espacio para PDF (spec 011, RF-27; plan 011, D2): GB enteros de 1 a 1000, 10 si falta. Solo se
 * valida con el plan Premium: con el Básico se ignora, aunque sea inválido.
 */
function readPdfSpace(raw: RawEnvironment, plan: Plan, errors: string[]): number {
  const fallback = DEFAULT_PDF_SPACE_GB * BYTES_PER_GB;
  const value = readText(raw, 'ESPACIO_PDF_GB');
  if (plan !== 'premium' || value === undefined) return fallback;
  const gb = /^\d+$/.test(value) ? Number(value) : Number.NaN;
  if (!Number.isInteger(gb) || gb < MIN_PDF_SPACE_GB || gb > MAX_PDF_SPACE_GB) {
    errors.push(
      `ESPACIO_PDF_GB debe ser un número entero de ${MIN_PDF_SPACE_GB} a ${MAX_PDF_SPACE_GB}`,
    );
    return fallback;
  }
  return gb * BYTES_PER_GB;
}

/**
 * Valida las variables de entorno al arrancar la API.
 * Si algo falta o es inválido, lanza un error que lista todos los problemas y la API no arranca.
 */
export function validateEnvironment(raw: RawEnvironment): Environment {
  const errors: string[] = [];
  const plan = readPlan(raw, errors);

  const environment: Environment = {
    PORT: readPort(raw, 'PORT', 3000, errors),
    DB_HOST: readRequired(raw, 'DB_HOST', errors),
    DB_PORT: readPort(raw, 'DB_PORT', 3306, errors),
    DB_USERNAME: readRequired(raw, 'DB_USERNAME', errors),
    DB_PASSWORD: readRequired(raw, 'DB_PASSWORD', errors),
    DB_DATABASE: readRequired(raw, 'DB_DATABASE', errors),
    JWT_SECRET: readRequired(raw, 'JWT_SECRET', errors),
    TRUST_PROXY_HOPS: readProxyHops(raw, errors),
    FRONTEND_ORIGINS: readOrigins(raw, errors),
    MODO_DEMO: readDemoMode(raw, errors),
    PLAN: plan,
    ESPACIO_PDF_BYTES: readPdfSpace(raw, plan, errors),
  };

  // La demo muestra todas las funcionalidades (spec 011, RF-36). Si PLAN es inválido, ya hay error.
  if (environment.MODO_DEMO && readText(raw, 'PLAN') === 'basico') {
    errors.push('MODO_DEMO=true exige PLAN=premium');
  }

  if (environment.JWT_SECRET !== '' && environment.JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
    errors.push(`JWT_SECRET debe tener al menos ${MIN_JWT_SECRET_LENGTH} caracteres`);
  }

  if (errors.length > 0) {
    throw new Error(`Configuración inválida:\n- ${errors.join('\n- ')}`);
  }

  return environment;
}
