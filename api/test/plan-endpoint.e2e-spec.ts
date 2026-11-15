import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterEach, describe, expect, it } from 'vitest';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { BYTES_PER_GB, type Plan } from '../src/plan/reglas-plan.js';
import { createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestClient, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearPdfTables, minimalPdf } from './utilidades/pdfs-de-prueba.js';
import { loginAs } from './utilidades/sesion-de-prueba.js';

const PLAN = '/api/panel/plan';

/** Spec 011, RF-31 y RF-32: el plan para el panel, solo para integrantes. */
describe('GET /api/panel/plan', () => {
  let app: NestExpressApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  const start = async (plan: Plan) => {
    app = await createTestApp({ plan });
    await clearPdfTables(app);
    const admin = await createTestUser(app, {
      rol: 'admin',
      esPrincipal: true,
      email: 'admin@estudio.com',
    });
    await createTestUser(app, { email: 'abogado@estudio.com' });
    const outside = await createTestUser(app, { email: 'fuera@estudio.com' });
    await app.get(DataSource).getRepository(Usuario).update(outside.id, { fueraDelPlan: true });
    const client = await createTestClient(app);
    return { admin, client };
  };
  const get = (token?: string) => {
    const test = request(app!.getHttpServer()).get(PLAN);
    return token ? test.set('Cookie', `access_token=${token}`) : test;
  };

  it('con el plan Básico, los integrantes habilitados, igual para administrador y abogado', async () => {
    await start('basico');

    for (const email of ['admin@estudio.com', 'abogado@estudio.com']) {
      const response = await get((await loginAs(app!, email)).accessToken).expect(200);
      expect(response.body).toEqual({
        plan: 'basico',
        integrantes: { habilitados: 2, maximo: 2 },
        espacioPdf: null,
      });
    }
  });

  it('con el plan Premium, el espacio usado y el total', async () => {
    const { admin } = await start('premium');
    const pdf = minimalPdf();
    await app!
      .get(DataSource)
      .query(
        'INSERT INTO pdfs (contenido, tamano, codigo, subidoPorId, subidoEn) VALUES (?, ?, ?, ?, NOW(6))',
        [pdf, 12_345, 'PLAN01', admin.id],
      );

    const response = await get((await loginAs(app!, 'abogado@estudio.com')).accessToken).expect(
      200,
    );

    expect(response.body).toEqual({
      plan: 'premium',
      integrantes: null,
      espacioPdf: { usadoBytes: 12_345, totalBytes: 10 * BYTES_PER_GB },
    });
  });

  it('un cliente recibe 403 y un visitante 401', async () => {
    const { client } = await start('basico');

    expect((await get((await loginAs(app!, client.email!)).accessToken)).status).toBe(403);
    expect((await get()).status).toBe(401);
  });

  it('la respuesta de la sesión no trae el plan', async () => {
    await start('basico');
    const token = (await loginAs(app!, 'admin@estudio.com')).accessToken;

    const response = await request(app!.getHttpServer())
      .get('/api/sesion/usuario')
      .set('Cookie', `access_token=${token}`)
      .expect(200);

    expect(JSON.stringify(response.body)).not.toMatch(/plan|espacio/i);
  });
});
