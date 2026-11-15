import { httpClient, type HttpClient } from './cliente-http';
import type { MenuOption } from './menu-aplicacion';

/**
 * El plan de suscripción del estudio en el panel (spec 011; plan 011, "Frontend"). Reglas puras y
 * textos del anexo A, sin React. El plan lo decide la api: la web solo lo muestra (RF-4).
 */

export type Plan = 'basico' | 'premium';

/** Respuesta de GET /api/panel/plan (plan 011, contrato de la api). */
export type PlanInfo =
  | {
      plan: 'basico';
      integrantes: { habilitados: number; maximo: number };
      espacioPdf: null;
    }
  | {
      plan: 'premium';
      integrantes: null;
      espacioPdf: { usadoBytes: number; totalBytes: number };
    };

/** 1 GB = 1.073.741.824 bytes (RF-30). */
export const BYTES_PER_GB = 1_073_741_824;

/** Desde qué parte del espacio se avisa (RF-29). */
export const NEAR_LIMIT_RATIO = 0.9;

/** La dirección de la jurisprudencia, que lleva la etiqueta del plan Premium (RF-7). */
export const JURISPRUDENCIA_PATH = '/panel/jurisprudencia';

/** Textos del anexo A de la spec 011. */
export const PLAN_TEXTS = {
  /** T-1 */
  badge: 'Premium',
  /** Nombre accesible de la opción del menú (RNF de accesibilidad). */
  menuLabel: 'Jurisprudencia, plan Premium',
  /** T-2 */
  jurisprudenciaTitle: 'Jurisprudencia',
  jurisprudenciaText:
    'La jurisprudencia está disponible en el plan Premium: cargá fallos con su sumario, sus palabras clave y su PDF, y encontralos con el buscador. Para sumarla, contactá a Bourder Web.',
  /** T-3 */
  pdfNotIncluded:
    'Adjuntar el PDF del escrito, la cédula o la resolución está disponible en el plan Premium. Para sumarlo, contactá a Bourder Web.',
  /** T-4, el mismo texto que la api. */
  featureNotIncluded: 'Tu plan no incluye esta función. Está disponible en el plan Premium.',
  /** T-5, el mismo texto que la api. */
  staffLimit:
    'El plan Básico incluye hasta 2 integrantes del estudio habilitados. Para sumar otro, desactivá uno o pasá al plan Premium.',
  /** T-6, el mismo texto que la api. */
  outsidePlanLogin:
    'Tu cuenta no está habilitada en el plan actual del estudio. Consultá con quien administra el estudio.',
  /** T-7 */
  outsidePlanStatus: 'Fuera del plan',
  /** T-11 */
  pdfKeptHidden:
    'Este movimiento tiene un PDF guardado de cuando el estudio tenía el plan Premium. El cliente no lo ve ahora, pero podrá verlo y descargarlo si el estudio vuelve a ese plan.',
  /** T-14, el mismo texto que la api. */
  outsidePlanAccount: 'Esta cuenta está fuera del plan Básico. Habilitala para modificarla.',
  /** T-15 */
  pdfInHistory: 'Disponible en el plan Premium',
  /** T-16 */
  enableInPlan: 'Habilitar en el plan',
} as const;

/** Comienzo de T-9, el rechazo por espacio de la api, para reconocerlo (RF-28). */
export const PDF_SPACE_FULL_PREFIX = 'Se completó el espacio para PDF del estudio';

/** El valor de un cambio del PDF en el historial con el plan Básico (plan 011, D8). */
export const PDF_HIDDEN_BY_PLAN = 'plan-premium';

/** Nombre accesible de T-16 (spec 011, anexo A). */
export const enableInPlanLabel = (nombre: string, apellido: string) =>
  `Habilitar a ${nombre} ${apellido} en el plan Básico`;

/** El espacio usado en GB, con un decimal y redondeado hacia abajo (RF-30): "9,9 GB". */
export function formatUsedGb(bytes: number): string {
  const tenths = Math.floor((bytes * 10) / BYTES_PER_GB);
  return `${Math.floor(tenths / 10)},${tenths % 10} GB`;
}

/** El espacio total en GB enteros (RF-30): "10 GB". */
export function formatTotalGb(bytes: number): string {
  return `${Math.floor(bytes / BYTES_PER_GB)} GB`;
}

/** Si el espacio usado llegó al 90 % del total o más (RF-29). */
export function isNearPdfLimit(info: PlanInfo | null): boolean {
  if (!info?.espacioPdf) return false;
  const { usadoBytes, totalBytes } = info.espacioPdf;
  return usadoBytes >= totalBytes * NEAR_LIMIT_RATIO;
}

/** T-8: el aviso de espacio, con los valores del plan (RF-29, RF-30). */
export function nearLimitText(info: PlanInfo): string {
  const { usadoBytes, totalBytes } = info.espacioPdf ?? { usadoBytes: 0, totalBytes: 0 };
  return `El estudio está usando ${formatUsedGb(usadoBytes)} de los ${formatTotalGb(totalBytes)} para PDF. Cuando se complete, no se van a poder subir más. Si necesitás más espacio, contactá a Bourder Web.`;
}

/** T-10: el plan en el inicio y en la gestión de cuentas (RF-19, RF-31). */
export function planSummary(info: PlanInfo): string {
  if (info.plan === 'basico') {
    const { habilitados, maximo } = info.integrantes;
    return `Plan Básico · ${habilitados} de ${maximo} integrantes`;
  }
  const { usadoBytes, totalBytes } = info.espacioPdf;
  return `Plan Premium · PDF: ${formatUsedGb(usadoBytes)} de ${formatTotalGb(totalBytes)}`;
}

/** Si el formulario de alta ya no admite integrantes (RF-19). */
export function isStaffFull(info: PlanInfo | null): boolean {
  return info?.plan === 'basico' && info.integrantes.habilitados >= info.integrantes.maximo;
}

/** Si un mensaje de la api es T-9 (RF-28). */
export const isPdfSpaceError = (message: string) => message.startsWith(PDF_SPACE_FULL_PREFIX);

/**
 * El menú del panel con la etiqueta T-1 en la jurisprudencia, en su lugar, con el plan Básico
 * (RF-7). Sin plan todavía, o con el Premium, sin cambios.
 */
export function withPlanBadge(
  menu: readonly MenuOption[],
  plan: Plan | null,
): readonly MenuOption[] {
  if (plan !== 'basico') return menu;
  return menu.map((option) =>
    option.to === JURISPRUDENCIA_PATH
      ? { ...option, badge: PLAN_TEXTS.badge, ariaLabel: PLAN_TEXTS.menuLabel }
      : option,
  );
}

export function createPlanService(http: HttpClient) {
  return {
    getPlan: () => http.get<PlanInfo>('/panel/plan'),
  };
}

export type PlanService = ReturnType<typeof createPlanService>;

export const planService = createPlanService(httpClient);
