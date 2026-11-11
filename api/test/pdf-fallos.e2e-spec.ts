import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Fallo } from '../src/jurisprudencia/fallo.entity.js';
import { Pdf } from '../src/pdfs/pdf.entity.js';
import { PdfsService } from '../src/pdfs/pdfs.service.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { clearRulingTables } from './utilidades/fallos-de-prueba.js';
import { clearPdfTables, minimalPdf, notAPdf, signedPdf } from './utilidades/pdfs-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const RULINGS = '/api/panel/jurisprudencia';

const BASE = {
  caratula: 'Muñoz c/ Clínica del Sur s/ daños',
  tribunal: 'Cámara Civil, Sala B',
  fuero: 'civil',
  fecha: '2020-08-14',
  numero: '5678/2019',
  sumario: 'Responsabilidad médica por falta de consentimiento informado.',
  palabrasClave: ['mala praxis'],
};

/** Spec 010, T17 y T18: el PDF de los fallos. */
describe('PDF de los fallos', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let lawyer: Usuario;
  let session: TestSession;
  let client: TestSession;
  let numero = 0;

  const cookie = () => `access_token=${session.accessToken}`;
  const post = () => request(app.getHttpServer()).post(RULINGS).set('Cookie', cookie());
  const patch = (id: number) =>
    request(app.getHttpServer()).patch(`${RULINGS}/${id}`).set('Cookie', cookie());
  const download = (id: number | string, sesion: TestSession = session) =>
    request(app.getHttpServer())
      .get(`${RULINGS}/${id}/pdf`)
      .set('Cookie', `access_token=${sesion.accessToken}`)
      .responseType('blob');

  const withPdf = (pedido: request.Test, datos: object, pdf: Buffer = minimalPdf()) =>
    pedido.field('datos', JSON.stringify(datos)).attach('pdf', pdf, 'fallo.pdf');

  const ruling = (id: number) => dataSource.getRepository(Fallo).findOneByOrFail({ id });
  const pdfCount = () => dataSource.getRepository(Pdf).count();
  const pdfOf = (id: number) => dataSource.getRepository(Pdf).findOneByOrFail({ id });

  /** Un fallo único (otra carátula y otro número) para no disparar el aviso de repetido. */
  const unique = () => {
    numero++;
    return { ...BASE, caratula: `${BASE.caratula} ${numero}`, numero: `${numero}/2024` };
  };

  async function createRuling(pdf: Buffer | null = null) {
    const response = pdf ? await withPdf(post(), unique(), pdf) : await post().send(unique());
    expect(response.status).toBe(201);
    return response.body.id as number;
  }

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
    await clearTables(app);
    lawyer = await createTestUser(app, { email: 'abogado@estudio.com' });
    session = await loginAs(app, lawyer.email!);
    await createTestUser(app, {
      email: 'cliente@correo.com',
      rol: 'cliente',
      cliente: { tipoPersona: 'fisica', dni: '30111222' },
    });
    client = await loginAs(app, 'cliente@correo.com');
  });

  beforeEach(async () => {
    await clearRulingTables(app);
    await clearPdfTables(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('carga, modificación y repetido (T17, RF-24, RF-25)', () => {
    it('carga un fallo con PDF, guardado sin cambios', async () => {
      const id = await createRuling(signedPdf());

      const fallo = await ruling(id);
      expect(fallo.pdfId).not.toBeNull();
      const contenido = await app.get(PdfsService).findContent(fallo.pdfId!);
      expect(Buffer.compare(contenido!.contenido, signedPdf())).toBe(0);
    });

    it('adjuntar, reemplazar y quitar modifican el fallo y borran el PDF anterior', async () => {
      const id = await createRuling();

      await withPdf(patch(id), {}).expect(200);
      const primero = (await ruling(id)).pdfId!;
      expect((await ruling(id)).modificadoPorId).toBe(lawyer.id);

      await withPdf(patch(id), {}, minimalPdf('Otro')).expect(200);
      const segundo = (await ruling(id)).pdfId!;
      expect(segundo).not.toBe(primero);
      expect(await dataSource.getRepository(Pdf).countBy({ id: primero })).toBe(0);

      await patch(id).send({ quitarPdf: true }).expect(200);
      expect((await ruling(id)).pdfId).toBeNull();
      expect(await pdfCount()).toBe(0);
    });

    it('un archivo junto con quitarPdf responde 400', async () => {
      const id = await createRuling(minimalPdf());

      const response = await withPdf(patch(id), { quitarPdf: true });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('No se puede adjuntar y quitar el PDF a la vez');
    });

    it('la pregunta de repetido no deja nada guardado; al confirmar, se guarda con el archivo', async () => {
      await post().send(BASE).expect(201);

      const pregunta = await withPdf(post(), BASE);
      expect(pregunta.status).toBe(409);
      expect(pregunta.body.codigo).toBe('FALLO_REPETIDO');
      expect(await pdfCount()).toBe(0);
      expect(await dataSource.getRepository(Fallo).count()).toBe(1);

      const confirmado = await withPdf(post(), { ...BASE, confirmarRepetido: true });
      expect(confirmado.status).toBe(201);
      expect((await ruling(confirmado.body.id)).pdfId).not.toBeNull();
    });

    it('dos fallos con el mismo PDF no disparan la pregunta, ni adjuntar un PDF (RF-25)', async () => {
      const pdf = minimalPdf('El mismo');
      await createRuling(pdf);
      await createRuling(pdf);
      const sinPdf = await createRuling();

      await withPdf(patch(sinPdf), {}, pdf).expect(200);
    });

    it('un archivo inválido no deja el fallo guardado', async () => {
      const response = await withPdf(post(), unique(), notAPdf());

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('El archivo debe ser un PDF');
      expect(await dataSource.getRepository(Fallo).count()).toBe(0);
      expect(await pdfCount()).toBe(0);
    });
  });

  describe('desactivado, respuestas y descarga (T18, RF-26, RF-27, RF-32)', () => {
    it('un fallo desactivado responde 409 al cambiar el PDF, pero se descarga', async () => {
      const id = await createRuling(minimalPdf());
      await request(app.getHttpServer())
        .post(`${RULINGS}/${id}/desactivar`)
        .set('Cookie', cookie())
        .expect(200);

      for (const intento of [
        () => withPdf(patch(id), {}),
        () => patch(id).send({ quitarPdf: true }),
      ]) {
        const response = await intento();
        expect(response.status).toBe(409);
        expect(response.body.message).toBe('El fallo está desactivado. Reactivalo para modificarlo');
      }
      await download(id).expect(200);
      expect(await pdfCount()).toBe(1);
    });

    it('el listado tiene tienePdf y la ficha los datos del PDF, sin el contenido', async () => {
      const pdf = minimalPdf();
      const conPdf = await createRuling(pdf);
      const sinPdf = await createRuling();

      const listado = await request(app.getHttpServer()).get(RULINGS).set('Cookie', cookie()).expect(200);
      const porId = new Map(
        (listado.body.items as { id: number; tienePdf: boolean }[]).map((i) => [i.id, i.tienePdf]),
      );
      expect(porId.get(conPdf)).toBe(true);
      expect(porId.get(sinPdf)).toBe(false);

      const ficha = await request(app.getHttpServer())
        .get(`${RULINGS}/${conPdf}`)
        .set('Cookie', cookie())
        .expect(200);
      const { codigo } = await pdfOf((await ruling(conPdf)).pdfId!);
      expect(ficha.body.pdf).toEqual({
        codigo,
        tamano: pdf.length,
        subidoPor: { id: lawyer.id, nombre: lawyer.nombre, apellido: lawyer.apellido, activo: true },
        subidoEn: expect.any(String),
      });
      expect(JSON.stringify(ficha.body)).not.toMatch(/contenido|email|contrasena/);
    });

    it('la descarga trae el PDF idéntico con el nombre "Fallo aaaa-mm-dd código.pdf" (RF-7)', async () => {
      const id = await createRuling(signedPdf());
      const { codigo } = await pdfOf((await ruling(id)).pdfId!);

      const response = await download(id).expect(200);

      expect(Buffer.compare(response.body as Buffer, signedPdf())).toBe(0);
      expect(response.headers['content-disposition']).toBe(
        `attachment; filename="Fallo 2020-08-14 ${codigo}.pdf"`,
      );
    });

    it('fallo inexistente, sin PDF o con id no numérico: el mismo 404 "No existe ese PDF"', async () => {
      const sinPdf = await createRuling();

      const respuestas = [];
      for (const id of [sinPdf, 999_999, 'abc']) {
        const response = await download(id);
        respuestas.push({ status: response.status, body: (response.body as Buffer).toString() });
      }

      expect(respuestas[0].status).toBe(404);
      expect(JSON.parse(respuestas[0].body).message).toBe('No existe ese PDF');
      for (const respuesta of respuestas) expect(respuesta).toEqual(respuestas[0]);
    });

    it('un cliente recibe 403 al pedir el PDF de un fallo (RF-27)', async () => {
      const id = await createRuling(minimalPdf());

      const response = await download(id, client);

      expect(response.status).toBe(403);
      expect((response.body as Buffer).toString()).not.toContain('%PDF');
    });
  });
});
