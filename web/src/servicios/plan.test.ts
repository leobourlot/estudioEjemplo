import { describe, expect, it, vi } from 'vitest';
import { createHttpClient } from './cliente-http';
import { PANEL_MENU } from './menu-aplicacion';
import {
  BYTES_PER_GB,
  createPlanService,
  formatTotalGb,
  formatUsedGb,
  isNearPdfLimit,
  isPdfSpaceError,
  isStaffFull,
  nearLimitText,
  type PlanInfo,
  planSummary,
  withPlanBadge,
} from './plan';

const GB = BYTES_PER_GB;
const premium = (usadoBytes: number, totalBytes = 10 * GB): PlanInfo => ({
  plan: 'premium',
  integrantes: null,
  espacioPdf: { usadoBytes, totalBytes },
});
const basico = (habilitados: number): PlanInfo => ({
  plan: 'basico',
  integrantes: { habilitados, maximo: 2 },
  espacioPdf: null,
});

describe('formato del espacio (spec 011, RF-30)', () => {
  it('el usado con un decimal, redondeado hacia abajo y con coma', () => {
    expect(formatUsedGb(0)).toBe('0,0 GB');
    expect(formatUsedGb(9.99 * GB)).toBe('9,9 GB');
    expect(formatUsedGb(9.3 * GB)).toBe('9,3 GB');
    expect(formatUsedGb(10 * GB)).toBe('10,0 GB');
    expect(formatUsedGb(10 * GB - 1)).toBe('9,9 GB');
  });

  it('el total en GB enteros', () => {
    expect(formatTotalGb(10 * GB)).toBe('10 GB');
    expect(formatTotalGb(20 * GB)).toBe('20 GB');
  });
});

describe('isNearPdfLimit (RF-29)', () => {
  it('avisa desde el 90 %', () => {
    expect(isNearPdfLimit(premium(8.99 * GB))).toBe(false);
    expect(isNearPdfLimit(premium(9 * GB))).toBe(true);
  });

  it('con 20 GB, desde los 18 GB', () => {
    expect(isNearPdfLimit(premium(17.9 * GB, 20 * GB))).toBe(false);
    expect(isNearPdfLimit(premium(18 * GB, 20 * GB))).toBe(true);
  });

  it('con el plan Básico o sin plan, nunca', () => {
    expect(isNearPdfLimit(basico(2))).toBe(false);
    expect(isNearPdfLimit(null)).toBe(false);
  });

  it('T-8 con los valores del plan', () => {
    expect(nearLimitText(premium(9.3 * GB))).toBe(
      'El estudio está usando 9,3 GB de los 10 GB para PDF. Cuando se complete, no se van a poder subir más. Si necesitás más espacio, contactá a Bourder Web.',
    );
  });
});

describe('planSummary, T-10 (RF-19, RF-31)', () => {
  it('en cada plan', () => {
    expect(planSummary(basico(2))).toBe('Plan Básico · 2 de 2 integrantes');
    expect(planSummary(premium(9.3 * GB))).toBe('Plan Premium · PDF: 9,3 GB de 10 GB');
  });
});

describe('isStaffFull y isPdfSpaceError', () => {
  it('el alta de integrantes se cierra con 2 habilitados en el plan Básico', () => {
    expect(isStaffFull(basico(2))).toBe(true);
    expect(isStaffFull(basico(1))).toBe(false);
    expect(isStaffFull(premium(0))).toBe(false);
    expect(isStaffFull(null)).toBe(false);
  });

  it('reconoce T-9', () => {
    expect(
      isPdfSpaceError(
        'Se completó el espacio para PDF del estudio (10 GB). Quitá algún PDF que no necesites o pedí más espacio a Bourder Web.',
      ),
    ).toBe(true);
    expect(isPdfSpaceError('El archivo debe ser un PDF')).toBe(false);
  });
});

describe('withPlanBadge (RF-7)', () => {
  it('con el plan Básico, la jurisprudencia lleva la etiqueta y su nombre accesible, en su lugar', () => {
    const menu = withPlanBadge(PANEL_MENU, 'basico');
    const index = PANEL_MENU.findIndex((option) => option.to === '/panel/jurisprudencia');

    expect(menu[index]).toMatchObject({
      label: 'Jurisprudencia',
      badge: 'Premium',
      ariaLabel: 'Jurisprudencia, plan Premium',
    });
    expect(menu.filter((option) => option.badge)).toHaveLength(1);
    expect(menu.map((option) => option.to)).toEqual(PANEL_MENU.map((option) => option.to));
  });

  it('con el plan Premium o sin plan todavía, sin cambios', () => {
    expect(withPlanBadge(PANEL_MENU, 'premium')).toBe(PANEL_MENU);
    expect(withPlanBadge(PANEL_MENU, null)).toBe(PANEL_MENU);
  });
});

describe('getPlan', () => {
  it('pide GET /api/panel/plan', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(basico(1)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const service = createPlanService(
      createHttpClient({ baseUrl: 'https://api.estudio.com', fetch: fetchMock }),
    );

    expect(await service.getPlan()).toEqual(basico(1));
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.estudio.com/api/panel/plan');
  });
});
