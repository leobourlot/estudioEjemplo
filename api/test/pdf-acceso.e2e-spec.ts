import { request as httpRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import { setTimeout as wait } from 'node:timers/promises';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Movimiento } from '../src/movimientos/movimiento.entity.js';
import { Pdf } from '../src/pdfs/pdf.entity.js';
import { Sesion } from '../src/usuarios/sesion.entity.js';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestClient, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearRulingTables } from './utilidades/fallos-de-prueba.js';
import { clearMovementTables } from './utilidades/movimientos-de-prueba.js';
import { clearPdfTables, minimalPdf } from './utilidades/pdfs-de-prueba.js';
import { loginAs } from './utilidades/sesion-de-prueba.js';

const LIMITE = 'limite-acceso';
const DATOS = JSON.stringify({
  fecha: '2024-03-01',
  tipo: 'resolucion',
  descripcion: 'Se dicta resolución.',
});

/** Un formulario multipart armado a mano, para enviarlo por partes. */
const multipart = (pdf: Buffer) =>
  Buffer.concat([
    Buffer.from(
      `--${LIMITE}\r\nContent-Disposition: form-data; name="datos"\r\n\r\n${DATOS}\r\n` +
        `--${LIMITE}\r\nContent-Disposition: form-data; name="pdf"; filename="r.pdf"\r\n` +
        'Content-Type: application/pdf\r\n\r\n',
      'utf8',
    ),
    pdf,
    Buffer.from(`\r\n--${LIMITE}--\r\n`, 'utf8'),
  ]);

