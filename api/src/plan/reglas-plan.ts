/**
 * Reglas puras de los planes de suscripción (spec 011; plan 011, "Módulos de NestJS"). No usan
 * la base ni Nest, para poder probarlas solas.
 */

/** Plan de la publicación (spec 011, RF-1). Se escribe en minúsculas, sin tilde. */
export type Plan = 'basico' | 'premium';

export const PLANS: readonly Plan[] = ['basico', 'premium'];

/** 1 GB = 1.073.741.824 bytes (spec 011, RF-27 y RF-30). */
export const BYTES_PER_GB = 1_073_741_824;

/** Espacio para PDF del plan Premium si la configuración no indica otro (spec 011, RF-27). */
export const DEFAULT_PDF_SPACE_GB = 10;

/** Rango del espacio configurable, en GB enteros (spec 011, RF-27). */
export const MIN_PDF_SPACE_GB = 1;
export const MAX_PDF_SPACE_GB = 1000;

/** Integrantes habilitados del plan Básico: administradores y abogados juntos (RF-17, RF-18). */
export const MAX_STAFF_BASICO = 2;

/** Desde qué parte del espacio se avisa que está por completarse (RF-29). */
export const NEAR_LIMIT_RATIO = 0.9;

/** El total de espacio, en GB enteros (RF-30). */
function totalGb(bytes: number): string {
  return `${Math.floor(bytes / BYTES_PER_GB)} GB`;
}

/** Mensajes de la api (spec 011, anexo A). El contacto de Bourder Web lo agrega la web (RF-33). */
export const PLAN_MESSAGES = {
  /** T-4 */
  featureNotIncluded: 'Tu plan no incluye esta función. Está disponible en el plan Premium.',
  /** T-5 */
  staffLimit:
    'El plan Básico incluye hasta 2 integrantes del estudio habilitados. Para sumar otro, desactivá uno o pasá al plan Premium.',
  /** T-6 */
  outsidePlanLogin:
    'Tu cuenta no está habilitada en el plan actual del estudio. Consultá con quien administra el estudio.',
  /** T-9 */
  pdfSpaceFull: (totalBytes: number): string =>
    `Se completó el espacio para PDF del estudio (${totalGb(totalBytes)}). Quitá algún PDF que no necesites o pedí más espacio a Bourder Web.`,
  /** T-14 */
  outsidePlanAccount: 'Esta cuenta está fuera del plan Básico. Habilitala para modificarla.',
  /** T-17 */
  updating: 'El sistema se está actualizando. Probá de nuevo en unos minutos',
  /** "Habilitar en el plan" sobre una cuenta sin la marca (plan 011, contrato de usuarios). */
  notOutsidePlan: 'La cuenta no está fuera del plan',
} as const;

/** Un integrante habilitado, con lo que hace falta para elegir quién queda (RF-20). */
export interface StaffMember {
  id: number;
  esPrincipal: boolean;
  creadoEn: Date;
}

/**
 * Los ids de los integrantes habilitados que quedan fuera del plan Básico (RF-20): se conservan
 * el administrador principal y, entre los demás, el de cuenta más antigua (con el id como
 * desempate). Vacío si son 2 o menos.
 */
export function selectOutsidePlan(integrantes: readonly StaffMember[]): number[] {
  const ordered = [...integrantes].sort(
    (a, b) =>
      Number(b.esPrincipal) - Number(a.esPrincipal) ||
      a.creadoEn.getTime() - b.creadoEn.getTime() ||
      a.id - b.id,
  );
  return ordered.slice(MAX_STAFF_BASICO).map((integrante) => integrante.id);
}

/**
 * Si guardar `nuevo` bytes supera el espacio (RF-28). En un reemplazo, `usado` ya no cuenta el
 * PDF anterior, que se borra antes (plan 011, "Espacio para PDF").
 */
export function exceedsPdfSpace(usado: number, nuevo: number, total: number): boolean {
  return usado + nuevo > total;
}
