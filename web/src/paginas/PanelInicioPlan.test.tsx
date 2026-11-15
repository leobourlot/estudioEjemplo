import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  fakeSessionService,
  findPanelHome,
  renderApp,
  testUser,
} from '../pruebas/aplicacion-de-prueba';
import { basicPlan, fakePlanService, premiumPlan } from '../pruebas/plan-de-prueba';
import type { PlanInfo } from '../servicios/plan';
import type { Rol } from '../servicios/sesion';

async function openHome(rol: Rol, info: PlanInfo) {
  const plan = fakePlanService(info);
  renderApp(
    '/panel',
    fakeSessionService({ fetchOwnUser: vi.fn().mockResolvedValue(testUser(rol)) }),
    { plan },
  );
  await findPanelHome();
  return plan;
}

const main = () => within(screen.getByRole('main'));

/** Spec 011, RF-7, RF-29 y RF-31: el plan en el inicio del panel. */
describe('el plan en el inicio del panel', () => {
  it.each(['admin', 'abogado'] as const)('con el plan Básico, %s ve T-10', async (rol) => {
    await openHome(rol, basicPlan(2));

    expect(await main().findByText('Plan Básico · 2 de 2 integrantes')).toBeTruthy();
  });

  it.each(['admin', 'abogado'] as const)(
    'con el plan Premium, %s ve el espacio usado',
    async (rol) => {
      await openHome(rol, premiumPlan(3));

      expect(await main().findByText('Plan Premium · PDF: 3,0 GB de 10 GB')).toBeTruthy();
      expect(main().queryByRole('status')).toBeNull();
    },
  );

  it('desde el 90 % del espacio, el aviso T-8 con el contacto, como texto informativo', async () => {
    await openHome('abogado', premiumPlan(9.3));

    const aviso = await main().findByRole('status');
    expect(aviso.textContent).toContain('El estudio está usando 9,3 GB de los 10 GB para PDF.');
    expect(
      within(aviso).getByRole('link', { name: 'Escribir a Bourder Web por WhatsApp' }),
    ).toBeTruthy();
  });

  it('con el plan Básico, el acceso a la jurisprudencia lleva la etiqueta', async () => {
    await openHome('abogado', basicPlan());

    const card = await main().findByRole('link', { name: 'Jurisprudencia, plan Premium' });
    expect(card.textContent).toContain('Premium');
  });

  it('al entrar, vuelve a pedir el plan', async () => {
    const plan = await openHome('abogado', premiumPlan());

    await waitFor(() => expect(plan.getPlan.mock.calls.length).toBeGreaterThanOrEqual(2));
  });
});
