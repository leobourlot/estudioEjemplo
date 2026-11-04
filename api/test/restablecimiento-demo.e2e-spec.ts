import { readFileSync } from 'node:fs';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource, type QueryRunner } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildDataSourceOptions } from '../src/base-de-datos/opciones-base-de-datos.js';
import { CONTRASENA_DATOS_DE_MUESTRA, DNIS_CUENTAS_DEMO } from '../src/demo/cuentas-demo.js';
import { CONTROL_TABLES } from '../src/demo/fechas-demo.js';
import { resetSampleData } from '../src/demo/restablecimiento-demo.js';
import { prepareSampleScript } from '../src/demo/script-datos-de-muestra.js';
import { createTestApp } from './utilidades/aplicacion-de-tests.js';
import { loadTestEnvironment } from './utilidades/base-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { loginAs, nextTestIp } from './utilidades/sesion-de-prueba.js';

/**
 * Spec 009, RF-20, RF-22 y RF-23: el restablecimiento de los datos de muestra, sobre la base de
 * tests. Llama a resetSampleData directamente: la base de tests nunca se marca como la de la demo
 * y el comando se negaría a tocarla (RF-21, restablecimiento-demo.spec.ts).
 */

const DAYS = 10;
const sql = readFileSync('datos-de-muestra/datos-de-muestra.sql', 'utf8').replace(/\r\n/g, '\n');
const lines = sql.split('\n');

/** Cuántas filas carga el SQL en cada tabla: cada INSERT carga una. */
function expectedCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const line of lines) {
    const table = /^INSERT INTO `(\w+)`/.exec(line)?.[1];
    if (table) counts[table] = (counts[table] ?? 0) + 1;
  }
  return counts;
}

/** Las fechas de los fallos (sin hora) del SQL, ordenadas. */
function sampleRulingDates(): string[] {
  return lines
    .filter((line) => line.startsWith('INSERT INTO `fallos`'))
    .flatMap((line) => Array.from(line.matchAll(/'(\d{4}-\d{2}-\d{2})'/g), (m) => m[1]))
    .sort();
}

const shift = (fecha: string, days: number) => {
  const date = new Date(`${fecha}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

describe('restablecimiento de los datos de muestra (spec 009, RF-20, RF-22 y RF-23)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const tables = async (): Promise<string[]> => {
    const rows: { name: string }[] = await queryRunner.query(
      `SELECT TABLE_NAME AS name FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`,
    );
    return rows.map((row) => row.name).filter((name) => !CONTROL_TABLES.includes(name));
  };
  const count = async (table: string) => {
    const [row]: { total: string }[] = await queryRunner.query(
      `SELECT COUNT(*) AS total FROM \`${table}\``,
    );
    return Number(row.total);
  };
  const counts = async () => {
    const result: Record<string, number> = {};
    for (const table of await tables()) result[table] = await count(table);
    return result;
  };
  const login = (documento: string) =>
    request(app.getHttpServer())
      .post('/api/sesion/ingresar')
      .set('X-Forwarded-For', nextTestIp())
      .send({ documento, contrasena: CONTRASENA_DATOS_DE_MUESTRA });

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = new DataSource({
      ...buildDataSourceOptions(loadTestEnvironment()),
      multipleStatements: true,
    });
    await dataSource.initialize();
    queryRunner = dataSource.createQueryRunner();

    // Datos de antes del restablecimiento: una cuenta y una sesión abierta.
    await createTestUser(app, { email: 'visitante@demo.test', dni: '20555666' });
    await loginAs(app, 'visitante@demo.test');
    await resetSampleData(queryRunner, prepareSampleScript(sql), DAYS);
  }, 120_000);

  afterAll(async () => {
    // Deja la base de tests vacía para los siguientes archivos.
    if (queryRunner) {
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const table of await tables()) await queryRunner.query(`DELETE FROM \`${table}\``);
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
      await queryRunner.release();
    }
    await dataSource?.destroy();
    await app?.close();
  }, 60_000);

  it('cada tabla tiene exactamente las filas de los datos de muestra', async () => {
    const expected = expectedCounts();
    const actual = await counts();

    for (const table of Object.keys(actual)) expected[table] ??= 0;
    expect(actual).toEqual(expected);
  });

  it('no quedan la cuenta ni la sesión de antes: todas las sesiones se cerraron (RF-23)', async () => {
    const visitor: unknown[] = await queryRunner.query(
      `SELECT id FROM usuarios WHERE email = 'visitante@demo.test'`,
    );

    expect(visitor).toEqual([]);
    expect(await count('sesiones')).toBe(0);
  });

  it('no toca la marca de la demo: la base de tests sigue sin marcar', async () => {
    expect(await count('base_demo')).toBe(0);
  });

  it(`corre las fechas ${DAYS} días, salvo la de los fallos (RF-22)`, async () => {
    const [movement]: { max: string }[] = await queryRunner.query(
      'SELECT MAX(fecha) AS max FROM movimientos',
    );
    const sampleMovementMax = lines
      .filter((line) => line.startsWith('INSERT INTO `movimientos`'))
      .flatMap((line) => Array.from(line.matchAll(/'(\d{4}-\d{2}-\d{2})'/g), (m) => m[1]))
      .sort()
      .at(-1)!;
    expect(movement.max).toBe(shift(sampleMovementMax, DAYS));

    const [login]: { max: string }[] = await queryRunner.query(
      `SELECT DATE_FORMAT(MAX(ultimoIngreso), '%Y-%m-%d') AS max FROM usuarios`,
    );
    expect(login.max).toBe(shift('2026-10-24', DAYS));

    const rulings: { fecha: string }[] = await queryRunner.query(
      'SELECT fecha FROM fallos ORDER BY fecha',
    );
    expect(rulings.map((row) => row.fecha)).toEqual(sampleRulingDates());
  });

  it('las tres cuentas de prueba ingresan con la contraseña de los datos de muestra, sin cambio pendiente', async () => {
    for (const dni of DNIS_CUENTAS_DEMO) {
      const response = await login(dni).expect(200);
      expect(response.body.debeCambiarContrasena).toBe(false);
    }
  });

  it('si algo falla en el medio, la base queda como estaba (RF-20)', async () => {
    const before = await counts();
    const broken = `${prepareSampleScript(sql)}\nINSERT INTO \`tabla_que_no_existe\` VALUES (1);`;

    await expect(resetSampleData(queryRunner, broken, DAYS)).rejects.toThrow();

    expect(await counts()).toEqual(before);
  });
});
