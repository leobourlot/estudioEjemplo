import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fakeSessionService, findPanelHome, testUser } from '../pruebas/aplicacion-de-prueba';
import { fakeJurisprudenciaService, renderRulingsApp } from '../pruebas/jurisprudencia-de-prueba';
import { basicPlan, fakePlanService, premiumPlan } from '../pruebas/plan-de-prueba';
import { PLAN_TEXTS } from '../servicios/plan';

const lawyer = () =>
  fakeSessionService({ fetchOwnUser: vi.fn().mockResolvedValue(testUser('abogado')) });

/** Spec 011, RF-7: las direcciones de la jurisprudencia con el plan Básico. */
describe('RutaPremium', () => {
  it.each([
    '/panel/jurisprudencia',
    '/panel/jurisprudencia/nuevo',
    '/panel/jurisprudencia/7',
    '/panel/jurisprudencia/999999',
  ])('con el plan Básico, %s muestra T-2 sin pedir nada a la api', async (path) => {
    const jurisprudencia = fakeJurisprudenciaService();
    renderRulingsApp(path, lawyer(), jurisprudencia, fakePlanService(basicPlan()));

    const heading = await screen.findByRole('heading', { name: 'Jurisprudencia', level: 1 });
    const aviso = within(heading.parentElement!).getByRole('status');
    expect(aviso.textContent).toContain(PLAN_TEXTS.jurisprudenciaText);
    expect(
      within(aviso).getByRole('link', { name: 'Escribir a Bourder Web por WhatsApp' }),
    ).toBeTruthy();
    for (const call of Object.values(jurisprudencia)) {
      expect(call).not.toHaveBeenCalled();
    }
  });

  it('con el plan Básico, un id que no es un entero positivo lleva al inicio del panel', async () => {
    renderRulingsApp(
      '/panel/jurisprudencia/abc',
      lawyer(),
      undefined,
      fakePlanService(basicPlan()),
    );

    await findPanelHome();
  });

  it('una dirección que no es una pantalla de la jurisprudencia es una dirección inexistente', async () => {
    renderRulingsApp(
      '/panel/jurisprudencia/7/otra',
      lawyer(),
      undefined,
      fakePlanService(basicPlan()),
    );

    await findPanelHome();
  });

  it('con el plan Premium, la página de siempre', async () => {
    const jurisprudencia = fakeJurisprudenciaService();
    renderRulingsApp(
      '/panel/jurisprudencia',
      lawyer(),
      jurisprudencia,
      fakePlanService(premiumPlan()),
    );

    await screen.findByRole('heading', { name: 'Jurisprudencia', level: 1 });
    expect(jurisprudencia.listRulings).toHaveBeenCalled();
    expect(screen.queryByText(PLAN_TEXTS.jurisprudenciaText)).toBeNull();
  });
});
