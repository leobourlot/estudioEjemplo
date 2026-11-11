import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Causa } from '../src/causas/causa.entity.js';
import { CambioMovimiento } from '../src/movimientos/cambio-movimiento.entity.js';
import { Movimiento } from '../src/movimientos/movimiento.entity.js';
import { Pdf } from '../src/pdfs/pdf.entity.js';
import { PdfsService } from '../src/pdfs/pdfs.service.js';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearMovementTables } from './utilidades/movimientos-de-prueba.js';
import { clearPdfTables, minimalPdf, notAPdf, signedPdf } from './utilidades/pdfs-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const MINIMAL = {
  fecha: '2024-03-01',
  tipo: 'resolucion',
  descripcion: 'Se dicta resolución.',
};

/** Spec 010, T13 y T14: carga y modificación de movimientos con PDF. */
describe('PDF de los movimientos: carga y modificación', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let lawyer: Usuario;
  let session: TestSession;
  let causaId: number;

  const movementsOf = () => `/api/panel/causas/${causaId}/movimientos`;
  const cookie = () => `access_token=${session.accessToken}`;
  const post = () => request(app.getHttpServer()).post(movementsOf()).set('Cookie', cookie());
  const patch = (id: number) =>
    request(app.getHttpServer()).patch(`${movementsOf()}/${id}`).set('Cookie', cookie());

  /** Un formulario con los datos en `datos` y el archivo en `pdf`. */
  const withPdf = (pedido: request.Test, datos: object, pdf: Buffer = minimalPdf()) =>
    pedido.field('datos', JSON.stringify(datos)).attach('pdf', pdf, 'escrito.pdf');

  const movement = (id: number) =>
    dataSource.getRepository(Movimiento).findOneByOrFail({ id });
  const pdfCount = () => dataSource.getRepository(Pdf).count();
  const movementCount = () => dataSource.getRepository(Movimiento).count();
  const pdfOf = (pdfId: number) => dataSource.getRepository(Pdf).findOneByOrFail({ id: pdfId });
  const changes = (movimientoId: number) =>
    dataSource
      .getRepository(CambioMovimiento)
      .find({ where: { movimientoId }, order: { id: 'ASC' } });

  /** Carga un movimiento, con PDF o sin él, y devuelve su id. */
  async function createMovement(conPdf: Buffer | null = null, pdfVisible?: boolean) {
    const datos = pdfVisible === undefined ? MINIMAL : { ...MINIMAL, pdfVisible };
    const response = conPdf ? await withPdf(post(), datos, conPdf) : await post().send(datos);
    expect(response.status).toBe(201);
    return response.body.id as number;
  }

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
    await clearTables(app);
    lawyer = await createTestUser(app, { email: 'abogado@estudio.com' });
    session = await loginAs(app, lawyer.email!);
    causaId = (await createTestCausa(app, { responsableId: lawyer.id, creadoPorId: lawyer.id })).id;
  });

  beforeEach(async () => {
    await clearMovementTables(app);
    await clearPdfTables(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('carga (T13, RF-10, RF-11, RF-16, RF-20)', () => {
    it('un movimiento con PDF nace con el PDF oculto, guardado sin cambios', async () => {
      const id = await createMovement(signedPdf());

      const guardado = await movement(id);
      expect(guardado.pdfId).not.toBeNull();
      expect(guardado.pdfVisible).toBe(false);
      const contenido = await app.get(PdfsService).findContent(guardado.pdfId!);
      expect(Buffer.compare(contenido!.contenido, signedPdf())).toBe(0);
      expect(contenido!.subidoPorId).toBe(lawyer.id);
    });

    it('con pdfVisible: true, el PDF nace visible', async () => {
      const id = await createMovement(minimalPdf(), true);

      expect((await movement(id)).pdfVisible).toBe(true);
    });

    it('pdfVisible sin archivo responde 400 "El movimiento no tiene PDF"', async () => {
      const response = await post().send({ ...MINIMAL, pdfVisible: true });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('El movimiento no tiene PDF');
      expect(await movementCount()).toBe(0);
    });

    it.each([
      ['vacío', Buffer.alloc(0), 'El archivo está vacío'],
      ['que no es un PDF', notAPdf(), 'El archivo debe ser un PDF'],
    ])('un archivo %s responde 400 y no guarda nada (RF-11)', async (_caso, archivo, mensaje) => {
      const response = await withPdf(post(), MINIMAL, archivo);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(mensaje);
      expect(await movementCount()).toBe(0);
      expect(await pdfCount()).toBe(0);
    });

    it('una descripción con "<" y un PDF válido no guarda nada (RF-11)', async () => {
      const response = await withPdf(post(), { ...MINIMAL, descripcion: 'Texto <b>' });

      expect(response.status).toBe(400);
      expect(await movementCount()).toBe(0);
      expect(await pdfCount()).toBe(0);
    });

    it('el cambio de carga registra el PDF con su código, tamaño y visibilidad (RF-21)', async () => {
      const pdf = minimalPdf();
      const id = await createMovement(pdf, true);
      const { codigo } = await pdfOf((await movement(id)).pdfId!);

      const [carga] = await changes(id);
      expect(carga.cambios.at(-1)).toEqual({
        campo: 'pdf',
        anterior: null,
        nuevo: { codigo, tamano: pdf.length, visible: true },
      });
    });

    it('una carga JSON sin PDF sigue igual que siempre', async () => {
      const id = await createMovement();

      expect(await movement(id)).toMatchObject({ pdfId: null, pdfVisible: false });
      const [carga] = await changes(id);
      expect(carga.cambios.at(-1)).toEqual({ campo: 'pdf', anterior: null, nuevo: null });
    });
  });

  describe('respuestas y descarga del panel (T16, RF-28 a RF-31, RF-37, RF-40)', () => {
    const get = (path: string) =>
      request(app.getHttpServer()).get(path).set('Cookie', cookie()).responseType('blob');
    const download = (id: number | string, causa: number | string = causaId) =>
      get(`/api/panel/causas/${causa}/movimientos/${id}/pdf`);

    it('el historial dice si cada movimiento tiene PDF y si es visible (RF-30)', async () => {
      const conPdf = await createMovement(minimalPdf(), true);
      const sinPdf = await createMovement();

      const response = await request(app.getHttpServer())
        .get(movementsOf())
        .set('Cookie', cookie())
        .expect(200);

      const porId = new Map(
        (response.body.items as { id: number; pdf: unknown }[]).map((item) => [item.id, item.pdf]),
      );
      expect(porId.get(conPdf)).toEqual({ visible: true });
      expect(porId.get(sinPdf)).toBeNull();
    });

    it('el detalle trae el PDF con su autor, marcado si está desactivado (RF-31, RF-40)', async () => {
      const otro = await createTestUser(app, { email: 'otro@estudio.com', nombre: 'Ana', apellido: 'Paz' });
      const otraSesion = await loginAs(app, otro.email!);
      const id = await createMovement();
      const pdf = minimalPdf();
      await withPdf(
        request(app.getHttpServer())
          .patch(`${movementsOf()}/${id}`)
          .set('Cookie', `access_token=${otraSesion.accessToken}`),
        {},
        pdf,
      ).expect(200);
      await dataSource.getRepository(Usuario).update(otro.id, { activo: false });

      const response = await request(app.getHttpServer())
        .get(`${movementsOf()}/${id}`)
        .set('Cookie', cookie())
        .expect(200);

      const { codigo } = await pdfOf((await movement(id)).pdfId!);
      expect(response.body.pdf).toEqual({
        codigo,
        tamano: pdf.length,
        visible: false,
        subidoPor: { id: otro.id, nombre: 'Ana', apellido: 'Paz', activo: false },
        subidoEn: expect.any(String),
      });
      expect(JSON.stringify(response.body)).not.toMatch(/contenido|email|contrasena/);
    });

    it('descarga el PDF idéntico, también el firmado, con el nombre de RF-7 (RF-5, RF-7)', async () => {
      const id = await createMovement(signedPdf());
      const { codigo } = await pdfOf((await movement(id)).pdfId!);

      const response = await download(id).expect(200);

      expect(Buffer.compare(response.body as Buffer, signedPdf())).toBe(0);
      expect(response.headers['content-disposition']).toBe(
        `attachment; filename="2024-03-01 Resolucion ${codigo}.pdf"`,
      );
    });

    it('el nombre usa los datos vigentes del movimiento', async () => {
      const id = await createMovement(minimalPdf());
      const { codigo } = await pdfOf((await movement(id)).pdfId!);
      await patch(id).send({ fecha: '2025-07-15', tipo: 'notificacion' }).expect(200);

      const response = await download(id).expect(200);

      expect(response.headers['content-disposition']).toBe(
        `attachment; filename="2025-07-15 Notificacion ${codigo}.pdf"`,
      );
    });

    it('se descarga con el movimiento anulado y con la causa desactivada (RF-22, RF-23)', async () => {
      const id = await createMovement(minimalPdf());
      await request(app.getHttpServer())
        .post(`${movementsOf()}/${id}/anular`)
        .set('Cookie', cookie())
        .expect(200);
      await download(id).expect(200);

      await dataSource.getRepository(Causa).update(causaId, { activa: false });
      try {
        await download(id).expect(200);
      } finally {
        await dataSource.getRepository(Causa).update(causaId, { activa: true });
      }
    });

    it('todos los casos sin PDF responden el mismo 404 "No existe ese PDF" (RF-37)', async () => {
      const sinPdf = await createMovement();
      const conPdf = await createMovement(minimalPdf());
      const otraCausa = await createTestCausa(app, {
        responsableId: lawyer.id,
        creadoPorId: lawyer.id,
      });

      const respuestas = [];
      for (const [movimientoId, causa] of [
        [sinPdf, causaId],
        [999_999, causaId],
        [conPdf, 999_999],
        [conPdf, otraCausa.id],
        ['abc', causaId],
        [conPdf, 'abc'],
      ] as const) {
        const response = await download(movimientoId, causa);
        respuestas.push({ status: response.status, body: (response.body as Buffer).toString() });
      }

      expect(respuestas[0].status).toBe(404);
      expect(JSON.parse(respuestas[0].body).message).toBe('No existe ese PDF');
      for (const respuesta of respuestas) expect(respuesta).toEqual(respuestas[0]);
    });
  });

  describe('anulación, causa desactivada y concurrencia (T15, RF-19, RF-22, RF-23)', () => {
    const ANNULLED = 'El movimiento está anulado. Restauralo para modificarlo';
    const annul = (id: number) =>
      request(app.getHttpServer())
        .post(`${movementsOf()}/${id}/anular`)
        .set('Cookie', cookie());
    const restore = (id: number) =>
      request(app.getHttpServer())
        .post(`${movementsOf()}/${id}/restaurar`)
        .set('Cookie', cookie());

    it('en un movimiento anulado no se puede adjuntar, reemplazar, quitar ni cambiar la visibilidad', async () => {
      const id = await createMovement(minimalPdf(), true);
      await annul(id).expect(200);

      // Funciones y no pedidos: supertest levanta el servidor al crear cada pedido.
      for (const intento of [
        () => withPdf(patch(id), {}),
        () => patch(id).send({ quitarPdf: true }),
        () => patch(id).send({ pdfVisible: false }),
      ]) {
        const response = await intento();
        expect(response.status).toBe(409);
        expect(response.body.message).toBe(ANNULLED);
      }
      expect(await pdfCount()).toBe(1);
    });

    it('al restaurarlo, el PDF conserva su visibilidad', async () => {
      const id = await createMovement(minimalPdf(), true);
      await annul(id).expect(200);

      await restore(id).expect(200);

      expect((await movement(id)).pdfVisible).toBe(true);
    });

    it('en una causa desactivada responde 409 "La causa está desactivada"', async () => {
      const id = await createMovement(minimalPdf(), true);
      await dataSource.getRepository(Causa).update(causaId, { activa: false });
      try {
        for (const intento of [
          () => withPdf(patch(id), {}),
          () => patch(id).send({ quitarPdf: true }),
          () => patch(id).send({ pdfVisible: false }),
          () => withPdf(post(), MINIMAL),
        ]) {
          const response = await intento();
          expect(response.status).toBe(409);
          expect(response.body.message).toBe('La causa está desactivada');
        }
        expect(await pdfCount()).toBe(1);
      } finally {
        await dataSource.getRepository(Causa).update(causaId, { activa: true });
      }
    });

    it('una anulación y un PDF nuevo a la vez se resuelven de a una', async () => {
      const id = await createMovement();

      const [anulacion, subida] = await Promise.all([annul(id), withPdf(patch(id), {})]);

      expect(anulacion.status).toBe(200);
      expect([200, 409]).toContain(subida.status);
      // Si la anulación quedó primero, la subida no dejó ningún PDF (RF-11, RF-22).
      expect(await pdfCount()).toBe(subida.status === 200 ? 1 : 0);
    });

    it('dos reemplazos a la vez dejan un solo PDF, con los dos cambios en el historial', async () => {
      const id = await createMovement(minimalPdf('Original'));

      const respuestas = await Promise.all([
        withPdf(patch(id), {}, minimalPdf('Uno')),
        withPdf(patch(id), {}, minimalPdf('Dos')),
      ]);

      expect(respuestas.map((r) => r.status)).toEqual([200, 200]);
      expect(await pdfCount()).toBe(1);
      expect(await changes(id)).toHaveLength(3);
    });
  });

  describe('modificación (T14, RF-13 a RF-17, RF-20, RF-21)', () => {
    it('adjunta un PDF a un movimiento que no tenía', async () => {
      const id = await createMovement();

      await withPdf(patch(id), {}).expect(200);

      const guardado = await movement(id);
      expect(guardado.pdfId).not.toBeNull();
      expect(guardado.pdfVisible).toBe(false);
      expect(guardado.modificadoPorId).toBe(lawyer.id);
    });

    it('reemplazar uno visible: el nuevo nace oculto y el anterior se borra (RF-14, RF-16)', async () => {
      const id = await createMovement(minimalPdf('Primero'), true);
      const anterior = await pdfOf((await movement(id)).pdfId!);

      await withPdf(patch(id), {}, minimalPdf('Segundo')).expect(200);

      const guardado = await movement(id);
      expect(guardado.pdfVisible).toBe(false);
      expect(guardado.pdfId).not.toBe(anterior.id);
      expect(await dataSource.getRepository(Pdf).countBy({ id: anterior.id })).toBe(0);
      expect((await pdfOf(guardado.pdfId!)).codigo).not.toBe(anterior.codigo);
      expect(await pdfCount()).toBe(1);
    });

    it('reemplazar con pdfVisible: true deja visible el nuevo', async () => {
      const id = await createMovement(minimalPdf());

      await withPdf(patch(id), { pdfVisible: true }).expect(200);

      expect((await movement(id)).pdfVisible).toBe(true);
    });

    it('quitar borra el PDF y deja pdfVisible en false', async () => {
      const id = await createMovement(minimalPdf(), true);

      await patch(id).send({ quitarPdf: true }).expect(200);

      expect(await movement(id)).toMatchObject({ pdfId: null, pdfVisible: false });
      expect(await pdfCount()).toBe(0);
    });

    it('cambia la visibilidad del PDF en los dos sentidos, con JSON', async () => {
      const id = await createMovement(minimalPdf());

      await patch(id).send({ pdfVisible: true }).expect(200);
      expect((await movement(id)).pdfVisible).toBe(true);

      await patch(id).send({ pdfVisible: false }).expect(200);
      expect((await movement(id)).pdfVisible).toBe(false);
    });

    it('pdfVisible sin PDF responde 409 "El movimiento no tiene PDF" (RF-15)', async () => {
      const id = await createMovement();

      const response = await patch(id).send({ pdfVisible: true });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('El movimiento no tiene PDF');
    });

    it('un archivo junto con quitarPdf responde 400', async () => {
      const id = await createMovement(minimalPdf());

      const response = await withPdf(patch(id), { quitarPdf: true });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('No se puede adjuntar y quitar el PDF a la vez');
    });

    it('quitarPdf sin PDF no cambia nada ni deja rastro', async () => {
      const id = await createMovement();

      await patch(id).send({ quitarPdf: true }).expect(200);

      expect((await movement(id)).modificadoEn).toBeNull();
      expect(await changes(id)).toHaveLength(1);
    });

    it('cada operación deja su cambio, sin el contenido, y no modifica la causa (RF-20, RF-21)', async () => {
      const causaAntes = await dataSource.getRepository(Causa).findOneByOrFail({ id: causaId });
      const id = await createMovement();

      await withPdf(patch(id), {}).expect(200);
      await patch(id).send({ pdfVisible: true }).expect(200);
      await withPdf(patch(id), {}, minimalPdf('Otro')).expect(200);
      await patch(id).send({ quitarPdf: true }).expect(200);

      const registro = await changes(id);
      expect(registro.map((cambio) => cambio.accion)).toEqual([
        'carga',
        'modificacion',
        'modificacion',
        'modificacion',
        'modificacion',
      ]);
      for (const cambio of registro.slice(1)) {
        expect(cambio.cambios).toHaveLength(1);
        expect(cambio.cambios[0].campo).toBe('pdf');
        expect(cambio.usuarioId).toBe(lawyer.id);
        for (const valor of [cambio.cambios[0].anterior, cambio.cambios[0].nuevo]) {
          if (valor !== null) expect(Object.keys(valor).sort()).toEqual(['codigo', 'tamano', 'visible']);
        }
      }
      expect(registro.at(-1)!.cambios[0].nuevo).toBeNull();
      const causaDespues = await dataSource.getRepository(Causa).findOneByOrFail({ id: causaId });
      expect(causaDespues.modificadoEn).toEqual(causaAntes.modificadoEn);
    });
  });
});
