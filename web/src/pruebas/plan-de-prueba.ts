import { vi } from 'vitest';
import { BYTES_PER_GB, type PlanInfo, type PlanService } from '../servicios/plan';

/** Plan Básico de prueba, con los integrantes habilitados indicados. */
export const basicPlan = (habilitados = 1): PlanInfo => ({
  plan: 'basico',
  integrantes: { habilitados, maximo: 2 },
  espacioPdf: null,
});

/** Plan Premium de prueba, con el espacio usado en GB sobre 10 GB. */
export const premiumPlan = (usadoGb = 0, totalGb = 10): PlanInfo => ({
  plan: 'premium',
  integrantes: null,
  espacioPdf: { usadoBytes: usadoGb * BYTES_PER_GB, totalBytes: totalGb * BYTES_PER_GB },
});

/** Servicio del plan simulado (spec 011). */
export function fakePlanService(info: PlanInfo = premiumPlan()) {
  return { getPlan: vi.fn().mockResolvedValue(info) } as PlanService & {
    getPlan: ReturnType<typeof vi.fn>;
  };
}
