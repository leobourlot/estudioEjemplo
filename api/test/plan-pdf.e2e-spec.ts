import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, describe, expect, it } from 'vitest';
import { CambioMovimiento } from '../src/movimientos/cambio-movimiento.entity.js';
import { PDF_HIDDEN_BY_PLAN } from '../src/movimientos/movimiento-detalle.js';
import { Movimiento } from '../src/movimientos/movimiento.entity.js';
import { Pdf } from '../src/pdfs/pdf.entity.js';
import { PdfsService } from '../src/pdfs/pdfs.service.js';
import { type Plan, PLAN_MESSAGES } from '../src/plan/reglas-plan.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestClient, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearMovementTables } from './utilidades/movimientos-de-prueba.js';
import { clearPdfTables, signedPdf } from './utilidades/pdfs-de-prueba.js';
import { loginAs } from './utilidades/sesion-de-prueba.js';

const DATOS = { fecha: '2024-03-01', tipo: 'resolucion', descripcion: 'Se dicta resolución.' };

/**
 * Spec 011, RF-9 a RF-16: los PDF al pasar del plan Premium al Básico y volver. Los pasos dependen
 * del anterior: cada uno arranca la api con un plan, sin vaciar las tablas.
 */
describe('PDF de los movimientos según el plan', () => {
  let app: NestExpressApplication | undefined;
  let lawyer: Usuario;
  let client: Usuario;
  let causaId: number;
  let movimientoId: number;
  let codigo: string;
  let lawyerToken: string;
  let clientToken: string;

  const boot = async (plan: Plan, keepTables = true) => {
    await app?.close();
    app = await createTestApp({ plan, keepTables });
    lawyerToken = (await loginAs(app, lawyer.email!)).accessToken;
    clientToken = (await loginAs(app, client.email!)).accessToken;
  };
  const server = () => app!.getHttpServer();
  const dataSource = () => app!.get(DataSource);
  const movements = () => `/api/panel/causas/${causaId}/movimientos`;
  const panel = (method: 'get' | 'post' | 'patch', path: string) =>
    request(server())[method](path).set('Cookie', `access_token=${lawyerToken}`);
  const portal = (path: string) =>
    request(server())
      .get(`/api/portal/causas/${causaId}${path}`)
      .set('Cookie', `access_token=${clientToken}`);
  const counts = async () => ({
    movimientos: await dataSource().getRepository(Movimiento).count(),
    pdfs: await dataSource().getRepository(Pdf).count(),
    cambios: await dataSource().getRepository(CambioMovimiento).count(),
  });
  const storedPdf = async () => {
    const movimiento = await dataSource()
      .getRepository(Movimiento)
      .findOneByOrFail({ id: movimientoId });
    return app!.get(PdfsService).findContent(movimiento.pdfId!);
  };

  afterAll(async () => {
    await app?.close();
  });

  it('con el plan Premium se carga un movimiento visible con PDF', async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearMovementTables(app);
    await clearPdfTables(app);
    lawyer = await createTestUser(app, { email: 'abogado@estudio.com' });
    client = await createTestClient(app);
    causaId = (
      await createTestCausa(app, {
        responsableId: lawyer.id,
        creadoPorId: lawyer.id,
        partes: [{ clienteId: client.id }],
      })
    ).id;
    await boot('premium');

    const response = await panel('post', movements())
      .field('datos', JSON.stringify({ ...DATOS, visible: true }))
      .attach('pdf', signedPdf(), 'resolucion.pdf');

    expect(response.status).toBe(201);
    movimientoId = response.body.id;
    codigo = (await storedPdf())!.codigo;
  });

  describe('con el plan Básico', () => {
    it('subir, reemplazar y quitar responden 403 T-4 sin guardar nada (RF-11)', async () => {
      await boot('basico');
      const before = await counts();

      const attempts = [
        await panel('post', movements())
          .field('datos', JSON.stringify(DATOS))
          .attach('pdf', signedPdf(), 'otro.pdf'),
        await panel('patch', `${movements()}/${movimientoId}`)
          .field('datos', JSON.stringify({}))
          .attach('pdf', signedPdf(), 'otro.pdf'),
        await panel('patch', `${movements()}/${movimientoId}`).send({ quitarPdf: true }),
      ];

      for (const response of attempts) {
        expect(response.status).toBe(403);
        expect(response.body.message).toBe(PLAN_MESSAGES.featureNotIncluded);
      }
      expect(await counts()).toEqual(before);
      await expect(
        dataSource().transaction((manager) =>
          app!.get(PdfsService).create(manager, signedPdf(), lawyer),
        ),
      ).rejects.toThrow(PLAN_MESSAGES.featureNotIncluded);
    });

    it('el detalle solo dice que tiene PDF; el historial lleva la marca (RF-12, RF-16)', async () => {
      const detail = await panel('get', `${movements()}/${movimientoId}`).expect(200);
      const list = await panel('get', movements()).expect(200);

      expect(detail.body.pdf).toBeNull();
      expect(detail.body.tienePdf).toBe(true);
      const pdfChanges = detail.body.cambios.flatMap((cambio: { cambios: object[] }) =>
        cambio.cambios.filter((c) => (c as { campo: string }).campo === 'pdf'),
      );
      expect(pdfChanges.length).toBeGreaterThan(0);
      for (const change of pdfChanges) {
        expect(change).toMatchObject({ anterior: PDF_HIDDEN_BY_PLAN, nuevo: PDF_HIDDEN_BY_PLAN });
      }
      for (const body of [detail.text, list.text]) {
        expect(body).not.toContain(codigo);
        expect(body).not.toContain(String(signedPdf().length));
      }
    });

    it('la descarga del panel responde 403 T-4, exista o no el PDF (RF-12)', async () => {
      for (const path of [
        `${movements()}/${movimientoId}/pdf`,
        `${movements()}/999999/pdf`,
        '/api/panel/causas/999999/movimientos/1/pdf',
        `${movements()}/abc/pdf`,
      ]) {
        const response = await panel('get', path);
        expect(response.status, path).toBe(403);
        expect(response.body.message).toBe(PLAN_MESSAGES.featureNotIncluded);
      }
    });

    it('el portal no da ninguna señal del PDF y la descarga responde el 404 de siempre (RF-13)', async () => {
      const list = await portal('/movimientos').expect(200);
      const detail = await portal(`/movimientos/${movimientoId}`).expect(200);
      expect(list.body.items[0].tienePdf).toBe(false);
      expect(detail.body.tienePdf).toBe(false);
      expect(list.text + detail.text).not.toContain(codigo);

      const download = await portal(`/movimientos/${movimientoId}/pdf`);
      const withoutPermission = await portal('/movimientos/999999/pdf');
      expect(download.status).toBe(404);
      expect(download.text).toBe(withoutPermission.text);
    });

    it('modificar, anular, restaurar y cambiar la visibilidad conservan el PDF (RF-14)', async () => {
      const path = `${movements()}/${movimientoId}`;
      await panel('patch', path).send({ descripcion: 'Otra descripción.' }).expect(200);
      await panel('post', `${path}/anular`).expect(200);
      await panel('post', `${path}/restaurar`).expect(200);
      await panel('patch', path).send({ visible: false }).expect(200);
      await panel('patch', path).send({ visible: true }).expect(200);

      const stored = await storedPdf();
      expect(stored?.codigo).toBe(codigo);
      expect(Buffer.compare(stored!.contenido, signedPdf())).toBe(0);
    });
  });

  it('al volver al plan Premium, el integrante y el cliente los ven otra vez (RF-9, RF-14, RF-16)', async () => {
    await boot('premium');

    const panelDownload = await panel('get', `${movements()}/${movimientoId}/pdf`)
      .responseType('blob')
      .expect(200);
    expect(Buffer.compare(panelDownload.body as Buffer, signedPdf())).toBe(0);

    const portalDownload = await portal(`/movimientos/${movimientoId}/pdf`)
      .responseType('blob')
      .expect(200);
    expect(Buffer.compare(portalDownload.body as Buffer, signedPdf())).toBe(0);

    const detail = await panel('get', `${movements()}/${movimientoId}`).expect(200);
    expect(detail.body.pdf).toMatchObject({ codigo, tamano: signedPdf().length });
    expect(detail.text).not.toContain(PDF_HIDDEN_BY_PLAN);
  });
});
