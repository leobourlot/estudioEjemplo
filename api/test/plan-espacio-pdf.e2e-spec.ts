import type { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource, type EntityManager } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Environment } from '../src/configuracion/validar-entorno.js';
import { Pdf } from '../src/pdfs/pdf.entity.js';
import { PdfsService } from '../src/pdfs/pdfs.service.js';
import { PDF_MESSAGES } from '../src/pdfs/reglas-pdf.js';
import { PlanService } from '../src/plan/plan.service.js';
import { BYTES_PER_GB, PLAN_MESSAGES } from '../src/plan/reglas-plan.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearMovementTables } from './utilidades/movimientos-de-prueba.js';
import { bufferOfSize, clearPdfTables, minimalPdf, notAPdf } from './utilidades/pdfs-de-prueba.js';
import { loginAs } from './utilidades/sesion-de-prueba.js';

const MB = 1_048_576;
const TOTAL = BYTES_PER_GB;
const SPACE_FULL = PLAN_MESSAGES.pdfSpaceFull(TOTAL);
const DATOS = { fecha: '2024-03-01', tipo: 'resolucion', descripcion: 'Se dicta resolución.' };

let codeCounter = 0;

/**
 * Spec 011, RF-27 y RF-28: el espacio para PDF, con 1 GB. Los PDF que ocupan el espacio se
 * insertan con un tamaño registrado grande y un contenido chico: la suma usa el tamaño, no el
 * contenido (plan 011, riesgo 4).
 */
describe('espacio para PDF', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let lawyer: Usuario;
  let token: string;
  let causaId: number;

  const movements = () => `/api/panel/causas/${causaId}/movimientos`;
  const panel = (method: 'post' | 'patch', path: string) =>
    request(app.getHttpServer())[method](path).set('Cookie', `access_token=${token}`);

  /** Un PDF que ocupa `tamano` bytes del espacio, sin subir ese contenido. */
  const fill = async (tamano: number): Promise<number> => {
    const result: { insertId: number } = await dataSource.query(
      `INSERT INTO pdfs (contenido, tamano, codigo, subidoPorId, subidoEn) VALUES (?, ?, ?, ?, NOW(6))`,
      [minimalPdf(), tamano, `ESP${String(++codeCounter).padStart(3, '0')}`, lawyer.id],
    );
    return result.insertId;
  };
  const create = (contenido: Buffer, service = app.get(PdfsService)) =>
    dataSource.transaction((manager) => service.create(manager, contenido, lawyer));
  const pdfCount = () => dataSource.getRepository(Pdf).count();

  beforeAll(async () => {
    app = await createTestApp({ espacioPdfGb: 1 });
    dataSource = app.get(DataSource);
    await clearTables(app);
    lawyer = await createTestUser(app, { email: 'abogado@estudio.com' });
    token = (await loginAs(app, lawyer.email!)).accessToken;
    causaId = (await createTestCausa(app, { responsableId: lawyer.id, creadoPorId: lawyer.id })).id;
  }, 60_000);

  beforeEach(async () => {
    await clearMovementTables(app);
    await clearPdfTables(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('usa el espacio configurado', () => {
    expect(app.get(PlanService).pdfSpaceBytes).toBe(TOTAL);
  });

  it('un PDF que llega justo al total se guarda; uno que lo supera responde 409 T-9', async () => {
    const pdf = minimalPdf();
    await fill(TOTAL - pdf.length);

    await create(pdf);
    expect(await pdfCount()).toBe(2);

    const response = await panel('post', movements())
      .field('datos', JSON.stringify(DATOS))
      .attach('pdf', minimalPdf(), 'escrito.pdf');
    expect(response.status).toBe(409);
    expect(response.body.message).toBe(SPACE_FULL);
    expect(await pdfCount()).toBe(2);
  });

  it('un reemplazo descuenta el anterior: 4 MB por 5 MB con 1 MB libre entra', async () => {
    const old = await fill(4 * MB);
    await fill(TOTAL - 5 * MB);
    const movimiento: { insertId: number } = await dataSource.query(
      `INSERT INTO movimientos (causaId, fecha, tipo, descripcion, visible, creadoPorId, creadoEn, pdfId)
       VALUES (?, '2024-03-01', 'resolucion', 'Resolución', 0, ?, NOW(6), ?)`,
      [causaId, lawyer.id, old],
    );

    const response = await panel('patch', `${movements()}/${movimiento.insertId}`)
      .field('datos', JSON.stringify({}))
      .attach('pdf', bufferOfSize(5 * MB), 'nuevo.pdf');

    expect(response.status).toBe(200);
    expect(await dataSource.getRepository(Pdf).existsBy({ id: old })).toBe(false);
  });

  it('quitar un PDF libera el espacio en el momento', async () => {
    const big = await fill(TOTAL);
    await expect(create(minimalPdf())).rejects.toThrow(SPACE_FULL);

    await dataSource.getRepository(Pdf).delete(big);

    await create(minimalPdf());
    expect(await pdfCount()).toBe(1);
  });

  it('cuentan los PDF de movimientos anulados y de fallos desactivados: todos los de la base', async () => {
    await fill(TOTAL / 2);
    await fill(TOTAL / 2);

    await expect(create(minimalPdf())).rejects.toThrow(SPACE_FULL);
  });

  it('de dos subidas simultáneas cuando entra una sola, se guarda una sola', async () => {
    const pdf = bufferOfSize(MB);
    await fill(TOTAL - pdf.length - pdf.length / 2);

    const results = await Promise.allSettled([create(pdf), create(pdf)]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(await pdfCount()).toBe(2);
  });

  it('con el espacio completo, un archivo inválido responde su mensaje, no T-9', async () => {
    await fill(TOTAL);

    const response = await panel('post', movements())
      .field('datos', JSON.stringify(DATOS))
      .attach('pdf', notAPdf(), 'foto.pdf');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(PDF_MESSAGES.notPdf);
  });

  it('con el modo demo y 4 PDF, responde el tope de la demo antes que T-9', async () => {
    for (let i = 0; i < 4; i++) await fill(TOTAL / 4);
    const config = { get: () => true } as unknown as ConfigService<Environment, true>;
    const demo = new PdfsService(dataSource, config, app.get(PlanService));

    await expect(create(minimalPdf(), demo)).rejects.toThrow(PDF_MESSAGES.demoLimit);
  });

  it('la suma no lee el contenido de los PDF', async () => {
    await fill(MB);
    let queries: string[] = [];

    await dataSource.transaction(async (manager: EntityManager) => {
      const spy = vi.spyOn(manager, 'query');
      await app.get(PlanService).usedPdfBytes(manager, true);
      queries = spy.mock.calls.map(([sql]) => String(sql));
    });

    expect(queries).toHaveLength(1);
    expect(queries[0]).not.toContain('contenido');
  });
});
