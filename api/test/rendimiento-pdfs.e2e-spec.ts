import { request as httpRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Movimiento, MOVEMENT_TYPES } from '../src/movimientos/movimiento.entity.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestClient, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearRulingTables, createTestFallo } from './utilidades/fallos-de-prueba.js';
import { clearMovementTables } from './utilidades/movimientos-de-prueba.js';
import { bufferOfSize, clearPdfTables, minimalPdf } from './utilidades/pdfs-de-prueba.js';
import { loginAs } from './utilidades/sesion-de-prueba.js';

const MOVEMENTS = 5000;
const BATCH = 250;
const BIG = 5_242_880;
const LIMIT_MS = 2000;

/**
 * Spec 010, T23: RNF de rendimiento con PDF. Los dos tiempos de 5 MB solo son una medición de la
 * api si la base está cerca: si la base sola tarda más de REMOTE_DB_MS en mover 5 MB, esos dos
 * tests se omiten (quedan como omitidos, no aprobados) y se corren desde el VPS (plan 010,
 * riesgo 6; validacion.md).
 */
const REMOTE_DB_MS = 1000;
describe('rendimiento con PDF', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let port: number;
  let lawyer: Usuario;
  let lawyerToken: string;
  let clientToken: string;
  let causaId: number;
  let bigMovementIds: number[];

  /** Inserta un PDF directamente y devuelve su id. */
  const insertPdf = async (codigo: string, contenido: Buffer) => {
    const result: { insertId: number } = await dataSource.query(
      'INSERT INTO pdfs (contenido, tamano, codigo, subidoPorId, subidoEn) VALUES (?, ?, ?, ?, NOW(6))',
      [contenido, contenido.length, codigo, lawyer.id],
    );
    return result.insertId;
  };

  const timedGet = async (path: string, token: string) => {
    const start = performance.now();
    const response = await request(app.getHttpServer())
      .get(path)
      .set('Cookie', `access_token=${token}`)
      .expect(200);
    return { ms: performance.now() - start, body: response.body };
  };

  /** Las consultas SQL que corre `accion`, para ver si alguna pide el contenido de un PDF. */
  async function capturedQueries(accion: () => Promise<unknown>): Promise<string[]> {
    const queryRunner = dataSource.createQueryRunner();
    const spy = vi.spyOn(Object.getPrototypeOf(queryRunner) as { query: () => unknown }, 'query');
    await queryRunner.release();
    try {
      await accion();
      return spy.mock.calls.map((call) => String((call as unknown[])[0]));
    } finally {
      spy.mockRestore();
    }
  }

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
    await app.listen(0);
    port = (app.getHttpServer().address() as AddressInfo).port;
    await clearTables(app);
    await clearMovementTables(app);
    await clearRulingTables(app);
    await clearPdfTables(app);
    lawyer = await createTestUser(app, { email: 'abogado@estudio.com' });
    const client = await createTestClient(app);
    lawyerToken = (await loginAs(app, lawyer.email!)).accessToken;
    clientToken = (await loginAs(app, client.email!)).accessToken;
    causaId = (
      await createTestCausa(app, {
        responsableId: lawyer.id,
        creadoPorId: lawyer.id,
        partes: [{ clienteId: client.id }],
      })
    ).id;

    // 5.000 movimientos, como el e2e de rendimiento de la spec 003.
    const filler = 'Se agrega a autos la documental acompañada por la parte actora. '.repeat(30);
    const repository = dataSource.getRepository(Movimiento);
    const creadoEn = new Date();
    for (let start = 0; start < MOVEMENTS; start += BATCH) {
      await repository.insert(
        Array.from({ length: BATCH }, (_, offset) => {
          const index = start + offset;
          return {
            causaId,
            fecha: `${2000 + (index % 25)}-${String((index % 12) + 1).padStart(2, '0')}-01`,
            tipo: MOVEMENT_TYPES[index % MOVEMENT_TYPES.length],
            descripcion: `${filler} Movimiento número ${index}.`,
            visible: true,
            anulado: false,
            creadoPorId: lawyer.id,
            creadoEn,
          };
        }),
      );
    }
    // Los movimientos de la primera página llevan PDF de 5 MB (los tres primeros) y chicos.
    const primeros: { id: number }[] = await dataSource.query(
      'SELECT id FROM movimientos WHERE causaId = ? ORDER BY fecha DESC, creadoEn DESC, id DESC LIMIT 20',
      [causaId],
    );
    bigMovementIds = primeros.slice(0, 5).map((fila) => fila.id);
    for (const [index, { id }] of primeros.entries()) {
      const contenido = index < 3 ? bufferOfSize(BIG) : minimalPdf();
      const pdfId = await insertPdf(`REN${String(index).padStart(3, '0')}`, contenido);
      await repository.update(id, { pdfId, pdfVisible: true });
    }
    // Dos PDF de 5 MB más, para las cinco descargas simultáneas.
    for (const [index, id] of bigMovementIds.slice(3).entries()) {
      await repository.update(id, { pdfId: null });
      const pdfId = await insertPdf(`BIG${index}`, bufferOfSize(BIG));
      await repository.update(id, { pdfId, pdfVisible: true });
    }

    // Fallos con PDF de 5 MB.
    for (let index = 0; index < 3; index++) {
      const fallo = await createTestFallo(app, {
        caratula: `Fallo ${index}`,
        numero: `${index}/2024`,
        creadoPorId: lawyer.id,
      });
      const pdfId = await insertPdf(`FAL${index}`, bufferOfSize(BIG));
      await dataSource.query('UPDATE fallos SET pdfId = ? WHERE id = ?', [pdfId, fallo.id]);
    }
  }, 600_000);

  afterAll(async () => {
    await clearMovementTables(app);
    await clearRulingTables(app);
    await clearPdfTables(app);
    await app?.close();
  }, 120_000);

  it('el historial de 5.000 movimientos, con PDF de 5 MB, responde en menos de 2 segundos', async () => {
    const { ms, body } = await timedGet(`/api/panel/causas/${causaId}/movimientos`, lawyerToken);

    expect(body.items.filter((item: { pdf: unknown }) => item.pdf !== null)).toHaveLength(20);
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('el listado de jurisprudencia con PDF de 5 MB responde en menos de 2 segundos', async () => {
    const { ms, body } = await timedGet('/api/panel/jurisprudencia', lawyerToken);

    expect(body.items.every((item: { tienePdf: boolean }) => item.tienePdf)).toBe(true);
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('los movimientos del portal con PDF responden en menos de 2 segundos', async () => {
    const { ms } = await timedGet(`/api/portal/causas/${causaId}/movimientos`, clientToken);

    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('ningún listado ni detalle pide el contenido de los PDF (plan 010, D1)', async () => {
    const [falloId] = (
      await dataSource.query('SELECT id FROM fallos ORDER BY id LIMIT 1')
    ).map((fila: { id: number }) => fila.id);

    const consultas = await capturedQueries(async () => {
      await timedGet(`/api/panel/causas/${causaId}/movimientos`, lawyerToken);
      await timedGet(`/api/panel/causas/${causaId}/movimientos/${bigMovementIds[0]}`, lawyerToken);
      await timedGet('/api/panel/jurisprudencia', lawyerToken);
      await timedGet(`/api/panel/jurisprudencia/${falloId}`, lawyerToken);
      await timedGet(`/api/portal/causas/${causaId}/movimientos`, clientToken);
      await timedGet(`/api/portal/causas/${causaId}/movimientos/${bigMovementIds[0]}`, clientToken);
    });

    expect(consultas.length).toBeGreaterThan(0);
    expect(consultas.filter((sql) => /contenido/.test(sql))).toEqual([]);
  });

  it('cinco descargas simultáneas de 5 MB empiezan a llegar en menos de 2 segundos', async (ctx) => {
    const primerByte = (movimientoId: number) =>
      new Promise<number>((resolve, reject) => {
        const start = performance.now();
        const pedido = httpRequest(
          {
            port,
            path: `/api/panel/causas/${causaId}/movimientos/${movimientoId}/pdf`,
            headers: { Cookie: `access_token=${lawyerToken}` },
          },
          (response) => {
            response.once('data', () => resolve(performance.now() - start));
            response.on('error', reject);
          },
        );
        pedido.on('error', reject);
        pedido.end();
      });

    // Con la base lejos, mover 5 MB mide la red y no la api: se omite (plan 010, riesgo 6).
    // Las cinco a la vez, como el test.
    const base = performance.now();
    await Promise.all(
      bigMovementIds.map((id) =>
        dataSource.query(
          'SELECT p.contenido FROM pdfs p JOIN movimientos m ON m.pdfId = p.id WHERE m.id = ?',
          [id],
        ),
      ),
    );
    if (performance.now() - base > REMOTE_DB_MS) {
      ctx.skip('La base de tests está lejos: correr desde el VPS (validacion.md, T23)');
    }

    const tiempos = await Promise.all(bigMovementIds.map(primerByte));

    for (const ms of tiempos) expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('guardar un formulario con 5 MB tarda menos de 3 segundos una vez recibido', async (ctx) => {
    const limite = 'limite-rendimiento';
    const cuerpo = Buffer.concat([
      Buffer.from(
        `--${limite}\r\nContent-Disposition: form-data; name="datos"\r\n\r\n` +
          JSON.stringify({ fecha: '2024-03-01', tipo: 'resolucion', descripcion: 'Resolucion.' }) +
          `\r\n--${limite}\r\nContent-Disposition: form-data; name="pdf"; filename="r.pdf"\r\n` +
          'Content-Type: application/pdf\r\n\r\n',
        'utf8',
      ),
      bufferOfSize(BIG),
      Buffer.from(`\r\n--${limite}--\r\n`, 'utf8'),
    ]);

    // Con la base lejos, mover 5 MB mide la red y no la api: se omite (plan 010, riesgo 6).
    const base = performance.now();
    const prueba = await insertPdf('BASE01', bufferOfSize(BIG));
    const baseMs = performance.now() - base;
    await dataSource.query('DELETE FROM pdfs WHERE id = ?', [prueba]);
    if (baseMs > REMOTE_DB_MS) {
      ctx.skip('La base de tests está lejos: correr desde el VPS (validacion.md, T23)');
    }

    const ms = await new Promise<number>((resolve, reject) => {
      let enviado = 0;
      const pedido = httpRequest(
        {
          port,
          method: 'POST',
          path: `/api/panel/causas/${causaId}/movimientos`,
          headers: {
            'Content-Type': `multipart/form-data; boundary=${limite}`,
            'Content-Length': String(cuerpo.length),
            Cookie: `access_token=${lawyerToken}`,
          },
        },
        (response) => {
          response.resume();
          response.on('end', () =>
            response.statusCode === 201
              ? resolve(performance.now() - enviado)
              : reject(new Error(`Respondió ${response.statusCode}`)),
          );
        },
      );
      pedido.on('error', reject);
      // Desde que terminó de enviarse el cuerpo hasta la respuesta.
      pedido.end(cuerpo, () => (enviado = performance.now()));
    });

    expect(ms).toBeLessThan(3000);
  }, 60_000);
});
