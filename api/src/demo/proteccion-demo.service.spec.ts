import { ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import type { Environment } from '../configuracion/validar-entorno.js';
import { DNIS_CUENTAS_DEMO } from './cuentas-demo.js';
import {
  DEMO_ACCOUNT_MESSAGE,
  DemoProtectionService,
  isDemoAccount,
} from './proteccion-demo.service.js';

function service(modoDemo: boolean): DemoProtectionService {
  const config = { get: () => modoDemo } as unknown as ConfigService<Environment, true>;
  return new DemoProtectionService(config);
}

const [adminDni, , clientDni] = DNIS_CUENTAS_DEMO;
const demoMember = { dni: adminDni, cliente: null };
const demoClient = { dni: null, cliente: { dni: clientDni, cuit: null } };
const otherMember = { dni: '20111222', cliente: null };
const otherClient = { dni: null, cliente: { dni: null, cuit: '30712345604' } };

describe('isDemoAccount (spec 009, RF-19)', () => {
  it('reconoce a un integrante y a un cliente de prueba por su documento', () => {
    expect(isDemoAccount(demoMember)).toBe(true);
    expect(isDemoAccount(demoClient)).toBe(true);
  });

  it('no reconoce otras cuentas', () => {
    expect(isDemoAccount(otherMember)).toBe(false);
    expect(isDemoAccount(otherClient)).toBe(false);
    expect(isDemoAccount({ dni: null, cliente: null })).toBe(false);
  });

  it('protege las tres cuentas de prueba', () => {
    expect(DNIS_CUENTAS_DEMO).toHaveLength(3);
    for (const dni of DNIS_CUENTAS_DEMO) {
      expect(
        isDemoAccount({ dni, cliente: null }) ||
          isDemoAccount({ dni: null, cliente: { dni, cuit: null } }),
      ).toBe(true);
    }
  });
});

describe('DemoProtectionService (spec 009, RF-15 y RF-19)', () => {
  it('con el modo demo apagado no rechaza nada, tampoco las cuentas de prueba', () => {
    expect(() => service(false).assertModifiable(demoMember)).not.toThrow();
    expect(() => service(false).assertModifiable(demoClient)).not.toThrow();
  });

  it('con el modo demo encendido rechaza un integrante y un cliente de prueba, con 403 y su mensaje', () => {
    for (const cuenta of [demoMember, demoClient]) {
      let error: unknown;
      try {
        service(true).assertModifiable(cuenta);
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getStatus()).toBe(403);
      expect((error as ForbiddenException).message).toBe(DEMO_ACCOUNT_MESSAGE);
    }
    expect(DEMO_ACCOUNT_MESSAGE).toBe('Esta cuenta es de la demo y no se puede modificar.');
  });

  it('con el modo demo encendido deja modificar las demás cuentas', () => {
    expect(() => service(true).assertModifiable(otherMember)).not.toThrow();
    expect(() => service(true).assertModifiable(otherClient)).not.toThrow();
  });
});
