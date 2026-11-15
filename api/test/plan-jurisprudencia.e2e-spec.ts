import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { Fallo } from '../src/jurisprudencia/fallo.entity.js';
import type { Plan } from '../src/plan/reglas-plan.js';
import { PLAN_MESSAGES } from '../src/plan/reglas-plan.js';
import { createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestClient, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearRulingTables, createTestFallo } from './utilidades/fallos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const RULINGS = '/api/panel/jurisprudencia';
const FORBIDDEN = 'No tenés permiso para realizar esta acción';

type Method = 'get' | 'post' | 'patch';

const VALID_RULING = {
  caratula: 'Carátula del plan',
  tribunal: 'CNCiv., Sala A',
  fuero: 'civil',
  fecha: '2019-05-03',
  sumario: 'Sumario.',
  palabrasClave: ['plan'],
};

/** Spec 011, RF-4, RF-8 y RF-9: la jurisprudencia con cada plan. */
describe('jurisprudencia según el plan', () => {
  let app: NestExpressApplication | undefined;

  const boot = async (plan: Plan, keepTables = true) => {
    await app?.close();
    app = await createTestApp({ plan, keepTables });
  };

  const call = (method: Method, path: string, body?: object, session?: TestSession) => {
    let test = request(app!.getHttpServer())[method](path);
    if (session) test = test.set('Cookie', `access_token=${session.accessToken}`);
    return body ? test.send(body) : test;
  };

  /** Todos los endpoints, también con ids que no existen o no son números. */
  const endpoints = (falloId: number): [Method, string, object?][] => [
    ['get', RULINGS],
    ['get', `${RULINGS}?buscar=plan`],
    ['get', `${RULINGS}/palabras-clave?buscar=pl`],
    ['get', `${RULINGS}/${falloId}`],
    ['get', `${RULINGS}/999999`],
    ['get', `${RULINGS}/abc`],
    ['get', `${RULINGS}/${falloId}/pdf`],
    ['get', `${RULINGS}/999999/pdf`],
    ['post', RULINGS, VALID_RULING],
    ['patch', `${RULINGS}/${falloId}`, { sumario: 'Cambio.' }],
    ['post', `${RULINGS}/${falloId}/desactivar`],
    ['post', `${RULINGS}/${falloId}/reactivar`, {}],
  ];

  const rulings = () =>
    app!
      .get(DataSource)
      .getRepository(Fallo)
      .find({ order: { id: 'ASC' } });

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('con el plan Básico cada endpoint responde 403 T-4 y la base no cambia', async () => {
    await boot('premium', false);
    await clearRulingTables(app!);
    const lawyer = await createTestUser(app!, { email: 'juan@estudio.com' });
    const fallo = await createTestFallo(app!, { creadoPorId: lawyer.id });
    await boot('basico');
    const session = await loginAs(app!, 'juan@estudio.com');
    const before = await rulings();

    for (const [method, path, body] of endpoints(fallo.id)) {
      const response = await call(method, path, body, session);
      expect(response.status, `${method} ${path}`).toBe(403);
      expect(response.body.message, `${method} ${path}`).toBe(PLAN_MESSAGES.featureNotIncluded);
    }
    expect(await rulings()).toEqual(before);
  });

  it('con el plan Básico, un visitante recibe 401 y un cliente el 403 de rol, no T-4', async () => {
    await boot('basico', false);
    const client = await createTestClient(app!);
    const clientSession = await loginAs(app!, client.email!);

    const anonymous = await call('get', RULINGS);
    expect(anonymous.status).toBe(401);

    const asClient = await call('get', RULINGS, undefined, clientSession);
    expect(asClient.status).toBe(403);
    expect(asClient.body.message).toBe(FORBIDDEN);
  });

  it('los fallos se ven igual después de pasar por el plan Básico y volver al Premium (RF-9)', async () => {
    await boot('premium', false);
    await clearRulingTables(app!);
    const lawyer = await createTestUser(app!, { email: 'juan@estudio.com' });
    const fallo = await createTestFallo(app!, { creadoPorId: lawyer.id });
    let session = await loginAs(app!, 'juan@estudio.com');
    const before = (await call('get', `${RULINGS}/${fallo.id}`, undefined, session)).body;

    await boot('basico');
    await boot('premium');
    session = await loginAs(app!, 'juan@estudio.com');
    const after = await call('get', `${RULINGS}/${fallo.id}`, undefined, session);

    expect(after.status).toBe(200);
    expect(after.body).toEqual(before);
  });
});
