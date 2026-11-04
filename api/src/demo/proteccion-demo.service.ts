import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../configuracion/validar-entorno.js';
import { DNIS_CUENTAS_DEMO } from './cuentas-demo.js';

/** El mensaje del rechazo (spec 009, anexo B). */
export const DEMO_ACCOUNT_MESSAGE = 'Esta cuenta es de la demo y no se puede modificar.';

/** Lo que hace falta de una cuenta para saber si es de prueba: sus documentos. */
export interface CuentaConDocumento {
  dni: string | null;
  cliente?: { dni: string | null; cuit: string | null } | null;
}

/**
 * Si la cuenta es una de las tres de prueba (spec 009, RF-19), por su documento: el DNI de un
 * integrante o el DNI o CUIT de un cliente. Regla pura, para los tests.
 */
export function isDemoAccount(cuenta: CuentaConDocumento): boolean {
  const documents = [cuenta.dni, cuenta.cliente?.dni, cuenta.cliente?.cuit];
  return documents.some((document) => document != null && DNIS_CUENTAS_DEMO.includes(document));
}

/**
 * Protección de las cuentas de prueba (spec 009, RF-19): con el modo demo encendido, nadie puede
 * cambiar su contraseña, restablecerla, desactivarlas ni modificar sus datos. La aplica el
 * servidor, para cualquier pedido. Con el modo apagado no hace nada (RF-15).
 */
@Injectable()
export class DemoProtectionService {
  private readonly enabled: boolean;

  constructor(config: ConfigService<Environment, true>) {
    this.enabled = config.get('MODO_DEMO', { infer: true });
  }

  assertModifiable(cuenta: CuentaConDocumento): void {
    if (this.enabled && isDemoAccount(cuenta)) {
      throw new ForbiddenException(DEMO_ACCOUNT_MESSAGE);
    }
  }
}
