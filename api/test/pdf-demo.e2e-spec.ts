import { readFileSync } from 'node:fs';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource, type QueryRunner } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildDataSourceOptions } from '../src/base-de-datos/opciones-base-de-datos.js';
import { CONTRASENA_DATOS_DE_MUESTRA } from '../src/demo/cuentas-demo.js';
import { CONTROL_TABLES } from '../src/demo/fechas-demo.js';
import { resetSampleData } from '../src/demo/restablecimiento-demo.js';
import { prepareSampleScript } from '../src/demo/script-datos-de-muestra.js';
import { createTestApp } from './utilidades/aplicacion-de-tests.js';
import { loadTestEnvironment } from './utilidades/base-de-tests.js';
import { bufferOfSize } from './utilidades/pdfs-de-prueba.js';
import { cookieValue, nextTestIp } from './utilidades/sesion-de-prueba.js';

const DAYS = 10;
const sql = readFileSync('datos-de-muestra/datos-de-muestra.sql', 'utf8').replace(/\r\n/g, '\n');
/** DNI de la cliente de prueba de la demo (spec 009, cuentas-demo.ts). */
const CLIENTE_DE_PRUEBA = '28456123';

interface PdfRow {
  id: number;
  codigo: string;
  contenido: Buffer;
  subidoEn: Date;
}

/**
 * Spec 010, T22: los PDF de los datos de muestra y el restablecimiento de la demo (RF-41 a
 * RF-43). Llama a resetSampleData directamente, como el e2e de la spec 009.
 */
describe('PDF de los datos de muestra y restablecimiento', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const pdfs = (): Promise<PdfRow[]> =>
    queryRunner.query('SELECT id, codigo, contenido, subidoEn FROM pdfs ORDER BY codigo');

  /** Un PDF "subido por un visitante" antes del restablecimiento. */
  const insertVisitorPdf = async (codigo: string, contenido: Buffer) => {
    const [user]: { id: number }[] = await queryRunner.query('SELECT id FROM usuarios LIMIT 1');
    await queryRunner.query(
      'INSERT INTO pdfs (contenido, tamano, codigo, subidoPorId, subidoEn) VALUES (?, ?, ?, ?, NOW(6))',
      [contenido, contenido.length, codigo, user.id],
    );
  };

  const tables = async (): Promise<string[]> => {
    const rows: { name: string }[] = await queryRunner.query(
      `SELECT TABLE_NAME AS name FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`,
    );
    return rows.map((row) => row.name).filter((name) => !CONTROL_TABLES.includes(name));
  };

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = new DataSource({
      ...buildDataSourceOptions(loadTestEnvironment()),
      multipleStatements: true,
    });
    await dataSource.initialize();
    queryRunner = dataSource.createQueryRunner();
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

  it('los datos de muestra traen dos PDF ficticios de la demo (RF-42)', async () => {
    const filas = await pdfs();

    expect(filas.map((fila) => fila.codigo)).toEqual(['MUES01', 'MUES02']);
    for (const { contenido } of filas) {
      expect(contenido.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      expect(contenido.toString('latin1')).toContain('Documento de muestra de la demo');
    }
  });

  it('MUES01 está, visible, en un movimiento visible de una causa de la cliente de prueba', async () => {
    const [fila]: { causaId: number; movimientoId: number }[] = await queryRunner.query(
      `SELECT m.causaId, m.id AS movimientoId FROM movimientos m
       JOIN pdfs p ON p.id = m.pdfId
       JOIN partes pa ON pa.causaId = m.causaId AND pa.vigente = 1
       JOIN clientes c ON c.usuarioId = pa.clienteId
       WHERE p.codigo = 'MUES01' AND m.visible = 1 AND m.anulado = 0 AND m.pdfVisible = 1
         AND c.dni = ?`,
      [CLIENTE_DE_PRUEBA],
    );
    expect(fila).toBeDefined();

    const ingreso = await request(app.getHttpServer())
      .post('/api/sesion/ingresar')
      .set('X-Forwarded-For', nextTestIp())
      .send({ documento: CLIENTE_DE_PRUEBA, contrasena: CONTRASENA_DATOS_DE_MUESTRA })
      .expect(200);
    const response = await request(app.getHttpServer())
      .get(`/api/portal/causas/${fila.causaId}/movimientos/${fila.movimientoId}/pdf`)
      .set('Cookie', `access_token=${cookieValue(ingreso, 'access_token')}`)
      .responseType('blob')
      .expect(200);
    expect((response.body as Buffer).toString('latin1')).toContain('Documento de muestra');
  });

  it('MUES02 está en un fallo', async () => {
    const filas: unknown[] = await queryRunner.query(
      `SELECT f.id FROM fallos f JOIN pdfs p ON p.id = f.pdfId WHERE p.codigo = 'MUES02'`,
    );
    expect(filas).toHaveLength(1);
  });

  it('el restablecimiento borra los PDF de los visitantes y corre las fechas de subida (RF-43)', async () => {
    await insertVisitorPdf('VISIT1', bufferOfSize(2_000));

    await resetSampleData(queryRunner, prepareSampleScript(sql), DAYS);

    const filas = await pdfs();
    expect(filas.map((fila) => fila.codigo)).toEqual(['MUES01', 'MUES02']);
    const [{ subidoEn }]: { subidoEn: string }[] = await queryRunner.query(
      `SELECT DATE_FORMAT(subidoEn, '%Y-%m-%d %H:%i:%s') AS subidoEn FROM pdfs WHERE codigo = 'MUES01'`,
    );
    // En el SQL: 2026-03-26 16:21:05, corrido DAYS días.
    expect(subidoEn).toBe('2026-04-05 16:21:05');
  });

  it('si el restablecimiento falla, los PDF quedan como estaban', async () => {
    await insertVisitorPdf('VISIT2', bufferOfSize(2_000));
    const antes = (await pdfs()).map((fila) => fila.codigo);

    await expect(
      resetSampleData(queryRunner, `${prepareSampleScript(sql)}\nINSERT INTO tabla_que_no_existe VALUES (1);`, DAYS),
    ).rejects.toThrow();

    expect((await pdfs()).map((fila) => fila.codigo)).toEqual(antes);
  });

  it('con 4 PDF de 5 MB, el restablecimiento termina en menos de un minuto (RF-43)', async () => {
    await queryRunner.query("DELETE FROM pdfs WHERE codigo LIKE 'VISIT%'");
    await insertVisitorPdf('GRAN01', bufferOfSize(5_242_880));
    await insertVisitorPdf('GRAN02', bufferOfSize(5_242_880));

    const inicio = Date.now();
    await resetSampleData(queryRunner, prepareSampleScript(sql), DAYS);

    expect(Date.now() - inicio).toBeLessThan(60_000);
    expect((await pdfs()).map((fila) => fila.codigo)).toEqual(['MUES01', 'MUES02']);
  }, 120_000);
});
