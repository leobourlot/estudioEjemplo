import { describe, expect, it, vi } from 'vitest';
import { basicPlan, premiumPlan } from '../pruebas/plan-de-prueba';
import { testAccount, testUser } from '../pruebas/aplicacion-de-prueba';
import { actionAccessibleName, availableActions } from './acciones-cuenta';
import { createHttpClient } from './cliente-http';
import { unavailableRoles } from './formulario-cuenta';
import { createUsersService } from './usuarios';

const admin = testUser('admin', { id: 1, esPrincipal: true });
const outside = testAccount({
  id: 5,
  rol: 'abogado',
  nombre: 'Bruno',
  apellido: 'Díaz',
  fueraDelPlan: true,
});

/** Spec 011, RF-19, RF-22 y RF-23: los servicios de cuentas con el plan. */
describe('cuentas según el plan', () => {
  it('una cuenta fuera del plan solo se desactiva o se habilita', () => {
    expect(availableActions(admin, outside)).toEqual(['deactivate', 'enableInPlan']);
    expect(availableActions(admin, { ...outside, fueraDelPlan: false })).toEqual([
      'deactivate',
      'resetPassword',
    ]);
  });

  it('T-16 lleva el nombre de la persona como nombre accesible', () => {
    expect(actionAccessibleName('enableInPlan', outside)).toBe(
      'Habilitar a Bruno Díaz en el plan Básico',
    );
    expect(actionAccessibleName('deactivate', outside)).toBe('Desactivar cuenta');
  });

  it('con el plan Básico y 2 habilitados, los roles de integrante no están disponibles', () => {
    expect(unavailableRoles(basicPlan(2))).toEqual(['admin', 'abogado']);
    expect(unavailableRoles(basicPlan(1))).toEqual([]);
    expect(unavailableRoles(premiumPlan())).toEqual([]);
    expect(unavailableRoles(null)).toEqual([]);
  });

  it('enableInPlan y el filtro fueraDelPlan usan las rutas de la api', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response(null, { status: 204 }));
    const users = createUsersService(
      createHttpClient({ baseUrl: 'https://api.estudio.com', fetch: fetchMock }),
    );

    await users.enableInPlan(5);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [], total: 0, pagina: 1, porPagina: 20 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await users.listUsers({ fueraDelPlan: true });

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.estudio.com/api/panel/usuarios/5/habilitar',
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api.estudio.com/api/panel/usuarios?fueraDelPlan=true',
    );
  });
});
