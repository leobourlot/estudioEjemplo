import { readFileSync } from 'node:fs';
import bcrypt from 'bcrypt';
import { describe, expect, it } from 'vitest';
import { CONTRASENA_DATOS_DE_MUESTRA, DNIS_CUENTAS_DEMO } from './cuentas-demo.js';

/**
 * Spec 009, RF-18: las cuentas que protege la api están en los datos de muestra, activas, sin
 * cambio de contraseña pendiente, y entran con la contraseña de los datos de muestra.
 */

// Vitest corre los tests de la api desde api/.
const lines = readFileSync('datos-de-muestra/datos-de-muestra.sql', 'utf8')
  .replace(/\r\n/g, '\n')
  .split('\n');

/** Rol, debeCambiarContrasena y activo de la fila de usuarios de un documento. */
function userRow(dni: string): { rol: string; debeCambiar: string; activo: string } {
  // Integrante: el DNI va en su fila de usuarios.
  const staff = lines.find(
    (line) => line.startsWith('INSERT INTO `usuarios`') && line.includes(`'${dni}'`),
  );
  // Cliente: el DNI va en la fila de clientes, que apunta a la variable del usuario.
  const clientLine = lines.find(
    (line) => line.startsWith('INSERT INTO `clientes`') && line.includes(`'${dni}'`),
  );
  let row = staff;
  if (!row && clientLine) {
    const variable = /VALUES \((@\w+),/.exec(clientLine)![1];
    const set = lines.indexOf(`SET ${variable} = LAST_INSERT_ID();`);
    row = lines[set - 1];
  }
  if (!row) throw new Error(`El DNI ${dni} no está en los datos de muestra`);
  const values = /VALUES \('(\w+)',.*?@hash, (\d), (\d),/.exec(row);
  if (!values) throw new Error(`No se entiende la fila del DNI ${dni}`);
  return { rol: values[1], debeCambiar: values[2], activo: values[3] };
}

describe('cuentas de prueba en los datos de muestra (spec 009, RF-18)', () => {
  it('son la administradora, el abogado y la cliente, activos y sin cambio pendiente', () => {
    expect(DNIS_CUENTAS_DEMO.map((dni) => userRow(dni))).toEqual([
      { rol: 'admin', debeCambiar: '0', activo: '1' },
      { rol: 'abogado', debeCambiar: '0', activo: '1' },
      { rol: 'cliente', debeCambiar: '0', activo: '1' },
    ]);
  });

  it('el hash de los datos de muestra corresponde a su contraseña', async () => {
    const hashLine = lines.find((line) => line.startsWith('SET @hash = '))!;
    const hash = /'([^']+)'/.exec(hashLine)![1];

    expect(await bcrypt.compare(CONTRASENA_DATOS_DE_MUESTRA, hash)).toBe(true);
    expect(await bcrypt.compare('otra contraseña', hash)).toBe(false);
  });
});
