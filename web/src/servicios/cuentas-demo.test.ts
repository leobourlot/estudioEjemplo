import { describe, expect, it } from 'vitest';
import apiAccounts from '../../../api/src/demo/cuentas-demo.ts?raw';
import sampleSql from '../../../api/datos-de-muestra/datos-de-muestra.sql?raw';
import specText from '../../../docs/specs/009-demo-y-marca-configurable/spec.md?raw';
import { CONTRASENA_DEMO, CUENTAS_DEMO, TEXTOS_CUENTAS_DEMO } from './cuentas-demo';

/**
 * Spec 009, RF-16 y RF-18: el recuadro del ingreso muestra exactamente las tres cuentas que
 * protege la api, con los datos con los que se cargan en los datos de muestra, y los textos del
 * anexo B.
 */

const spec = specText.replace(/\r\n/g, '\n');
const annexB = spec.slice(spec.indexOf('## Anexo B'));
const sql = sampleSql.replace(/\r\n/g, '\n');

/** Los textos entre comillas de un renglón del anexo B que empieza con `prefix`. */
function quoted(prefix: string): string[] {
  const line = annexB.split('\n').find((l) => l.trimStart().startsWith(prefix));
  if (!line) throw new Error(`No está "${prefix}" en el anexo B`);
  return Array.from(line.matchAll(/"([^"]+)"/g), (m) => m[1]);
}

/** Las filas que cargan usuarios en el SQL de los datos de muestra. */
const usersRows = sql.split('\n').filter((line) => line.startsWith('INSERT INTO `usuarios`'));

describe('textos del recuadro contra el anexo B (spec 009, RF-16)', () => {
  it('título, texto, etiquetas y botón', () => {
    expect([TEXTOS_CUENTAS_DEMO.titulo]).toEqual(quoted('- Título:'));
    expect([TEXTOS_CUENTAS_DEMO.texto]).toEqual(quoted('- Texto:'));
    expect([TEXTOS_CUENTAS_DEMO.dni, TEXTOS_CUENTAS_DEMO.contrasena]).toEqual(
      quoted('- Etiquetas:'),
    );
    expect([TEXTOS_CUENTAS_DEMO.usar, ...CUENTAS_DEMO.map((c) => c.etiqueta)]).toEqual(
      quoted('- Botón:'),
    );
  });

  it('las tres cuentas, en orden, con su rol, su nombre y su DNI', () => {
    const lines = annexB.split('\n').filter((l) => /^ {2}- "/.test(l));

    expect(lines.map((l) => /^ {2}- "([^"]+)": (.+), DNI (\d+)\.$/.exec(l)!.slice(1))).toEqual(
      CUENTAS_DEMO.map((c) => [c.rol, c.nombre, c.dni]),
    );
    expect(annexB).toContain(`todas con la contraseña ${CONTRASENA_DEMO}:`);
  });
});

describe('las cuentas son las de los datos de muestra y las que protege la api (spec 009, RF-18)', () => {
  it('la api protege exactamente los mismos tres DNI', () => {
    const dnis = Array.from(apiAccounts.matchAll(/'(\d{7,11})'/g), (m) => m[1]);

    expect(dnis).toEqual(CUENTAS_DEMO.map((c) => c.dni));
  });

  it('cada cuenta está en el SQL con su rol, su nombre, su apellido y su DNI', () => {
    const ROLES: Record<string, string> = {
      Administradora: 'admin',
      Abogado: 'abogado',
      Cliente: 'cliente',
    };
    for (const cuenta of CUENTAS_DEMO) {
      const words = cuenta.nombre.split(' ');
      // El nombre y el apellido van en dos columnas: alguna partición del nombre completo coincide.
      const splits = words
        .slice(1)
        .map((_w, i) => [words.slice(0, i + 1).join(' '), words.slice(i + 1).join(' ')]);
      const userRow = usersRows.find(
        (row) =>
          row.includes(`VALUES ('${ROLES[cuenta.rol]}'`) &&
          splits.some(([nombre, apellido]) => row.includes(`'${nombre}', '${apellido}'`)),
      );

      expect(userRow, cuenta.nombre).toBeDefined();
      expect(sql).toContain(`'${cuenta.dni}'`);
    }
  });

  it('la contraseña es la que indica el encabezado del SQL', () => {
    expect(sql).toContain(`la contraseña\n-- ${CONTRASENA_DEMO}`);
  });
});
