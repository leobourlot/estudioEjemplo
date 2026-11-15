import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  fakeSessionService,
  findPanelHome,
  findScreenHeading,
  renderApp,
  testUser,
} from '../pruebas/aplicacion-de-prueba';
import { basicPlan, fakePlanService, premiumPlan } from '../pruebas/plan-de-prueba';
import type { PlanService } from '../servicios/plan';
import type { Rol } from '../servicios/sesion';

const sessionAs = (rol: Rol) =>
  fakeSessionService({ fetchOwnUser: vi.fn().mockResolvedValue(testUser(rol)) });

const panelNav = () => within(screen.getByRole('navigation', { name: 'Panel' }));

/** Spec 011, RF-7, RF-32 y RNF de accesibilidad: el plan en el menú del panel. */
describe('el plan en el menú', () => {
  it('con el plan Básico, Jurisprudencia sigue en su lugar con la etiqueta y su nombre accesible', async () => {
    renderApp('/panel', sessionAs('abogado'), { plan: fakePlanService(basicPlan()) });
    await findPanelHome();

    const link = await panelNav().findByRole('link', { name: 'Jurisprudencia, plan Premium' });
    expect(link.textContent).toContain('Premium');
    const labels = panelNav()
      .getAllByRole('link')
      .map((option) => option.getAttribute('href'));
    expect(labels.indexOf('/panel/jurisprudencia')).toBe(2);
  });

  it('con el plan Premium, sin la etiqueta', async () => {
    renderApp('/panel', sessionAs('admin'), { plan: fakePlanService(premiumPlan()) });
    await findPanelHome();

    await waitFor(() =>
      expect(panelNav().getByRole('link', { name: 'Jurisprudencia' })).toBeTruthy(),
    );
    expect(panelNav().queryByText('Premium')).toBeNull();
  });

  it('mientras el plan no llegó, el menú se ve sin la etiqueta', async () => {
    const plan = { getPlan: vi.fn(() => new Promise(() => undefined)) } as unknown as PlanService;
    renderApp('/panel', sessionAs('abogado'), { plan });
    await findPanelHome();

    expect(panelNav().getByRole('link', { name: 'Jurisprudencia' })).toBeTruthy();
  });

  it('si el pedido falla, lo vuelve a pedir al navegar', async () => {
    const plan = {
      getPlan: vi.fn().mockRejectedValueOnce(new Error('red')).mockResolvedValue(basicPlan()),
    } as unknown as PlanService & { getPlan: ReturnType<typeof vi.fn> };
    // Desde Mi cuenta: el inicio del panel vuelve a pedir el plan por su cuenta.
    renderApp('/panel/mi-cuenta', sessionAs('abogado'), { plan });
    await findScreenHeading('Mi cuenta');
    await waitFor(() => expect(plan.getPlan).toHaveBeenCalledTimes(1));
    expect(panelNav().getByRole('link', { name: 'Jurisprudencia' })).toBeTruthy();

    await userEvent.click(panelNav().getByRole('link', { name: 'Cuentas' }));

    await panelNav().findByRole('link', { name: 'Jurisprudencia, plan Premium' });
    expect(plan.getPlan).toHaveBeenCalledTimes(2);
  });

  it('el portal nunca pide el plan (RF-32)', async () => {
    const plan = fakePlanService(basicPlan());
    renderApp('/portal', sessionAs('cliente'), { plan });
    await findScreenHeading('Mis causas');

    expect(plan.getPlan).not.toHaveBeenCalled();
    expect(screen.queryByText('Premium')).toBeNull();
  });
});
