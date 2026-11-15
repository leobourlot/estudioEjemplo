import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  fakeSessionService,
  fakeUsersService,
  renderApp,
  testAccount,
  testUser,
} from '../pruebas/aplicacion-de-prueba';
import { basicPlan, fakePlanService, premiumPlan } from '../pruebas/plan-de-prueba';
import { ApiError } from '../servicios/cliente-http';
import { type PlanInfo, PLAN_TEXTS } from '../servicios/plan';
import type { UsersService } from '../servicios/usuarios';

const adminSession = () =>
  fakeSessionService({
    fetchOwnUser: vi.fn().mockResolvedValue(testUser('admin', { id: 1, esPrincipal: true })),
  });

const outside = testAccount({
  id: 5,
  rol: 'abogado',
  nombre: 'Bruno',
  apellido: 'Díaz',
  fueraDelPlan: true,
});

function open(path: string, info: PlanInfo, users: UsersService = fakeUsersService()) {
  renderApp(path, adminSession(), { users, plan: fakePlanService(info) });
  return users;
}

/** Spec 011, RF-19, RF-22 y RF-23: las pantallas de cuentas con el plan. */
describe('cuentas según el plan', () => {
  describe('lista', () => {
    it('con el plan Básico, T-10, el estado T-7 y la opción "Fuera del plan" del filtro', async () => {
      const users = fakeUsersService({
        listUsers: vi
          .fn()
          .mockResolvedValue({ items: [outside], total: 1, pagina: 1, porPagina: 20 }),
      });
      open('/panel/usuarios', basicPlan(2), users);

      expect(await screen.findByText('Plan Básico · 2 de 2 integrantes')).toBeTruthy();
      const row = await screen.findByRole('row', { name: /Díaz/ });
      expect(within(row).getByText('Fuera del plan')).toBeTruthy();

      await userEvent.selectOptions(screen.getByLabelText('Estado'), 'Fuera del plan');
      await waitFor(() =>
        expect(users.listUsers).toHaveBeenLastCalledWith(
          expect.objectContaining({ fueraDelPlan: true, activo: undefined }),
        ),
      );
    });

    it('con el plan Premium, sin T-10 ni la opción del filtro', async () => {
      open('/panel/usuarios', premiumPlan());

      await screen.findByRole('heading', { name: 'Cuentas' });
      await waitFor(() => expect(screen.queryByText(/Plan Premium/)).toBeNull());
      const options = within(screen.getByLabelText('Estado'))
        .getAllByRole('option')
        .map((option) => option.textContent);
      expect(options).not.toContain('Fuera del plan');
    });
  });

  describe('consulta', () => {
    it('una cuenta fuera del plan muestra T-7, no se edita y se habilita con T-16', async () => {
      const users = fakeUsersService({
        getUser: vi
          .fn()
          .mockResolvedValueOnce(outside)
          .mockResolvedValue({ ...outside, fueraDelPlan: false }),
      });
      open('/panel/usuarios/5', basicPlan(1), users);

      expect(await screen.findByText('Fuera del plan')).toBeTruthy();
      expect(screen.queryByRole('form', { name: 'Editar datos' })).toBeNull();
      expect(screen.getByText(PLAN_TEXTS.outsidePlanAccount)).toBeTruthy();
      const acciones = within(screen.getByRole('region', { name: 'Acciones' }));
      expect(acciones.getAllByRole('button').map((b) => b.textContent)).toEqual([
        'Desactivar cuenta',
        'Habilitar en el plan',
      ]);

      await userEvent.click(
        acciones.getByRole('button', { name: 'Habilitar a Bruno Díaz en el plan Básico' }),
      );
      await userEvent.click(
        await acciones.findByRole('button', { name: /Confirmar|Habilitar en el plan/ }),
      );

      await waitFor(() => expect(users.enableInPlan).toHaveBeenCalledWith(5));
    });

    it('un 409 T-5 al habilitar se muestra como error', async () => {
      const users = fakeUsersService({
        getUser: vi.fn().mockResolvedValue(outside),
        enableInPlan: vi.fn().mockRejectedValue(new ApiError(409, [PLAN_TEXTS.staffLimit])),
      });
      open('/panel/usuarios/5', basicPlan(2), users);
      const acciones = within(await screen.findByRole('region', { name: 'Acciones' }));

      await userEvent.click(
        acciones.getByRole('button', { name: 'Habilitar a Bruno Díaz en el plan Básico' }),
      );
      await userEvent.click(
        await acciones.findByRole('button', { name: /Confirmar|Habilitar en el plan/ }),
      );

      expect(await screen.findByText(PLAN_TEXTS.staffLimit)).toBeTruthy();
    });
  });

  describe('nueva cuenta', () => {
    it('con 2 habilitados, los roles de integrante no están disponibles, con el motivo', async () => {
      const users = open('/panel/usuarios/nuevo', basicPlan(2));

      const rol = (await screen.findByLabelText('Rol')) as HTMLSelectElement;
      await waitFor(() => expect(rol.getAttribute('aria-describedby')).toBe('rol-plan'));
      expect(document.getElementById('rol-plan')!.textContent).toBe(PLAN_TEXTS.staffLimit);
      const options = within(rol).getAllByRole('option') as HTMLOptionElement[];
      const disabled = options.filter((option) => option.disabled).map((o) => o.value);
      expect(disabled.sort()).toEqual(['abogado', 'admin']);
      expect(rol.value).toBe('cliente');
      expect(users).toBeTruthy();
    });

    it('con 1 habilitado o con el plan Premium, todos los roles', async () => {
      open('/panel/usuarios/nuevo', basicPlan(1));

      const rol = (await screen.findByLabelText('Rol')) as HTMLSelectElement;
      await waitFor(() => expect(screen.queryByText(PLAN_TEXTS.staffLimit)).toBeNull());
      expect(
        (within(rol).getAllByRole('option') as HTMLOptionElement[]).some((o) => o.disabled),
      ).toBe(false);
    });
  });
});