/** Spec 010, T20 (RF-10 a RF-12) y T21 (RF-36, RF-38). */
describe('PDF: integridad, acceso y encabezados', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let port: number;
  let lawyer: Usuario;
  let lawyerToken: string;
  let clientToken: string;
  let pendingToken: string;
  let causaId: number;
  let movimientoId: number;
  let falloId: number;

  const counts = async () => ({
    movimientos: await dataSource.getRepository(Movimiento).count(),
    pdfs: await dataSource.getRepository(Pdf).count(),
  });

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
    await createTestUser(app, { email: 'pendiente@estudio.com', debeCambiarContrasena: true });
    lawyerToken = (await loginAs(app, lawyer.email!)).accessToken;
    clientToken = (await loginAs(app, client.email!)).accessToken;
    pendingToken = (await loginAs(app, 'pendiente@estudio.com')).accessToken;
    causaId = (
      await createTestCausa(app, {
        responsableId: lawyer.id,
        creadoPorId: lawyer.id,
        partes: [{ clienteId: client.id }],
      })
    ).id;

    movimientoId = (
      await request(app.getHttpServer())
        .post(`/api/panel/causas/${causaId}/movimientos`)
        .set('Cookie', `access_token=${lawyerToken}`)
        .field('datos', JSON.stringify({ ...JSON.parse(DATOS), visible: true, pdfVisible: true }))
        .attach('pdf', minimalPdf(), 'r.pdf')
        .expect(201)
    ).body.id;
    falloId = (
      await request(app.getHttpServer())
        .post('/api/panel/jurisprudencia')
        .set('Cookie', `access_token=${lawyerToken}`)
        .field(
          'datos',
          JSON.stringify({
            caratula: 'Pérez c/ Gómez',
            tribunal: 'CNCiv., Sala A',
            fuero: 'civil',
            fecha: '2019-05-12',
            sumario: 'Sumario.',
            palabrasClave: ['daño moral'],
          }),
        )
        .attach('pdf', minimalPdf(), 'f.pdf')
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('todo o nada e interrupción (T20)', () => {
    /** Abre un pedido multipart por partes, con la sesión del abogado. */
    const openUpload = () =>
      httpRequest({
        port,
        method: 'POST',
        path: `/api/panel/causas/${causaId}/movimientos`,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${LIMITE}`,
          Cookie: `access_token=${lawyerToken}`,
        },
      });

    it('un pedido cortado a mitad del archivo no deja nada guardado (RF-12)', async () => {
      const antes = await counts();
      const cuerpo = multipart(minimalPdf('Cortado'.repeat(5_000)));
      const pedido = openUpload();
      pedido.on('error', () => undefined);

      pedido.write(cuerpo.subarray(0, Math.floor(cuerpo.length / 2)));
      await wait(300);
      pedido.destroy();
      await wait(1_000);

      expect(await counts()).toEqual(antes);
    });

    it('una subida que empieza con la sesión a punto de vencer termina bien (RF-12)', async () => {
      const antes = await counts();
      await dataSource
        .getRepository(Sesion)
        .update({ usuarioId: lawyer.id }, { venceEn: new Date(Date.now() + 1_000) });
      const cuerpo = multipart(minimalPdf());
      const pedido = openUpload();

      const status = new Promise<string>((resolve, reject) => {
        pedido.on('response', (response) => {
          let body = '';
          response.on('data', (chunk: Buffer) => (body += chunk.toString()));
          response.on('end', () => resolve(`${response.statusCode} ${body}`));
        });
        pedido.on('error', reject);
      });
      pedido.write(cuerpo.subarray(0, 100));
      await wait(2_000);
      pedido.end(cuerpo.subarray(100));

      expect(await status).toMatch(/^201 /);
      const despues = await counts();
      expect(despues.movimientos).toBe(antes.movimientos + 1);
      expect(despues.pdfs).toBe(antes.pdfs + 1);
    });
  });

  describe('acceso y encabezados (T21, RF-36, RF-38)', () => {
    const descargas = () => ({
      panelMovimiento: `/api/panel/causas/${causaId}/movimientos/${movimientoId}/pdf`,
      panelFallo: `/api/panel/jurisprudencia/${falloId}/pdf`,
      portal: `/api/portal/causas/${causaId}/movimientos/${movimientoId}/pdf`,
    });

    const get = (path: string, token?: string) => {
      const pedido = request(app.getHttpServer()).get(path).responseType('blob');
      return token ? pedido.set('Cookie', `access_token=${token}`) : pedido;
    };

    const escrituras = (token?: string) => {
      const withCookie = (pedido: request.Test) =>
        token ? pedido.set('Cookie', `access_token=${token}`) : pedido;
      const server = () => request(app.getHttpServer());
      return [
        () => withCookie(server().post(`/api/panel/causas/${causaId}/movimientos`)),
        () => withCookie(server().patch(`/api/panel/causas/${causaId}/movimientos/${movimientoId}`)),
        () => withCookie(server().post('/api/panel/jurisprudencia')),
        () => withCookie(server().patch(`/api/panel/jurisprudencia/${falloId}`)),
      ].map((armar) => () => armar().field('datos', '{}').attach('pdf', minimalPdf(), 'x.pdf'));
    };

    it('un visitante recibe 401 en las descargas y en las escrituras con archivo', async () => {
      for (const path of Object.values(descargas())) {
        expect((await get(path)).status).toBe(401);
      }
      for (const escritura of escrituras()) expect((await escritura()).status).toBe(401);
    });

    it('un cliente recibe 403 en el panel, y un integrante en el portal', async () => {
      const { panelMovimiento, panelFallo, portal } = descargas();
      expect((await get(panelMovimiento, clientToken)).status).toBe(403);
      expect((await get(panelFallo, clientToken)).status).toBe(403);
      expect((await get(portal, lawyerToken)).status).toBe(403);
      for (const escritura of escrituras(clientToken)) expect((await escritura()).status).toBe(403);
    });

    it('un integrante con cambio de contraseña pendiente recibe 403', async () => {
      const { panelMovimiento, panelFallo } = descargas();
      expect((await get(panelMovimiento, pendingToken)).status).toBe(403);
      expect((await get(panelFallo, pendingToken)).status).toBe(403);
      for (const escritura of escrituras(pendingToken)) {
        expect((await escritura()).status).toBe(403);
      }
    });

    it('las tres descargas llevan los encabezados de la entrega del PDF', async () => {
      const { panelMovimiento, panelFallo, portal } = descargas();
      for (const [path, token] of [
        [panelMovimiento, lawyerToken],
        [panelFallo, lawyerToken],
        [portal, clientToken],
      ] as const) {
        const { status, headers } = await get(path, token);
        expect(status).toBe(200);
        expect(headers).toMatchObject({
          'content-type': 'application/pdf',
          'x-content-type-options': 'nosniff',
          'cache-control': 'no-store, private',
          'content-security-policy': "default-src 'none'; sandbox",
          'cross-origin-resource-policy': 'same-site',
        });
        expect(headers['content-disposition']).toMatch(/^attachment; filename="[^"]+\.pdf"$/);
      }
    });
  });
});
