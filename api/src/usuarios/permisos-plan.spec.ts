import { describe, expect, it } from 'vitest';
import { PLAN_MESSAGES } from '../plan/reglas-plan.js';
import {
  type AccountAction,
  type Actor,
  checkAccountAction,
  MANAGEMENT_MESSAGES,
  type Target,
} from './permisos-gestion.js';

const principal: Actor = { id: 1, rol: 'admin', esPrincipal: true };
const admin: Actor = { id: 2, rol: 'admin', esPrincipal: false };
const lawyer: Actor = { id: 3, rol: 'abogado', esPrincipal: false };
const outsideAdmin: Target = {
  id: 4,
  rol: 'admin',
  esPrincipal: false,
  activo: true,
  fueraDelPlan: true,
};
const outsideLawyer: Target = { ...outsideAdmin, id: 5, rol: 'abogado' };
const client: Target = { id: 6, rol: 'cliente', esPrincipal: false, activo: true };

const T14 = { status: 409, message: PLAN_MESSAGES.outsidePlanAccount };

/** Spec 011, RF-23: sobre una cuenta fuera del plan solo se consulta, se desactiva o se habilita. */
describe('checkAccountAction — cuentas fuera del plan', () => {
  it.each<AccountAction>(['view', 'deactivate', 'enableInPlan'])(
    'un administrador puede %s',
    (action) => {
      expect(checkAccountAction(admin, outsideLawyer, action)).toBeNull();
    },
  );

  it.each<AccountAction>(['update', 'reactivate', 'resetPassword', 'releaseEmail'])(
    '%s responde 409 T-14',
    (action) => {
      expect(checkAccountAction(admin, outsideLawyer, action)).toEqual(T14);
    },
  );

  it('cambiar el rol responde 409 T-14', () => {
    expect(checkAccountAction(admin, outsideLawyer, 'update', { rol: 'admin' })).toEqual(T14);
  });

  it('el principal no puede transferirle su condición: 409 T-14', () => {
    expect(checkAccountAction(principal, outsideAdmin, 'transferPrincipal')).toEqual(T14);
  });

  it('un abogado no puede habilitar ni operar sobre integrantes: 403', () => {
    expect(checkAccountAction(lawyer, outsideLawyer, 'enableInPlan')).toEqual({
      status: 403,
      message: MANAGEMENT_MESSAGES.forbidden,
    });
    expect(checkAccountAction(lawyer, client, 'enableInPlan')).toEqual({
      status: 403,
      message: MANAGEMENT_MESSAGES.forbidden,
    });
  });

  it('sin la marca, las acciones siguen como en la spec 001', () => {
    const enabledLawyer: Target = { ...outsideLawyer, fueraDelPlan: false };
    expect(checkAccountAction(admin, enabledLawyer, 'update')).toBeNull();
    expect(checkAccountAction(admin, enabledLawyer, 'resetPassword')).toBeNull();
  });
});
