import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PLAN_MESSAGES } from '../src/plan/reglas-plan.js';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const CAUSAS = '/api/panel/causas';
const NATURAL_PERSON = { rol: 'actor', tipoPersona: 'fisica', nombre: 'Juan', apellido: 'Pérez' };

/** Spec 011, RF-26: un integrante fuera del plan no se agrega a otra causa, pero sigue donde estaba. */
describe('integrantes fuera del plan en las causas', () => {
  let app: NestExpressApplication;
  let admin: Usuario;
  let lawyer: Usuario;
  let outside: Usuario;
  let session: TestSession;

  const withSession = (test: request.Test) =>
    test.set('Cookie', `access_token=${session.accessToken}`);

  beforeAll(async () => {
    app = await createTestApp({ plan: 'basico' });
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await clearTables(app);
    admin = await createTestUser(app, {
      rol: 'admin',
      esPrincipal: true,
      email: 'carla@estudio.com',
      nombre: 'Carla',
      apellido: 'Saavedra',
    });
    lawyer = await createTestUser(app, { email: 'juan@estudio.com', apellido: 'Álvarez' });
    outside = await createTestUser(app, { email: 'fuera@estudio.com', apellido: 'Fuera' });
    await app.get(DataSource).getRepository(Usuario).update(outside.id, { fueraDelPlan: true });
    session = await loginAs(app, 'carla@estudio.com');
  });

  it('al crear una causa, como responsable o colaborador, responde 409 T-14', async () => {
    for (const body of [
      { responsableId: outside.id },
      { responsableId: lawyer.id, colaboradorIds: [outside.id] },
    ]) {
      const response = await withSession(request(app.getHttpServer()).post(CAUSAS)).send({
        caratula: 'Pérez c/ Gómez',
        fuero: 'civil',
        partes: [NATURAL_PERSON],
        ...body,
      });
      if (body.colaboradorIds) {
        // El alta guarda los colaboradores válidos y rechaza el resto (spec 002, RF-7).
        expect(response.status).toBe(201);
        expect(response.body.rechazos).toEqual([
          { colaboradorId: outside.id, mensajes: [PLAN_MESSAGES.outsidePlanAccount] },
        ]);
      } else {
        expect(response.status).toBe(409);
        expect(response.body.message).toBe(PLAN_MESSAGES.outsidePlanAccount);
      }
    }
  });

  it('al cambiar los abogados de una causa, agregarlo responde 409 T-14', async () => {
    const causa = await createTestCausa(app, { responsableId: lawyer.id, creadoPorId: admin.id });

    const response = await withSession(
      request(app.getHttpServer()).put(`${CAUSAS}/${causa.id}/abogados`),
    ).send({ responsableId: lawyer.id, colaboradorIds: [outside.id] });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(PLAN_MESSAGES.outsidePlanAccount);
  });

  it('donde ya figuraba, la causa se modifica sin quitarlo y se lo sigue mostrando', async () => {
    const causa = await createTestCausa(app, {
      responsableId: outside.id,
      creadoPorId: admin.id,
      colaboradorIds: [lawyer.id],
    });

    const response = await withSession(
      request(app.getHttpServer()).put(`${CAUSAS}/${causa.id}/abogados`),
    ).send({ responsableId: outside.id, colaboradorIds: [] });
    expect(response.status).toBe(200);

    const detail = await withSession(request(app.getHttpServer()).get(`${CAUSAS}/${causa.id}`));
    expect(detail.body.responsable).toMatchObject({ id: outside.id, apellido: 'Fuera' });
  });

  it('el listado de integrantes lo incluye, con la marca, para mostrarlo donde ya figura', async () => {
    const response = await withSession(
      request(app.getHttpServer()).get(`${CAUSAS}/integrantes`),
    ).expect(200);

    expect(response.body).toContainEqual(
      expect.objectContaining({ id: outside.id, fueraDelPlan: true }),
    );
  });
});
