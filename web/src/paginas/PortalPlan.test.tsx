import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fakeSessionService,
  findPanelHome,
  findScreenHeading,
  renderApp,
  testUser,
} from '../pruebas/aplicacion-de-prueba';
import { basicPlan, fakePlanService, premiumPlan } from '../pruebas/plan-de-prueba';
import { PLAN_TEXTS } from '../servicios/plan';

const session = (rol: 'cliente' | 'abogado') =>
  fakeSessionService({ fetchOwnUser: vi.fn().mockResolvedValue(testUser(rol)) });

/** Spec 011, RF-13, RF-32 y RNF de persistencia. */
describe('el plan fuera del panel y en el navegador', () => {
  afterEach(() => vi.restoreAllMocks());

  it('el portal no pide el plan ni muestra ninguno de sus textos', async () => {
    const plan = fakePlanService(basicPlan(2));
    renderApp('/portal', session('cliente'), { plan });
    await findScreenHeading('Mis causas');

    expect(plan.getPlan).not.toHaveBeenCalled();
    const text = document.body.textContent ?? '';
    for (const texto of Object.values(PLAN_TEXTS)) expect(text).not.toContain(texto);
    expect(text).not.toMatch(/Plan (Básico|Premium)/);
  });

  it('el plan no se guarda en el navegador', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const plan = fakePlanService(premiumPlan(9.5));
    renderApp('/panel', session('abogado'), { plan });
    await findPanelHome();
    await waitFor(() => expect(plan.getPlan).toHaveBeenCalled());
    await screen.findByText(/Plan Premium/);

    expect(setItem).not.toHaveBeenCalled();
  });
});
