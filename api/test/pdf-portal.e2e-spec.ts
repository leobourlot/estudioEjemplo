import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Causa } from '../src/causas/causa.entity.js';
import { Parte } from '../src/causas/parte.entity.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestClient, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearMovementTables } from './utilidades/movimientos-de-prueba.js';
import { clearPdfTables, minimalPdf, signedPdf } from './utilidades/pdfs-de-prueba.js';
import { loginAs } from './utilidades/sesion-de-prueba.js';

/** Spec 010, T19: el PDF de los movimientos en el portal del cliente (RF-33 a RF-35, RF-37). */
describe('PDF de los movimientos en el portal', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let lawyer: Usuario;
  let client: Usuario;
  let causaId: number;
  let ajenaId: number;
  let lawyerToken: string;
  let clientToken: string;

  /** Carga un movimiento por el panel, con o sin PDF, y devuelve su id. */
  async function createMovement(
    opciones: { causa?: number; visible?: boolean; pdf?: Buffer | null } = {},
  ): Promise<number> {
    const { causa = causaId, visible = true, pdf = minimalPdf() } = opciones;
    const datos = {
      fecha: '2024-03-01',
      tipo: 'resolucion',
      descripcion: 'Se dicta resolución.',
      visible,
    };
    const pedido = request(app.getHttpServer())
      .post(`/api/panel/causas/${causa}/movimientos`)
      .set('Cookie', `access_token=${lawyerToken}`);
    const response = pdf
      ? await pedido.field('datos', JSON.stringify(datos)).attach('pdf', pdf, 'resolucion.pdf')
      : await pedido.send(datos);
    expect(response.status).toBe(201);
    return response.body.id as number;
  }

  const panelPost = (path: string) =>
    request(app.getHttpServer()).post(path).set('Cookie', `access_token=${lawyerToken}`).expect(200);

  const portalGet = (path: string) =>
    request(app.getHttpServer()).get(`/api/portal/causas${path}`).set('Cookie', `access_token=${clientToken}`);

  const download = (movimientoId: number | string, causa: number | string = causaId) =>
    portalGet(`/${causa}/movimientos/${movimientoId}/pdf`).responseType('blob');

  /** Respuesta comparable de una descarga: código y cuerpo como texto. */
  const result = async (movimientoId: number | string, causa: number | string = causaId) => {
    const response = await download(movimientoId, causa);
    return { status: response.status, body: (response.body as Buffer).toString() };
  };

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
  }, 60_000);

  beforeEach(async () => {
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
    ajenaId = (await createTestCausa(app, { responsableId: lawyer.id, creadoPorId: lawyer.id })).id;
    lawyerToken = (await loginAs(app, lawyer.email!)).accessToken;
    clientToken = (await loginAs(app, client.email!)).accessToken;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('el cliente descarga el PDF de un movimiento visible de su causa (RF-33)', async () => {
    const id = await createMovement({ pdf: signedPdf() });

    const response = await download(id).expect(200);

    expect(Buffer.compare(response.body as Buffer, signedPdf())).toBe(0);
    expect(response.headers['content-disposition']).toMatch(
      /^attachment; filename="2024-03-01 Resolucion [A-Z0-9]{6}\.pdf"$/,
    );
  });

  it('todos los casos sin permiso responden exactamente lo mismo (RF-37)', async () => {
    const conPdf = await createMovement();
    const movimientoOculto = await createMovement({ visible: false });
    const anulado = await createMovement();
    await panelPost(`/api/panel/causas/${causaId}/movimientos/${anulado}/anular`);
    const sinPdf = await createMovement({ pdf: null });
    const deAjena = await createMovement({ causa: ajenaId });

    const casos = [
      await result(movimientoOculto),
      await result(anulado),
      await result(sinPdf),
      await result(999_999),
      await result(deAjena),
      await result(deAjena, ajenaId),
      await result(conPdf, 999_999),
      await result('abc'),
      await result(conPdf, 'abc'),
    ];

    expect(casos[0].status).toBe(404);
    expect(JSON.parse(casos[0].body).message).toBe('No existe ese PDF');
    for (const caso of casos) expect(caso).toEqual(casos[0]);
  });

  it('la causa desactivada y el cliente desvinculado no dan el PDF; al volver, sí', async () => {
    const id = await createMovement();
    const noExiste = await result(999_999);

    await dataSource.getRepository(Causa).update(causaId, { activa: false });
    expect(await result(id)).toEqual(noExiste);
    await dataSource.getRepository(Causa).update(causaId, { activa: true });
    await download(id).expect(200);

    await dataSource.getRepository(Parte).update({ causaId, clienteId: client.id }, { vigente: false });
    expect(await result(id)).toEqual(noExiste);
  });

  it('un movimiento restaurado vuelve a dar el PDF', async () => {
    const id = await createMovement();
    await panelPost(`/api/panel/causas/${causaId}/movimientos/${id}/anular`);
    await download(id).expect(404);

    await panelPost(`/api/panel/causas/${causaId}/movimientos/${id}/restaurar`);

    await download(id).expect(200);
  });

  it('tienePdf en cada movimiento visible con PDF, y el portal no dice nada más del PDF (RF-34, RF-35)', async () => {
    const conPdf = await createMovement();
    const sinPdf = await createMovement({ pdf: null });

    const lista = await portalGet(`/${causaId}/movimientos`).expect(200);
    const porId = new Map(
      (lista.body.items as { id: number; tienePdf: boolean }[]).map((i) => [i.id, i.tienePdf]),
    );
    expect(porId.get(conPdf)).toBe(true);
    expect(porId.get(sinPdf)).toBe(false);

    const detalle = await portalGet(`/${causaId}/movimientos/${conPdf}`).expect(200);
    expect(detalle.body.tienePdf).toBe(true);

    for (const body of [lista.body, detalle.body]) {
      expect(JSON.stringify(body)).not.toMatch(/tamano|codigo|subido|pdfId|pdfVisible/);
    }
  });
});
