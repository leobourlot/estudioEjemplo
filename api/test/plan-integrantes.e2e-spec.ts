import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PLAN_MESSAGES } from '../src/plan/reglas-plan.js';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser, TEST_PASSWORD } from './utilidades/datos-de-prueba.js';
import {
  loginAs,
  loginDocument,
  nextTestIp,
  type TestSession,
} from './utilidades/sesion-de-prueba.js';

const USERS = '/api/panel/usuarios';
const TEMPORARY_PASSWORD = 'clave temporal 2026';

let dniCounter = 0;
const lawyerData = (email: string) => ({
  rol: 'abogado',
  email,
  dni: String(26_000_000 + ++dniCounter),
  nombre: 'Marcos',
  apellido: 'Díaz',
  contrasenaTemporal: TEMPORARY_PASSWORD,
});
const clientData = () => ({
  rol: 'cliente',
  email: `cliente${++dniCounter}@correo.com`,
  nombre: 'Ana',
  apellido: 'Gómez',
  contrasenaTemporal: TEMPORARY_PASSWORD,
  cliente: { tipoPersona: 'fisica', dni: String(31_000_000 + dniCounter) },
});

/** Spec 011, RF-17 a RF-19 y RF-22 a RF-24: integrantes con el plan Básico. */
describe('integrantes con el plan Básico', () => {
  let app: NestExpressApplication;
  let principal: Usuario;
  let session: TestSession;

  const server = () => app.getHttpServer();
  const repo = () => app.get(DataSource).getRepository(Usuario);
  const post = (path: string, body: object = {}, as = session) =>
    request(server()).post(path).set('Cookie', `access_token=${as.accessToken}`).send(body);
  const enabledCount = () =>
    repo()
      .createQueryBuilder('u')
      .where("u.rol IN ('admin','abogado') AND u.activo = 1 AND u.fueraDelPlan = 0")
      .getCount();
  const outsideLawyer = async (email: string) => {
    const usuario = await createTestUser(app, { rol: 'abogado', email });
    await repo().update(usuario.id, { fueraDelPlan: true });
    return usuario;
  };

  beforeAll(async () => {
    app = await createTestApp({ plan: 'basico' });
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await clearTables(app);
    principal = await createTestUser(app, {
      rol: 'admin',
      esPrincipal: true,
      email: 'principal@estudio.com',
    });
    session = await loginAs(app, 'principal@estudio.com');
  });

  describe('límite de 2 habilitados (RF-17, RF-18)', () => {
    it('con 1 habilitado se crea un abogado; el tercero responde 409 T-5 sin guardar', async () => {
      expect((await post(USERS, lawyerData('segundo@estudio.com'))).status).toBe(201);

      const third = await post(USERS, lawyerData('tercero@estudio.com'));

      expect(third.status).toBe(409);
      expect(third.body.message).toBe(PLAN_MESSAGES.staffLimit);
      expect(await repo().countBy({ email: 'tercero@estudio.com' })).toBe(0);
    });

    it('con 2 habilitados se crea un cliente (RF-19)', async () => {
      await createTestUser(app, { rol: 'abogado', email: 'segundo@estudio.com' });

      expect((await post(USERS, clientData())).status).toBe(201);
    });

    it('las cuentas con cambio pendiente cuentan; las desactivadas y las fuera del plan no', async () => {
      await createTestUser(app, { email: 'pendiente@estudio.com', debeCambiarContrasena: true });
      expect((await post(USERS, lawyerData('nuevo@estudio.com'))).status).toBe(409);

      await repo().update({ email: 'pendiente@estudio.com' }, { activo: false });
      await outsideLawyer('fuera@estudio.com');
      expect((await post(USERS, lawyerData('nuevo2@estudio.com'))).status).toBe(201);
    });

    it('reactivar un integrante con 2 habilitados responde T-5, con 1 se reactiva', async () => {
      const inactive = await createTestUser(app, { email: 'inactivo@estudio.com', activo: false });
      const second = await createTestUser(app, { email: 'segundo@estudio.com' });
      const body = { contrasenaTemporal: TEMPORARY_PASSWORD };

      const rejected = await post(`${USERS}/${inactive.id}/reactivar`, body);
      expect(rejected.status).toBe(409);
      expect(rejected.body.message).toBe(PLAN_MESSAGES.staffLimit);

      await repo().update(second.id, { activo: false });
      expect((await post(`${USERS}/${inactive.id}/reactivar`, body)).status).toBe(204);
    });

    it('cambiar el rol de un habilitado entre administrador y abogado se permite', async () => {
      const second = await createTestUser(app, { email: 'segundo@estudio.com' });

      const response = await request(server())
        .patch(`${USERS}/${second.id}`)
        .set('Cookie', `access_token=${session.accessToken}`)
        .send({ rol: 'admin' });

      expect(response.status).toBe(200);
    });

    it('dos altas simultáneas con 1 habilitado dejan exactamente 2', async () => {
      const results = await Promise.all([
        post(USERS, lawyerData('a@estudio.com')),
        post(USERS, lawyerData('b@estudio.com')),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(await enabledCount()).toBe(2);
    });

    it('un alta de cliente simultánea con altas de integrantes también se guarda', async () => {
      const results = await Promise.all([
        post(USERS, lawyerData('a@estudio.com')),
        post(USERS, clientData()),
        post(USERS, lawyerData('b@estudio.com')),
      ]);

      expect(results[1].status).toBe(201);
      expect(await enabledCount()).toBe(2);
    });
  });

  describe('cuentas fuera del plan (RF-22 a RF-24)', () => {
    it('solo se consultan, desactivan o habilitan; lo demás responde T-14 sin cambios', async () => {
      const outside = await outsideLawyer('fuera@estudio.com');
      const before = await repo().findOneByOrFail({ id: outside.id });

      const responses = [
        await request(server())
          .patch(`${USERS}/${outside.id}`)
          .set('Cookie', `access_token=${session.accessToken}`)
          .send({ nombre: 'Otro' }),
        await request(server())
          .patch(`${USERS}/${outside.id}`)
          .set('Cookie', `access_token=${session.accessToken}`)
          .send({ rol: 'admin' }),
        await post(`${USERS}/${outside.id}/restablecer-contrasena`, {
          contrasenaTemporal: TEMPORARY_PASSWORD,
        }),
        await post(`${USERS}/${outside.id}/liberar-email`),
      ];
      for (const response of responses) {
        expect(response.status).toBe(409);
        expect(response.body.message).toBe(PLAN_MESSAGES.outsidePlanAccount);
      }
      expect(await repo().findOneByOrFail({ id: outside.id })).toEqual(before);

      const view = await request(server())
        .get(`${USERS}/${outside.id}`)
        .set('Cookie', `access_token=${session.accessToken}`);
      expect(view.status).toBe(200);
      expect(view.body.fueraDelPlan).toBe(true);
    });

    it('el principal no puede transferirle su condición a un administrador fuera del plan', async () => {
      const outside = await createTestUser(app, { rol: 'admin', email: 'admin@estudio.com' });
      await repo().update(outside.id, { fueraDelPlan: true });

      const response = await post(`${USERS}/${outside.id}/transferir-principal`);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe(PLAN_MESSAGES.outsidePlanAccount);
    });

    it('desactivar una cuenta fuera del plan le quita la marca', async () => {
      const outside = await outsideLawyer('fuera@estudio.com');

      expect((await post(`${USERS}/${outside.id}/desactivar`)).status).toBe(204);

      expect(await repo().findOneByOrFail({ id: outside.id })).toMatchObject({
        activo: false,
        fueraDelPlan: false,
      });
    });

    it('desactivar a un habilitado no habilita a nadie (RF-24)', async () => {
      const second = await createTestUser(app, { email: 'segundo@estudio.com' });
      const outside = await outsideLawyer('fuera@estudio.com');

      await post(`${USERS}/${second.id}/desactivar`);

      expect((await repo().findOneByOrFail({ id: outside.id })).fueraDelPlan).toBe(true);
    });
  });

  describe('Habilitar en el plan (RF-23)', () => {
    it('con 1 habilitado quita la marca, conserva la contraseña y la cuenta ingresa', async () => {
      const outside = await outsideLawyer('fuera@estudio.com');
      const hashBefore = (
        await repo().findOneOrFail({
          where: { id: outside.id },
          select: { id: true, contrasenaHash: true },
        })
      ).contrasenaHash;

      expect((await post(`${USERS}/${outside.id}/habilitar`)).status).toBe(204);

      const after = await repo().findOneOrFail({
        where: { id: outside.id },
        select: { id: true, contrasenaHash: true, fueraDelPlan: true, modificadoPorId: true },
      });
      expect(after).toMatchObject({
        fueraDelPlan: false,
        contrasenaHash: hashBefore,
        modificadoPorId: principal.id,
      });
      const login = await request(server())
        .post('/api/sesion/ingresar')
        .set('X-Forwarded-For', nextTestIp())
        .send({ documento: loginDocument(outside), contrasena: TEST_PASSWORD });
      expect(login.status).toBe(200);
    });

    it('con 2 habilitados responde T-5; sin la marca, "La cuenta no está fuera del plan"', async () => {
      const second = await createTestUser(app, { email: 'segundo@estudio.com' });
      const outside = await outsideLawyer('fuera@estudio.com');

      const full = await post(`${USERS}/${outside.id}/habilitar`);
      expect(full.status).toBe(409);
      expect(full.body.message).toBe(PLAN_MESSAGES.staffLimit);

      const notOutside = await post(`${USERS}/${second.id}/habilitar`);
      expect(notOutside.status).toBe(409);
      expect(notOutside.body.message).toBe(PLAN_MESSAGES.notOutsidePlan);
    });

    it('un abogado recibe 403 y un visitante 401', async () => {
      const lawyer = await createTestUser(app, { email: 'segundo@estudio.com' });
      const outside = await outsideLawyer('fuera@estudio.com');
      const lawyerSession = await loginAs(app, lawyer.email!);

      expect((await post(`${USERS}/${outside.id}/habilitar`, {}, lawyerSession)).status).toBe(403);
      expect((await request(server()).post(`${USERS}/${outside.id}/habilitar`)).status).toBe(401);
    });

    it('dos habilitaciones simultáneas con 1 habilitado dejan exactamente 2', async () => {
      const first = await outsideLawyer('fuera1@estudio.com');
      const second = await outsideLawyer('fuera2@estudio.com');

      const results = await Promise.all([
        post(`${USERS}/${first.id}/habilitar`),
        post(`${USERS}/${second.id}/habilitar`),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([204, 409]);
      expect(await enabledCount()).toBe(2);
    });
  });

  describe('listado (RF-22)', () => {
    it('el filtro fueraDelPlan=true devuelve solo las cuentas activas con la marca', async () => {
      const outside = await outsideLawyer('fuera@estudio.com');
      await createTestUser(app, { email: 'segundo@estudio.com' });

      const response = await request(server())
        .get(`${USERS}?fueraDelPlan=true`)
        .set('Cookie', `access_token=${session.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items.map((u: { id: number }) => u.id)).toEqual([outside.id]);
      expect(response.body.items[0].fueraDelPlan).toBe(true);
    });

    it('un valor distinto de true responde 400', async () => {
      const response = await request(server())
        .get(`${USERS}?fueraDelPlan=false`)
        .set('Cookie', `access_token=${session.accessToken}`);

      expect(response.status).toBe(400);
    });

    it('el listado sin filtro trae fueraDelPlan en cada cuenta', async () => {
      const response = await request(server())
        .get(USERS)
        .set('Cookie', `access_token=${session.accessToken}`);

      expect(response.body.items[0]).toHaveProperty('fueraDelPlan', false);
    });
  });
});

/** Spec 011, RF-6: con el plan Premium no hay límite. */
describe('integrantes con el plan Premium', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  it('se crea un tercer integrante', async () => {
    await clearTables(app);
    await createTestUser(app, { rol: 'admin', esPrincipal: true, email: 'principal@estudio.com' });
    await createTestUser(app, { email: 'segundo@estudio.com' });
    const session = await loginAs(app, 'principal@estudio.com');

    const response = await request(app.getHttpServer())
      .post(USERS)
      .set('Cookie', `access_token=${session.accessToken}`)
      .send(lawyerData('tercero@estudio.com'));

    expect(response.status).toBe(201);
  });
});
