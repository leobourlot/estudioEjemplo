import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DNIS_CUENTAS_DEMO } from '../src/demo/cuentas-demo.js';
import { DEMO_ACCOUNT_MESSAGE } from '../src/demo/proteccion-demo.service.js';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser, TEST_PASSWORD } from './utilidades/datos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

// El modo demo se enciende antes de importar AppModule: ConfigModule lee el entorno al
// importarse, y las variables del proceso tienen prioridad sobre las de .env.test.
vi.hoisted(() => {
  process.env.MODO_DEMO = 'true';
});

const USERS = '/api/panel/usuarios';
const TEMPORARY_PASSWORD = 'clave temporal 2026';
const NEW_PASSWORD = 'clave nueva de la demo 2026';
const [ADMIN_DNI, LAWYER_DNI, CLIENT_DNI] = DNIS_CUENTAS_DEMO;

/** Spec 009, RF-19: con el modo demo, la api no deja modificar las tres cuentas de prueba. */
describe('protección de las cuentas de prueba en modo demo', () => {
  let app: NestExpressApplication;
  let principal: Usuario;
  let demoAdmin: Usuario;
  let demoLawyer: Usuario;
  let demoClient: Usuario;
  let otherAdmin: Usuario;
  let otherLawyer: Usuario;
  let otherClient: Usuario;
  let session: TestSession;

  beforeAll(async () => {
    app = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    delete process.env.MODO_DEMO;
  });

  beforeEach(async () => {
    await clearTables(app);
    // La principal no es de prueba: así se puede probar cada acción sobre las dos clases de cuenta.
    principal = await createTestUser(app, {
      rol: 'admin',
      esPrincipal: true,
      email: 'principal@estudio.com',
      dni: '20999888',
    });
    demoAdmin = await createTestUser(app, {
      rol: 'admin',
      email: 'administradora@demo.test',
      dni: ADMIN_DNI,
    });
    demoLawyer = await createTestUser(app, { email: 'abogado@demo.test', dni: LAWYER_DNI });
    demoClient = await createTestUser(app, {
      rol: 'cliente',
      email: 'cliente@demo.test',
      cliente: { tipoPersona: 'fisica', dni: CLIENT_DNI },
    });
    otherAdmin = await createTestUser(app, {
      rol: 'admin',
      email: 'otra.admin@estudio.com',
      dni: '20111333',
    });
    otherLawyer = await createTestUser(app, { email: 'juan@estudio.com', dni: '20111222' });
    otherClient = await createTestUser(app, {
      rol: 'cliente',
      email: 'ana@correo.com',
      cliente: { tipoPersona: 'fisica', dni: '30123456' },
    });
    session = await loginAs(app, 'principal@estudio.com');
  }, 60_000);

  const server = () => app.getHttpServer();
  const as = (call: request.Test, actor: TestSession = session) =>
    call.set('Cookie', `access_token=${actor.accessToken}`);
  const reload = (id: number) =>
    app
      .get(DataSource)
      .getRepository(Usuario)
      .findOneOrFail({
        where: { id },
        select: {
          id: true,
          nombre: true,
          email: true,
          activo: true,
          esPrincipal: true,
          contrasenaHash: true,
          debeCambiarContrasena: true,
        },
      });
  const setInactive = (id: number) =>
    app.get(DataSource).getRepository(Usuario).update(id, { activo: false });

  function expectDemoRejection(response: request.Response) {
    expect(response.status).toBe(403);
    expect([response.body.message].flat()).toEqual([DEMO_ACCOUNT_MESSAGE]);
  }

  describe('PATCH /api/panel/usuarios/:id', () => {
    it('rechaza modificar una cuenta de prueba y no cambia nada', async () => {
      for (const cuenta of [demoAdmin, demoLawyer, demoClient]) {
        const before = await reload(cuenta.id);
        const response = await as(request(server()).patch(`${USERS}/${cuenta.id}`)).send({
          nombre: 'Otro nombre',
        });

        expectDemoRejection(response);
        expect(await reload(cuenta.id)).toEqual(before);
      }
    });

    it('modifica las demás cuentas como siempre', async () => {
      await as(request(server()).patch(`${USERS}/${otherLawyer.id}`))
        .send({ nombre: 'Otro nombre' })
        .expect(200);

      expect((await reload(otherLawyer.id)).nombre).toBe('Otro nombre');
    });
  });

  describe('POST /api/panel/usuarios/:id/desactivar', () => {
    it('rechaza desactivar una cuenta de prueba', async () => {
      expectDemoRejection(await as(request(server()).post(`${USERS}/${demoLawyer.id}/desactivar`)));

      expect((await reload(demoLawyer.id)).activo).toBe(true);
    });

    it('desactiva las demás cuentas como siempre', async () => {
      await as(request(server()).post(`${USERS}/${otherLawyer.id}/desactivar`)).expect(204);

      expect((await reload(otherLawyer.id)).activo).toBe(false);
    });
  });

  describe('POST /api/panel/usuarios/:id/reactivar', () => {
    it('rechaza reactivar una cuenta de prueba desactivada antes del modo demo', async () => {
      await setInactive(demoLawyer.id);
      const before = await reload(demoLawyer.id);

      const response = await as(request(server()).post(`${USERS}/${demoLawyer.id}/reactivar`)).send(
        { contrasenaTemporal: TEMPORARY_PASSWORD },
      );

      expectDemoRejection(response);
      expect(await reload(demoLawyer.id)).toEqual(before);
    });

    it('reactiva las demás cuentas como siempre', async () => {
      await setInactive(otherLawyer.id);

      await as(request(server()).post(`${USERS}/${otherLawyer.id}/reactivar`))
        .send({ contrasenaTemporal: TEMPORARY_PASSWORD })
        .expect(204);

      expect((await reload(otherLawyer.id)).activo).toBe(true);
    });
  });

  describe('POST /api/panel/usuarios/:id/restablecer-contrasena', () => {
    it('rechaza restablecer la contraseña de una cuenta de prueba', async () => {
      const before = await reload(demoClient.id);

      const response = await as(
        request(server()).post(`${USERS}/${demoClient.id}/restablecer-contrasena`),
      ).send({ contrasenaTemporal: TEMPORARY_PASSWORD });

      expectDemoRejection(response);
      expect(await reload(demoClient.id)).toEqual(before);
    });

    it('restablece la de las demás cuentas como siempre', async () => {
      await as(request(server()).post(`${USERS}/${otherClient.id}/restablecer-contrasena`))
        .send({ contrasenaTemporal: TEMPORARY_PASSWORD })
        .expect(204);

      expect((await reload(otherClient.id)).debeCambiarContrasena).toBe(true);
    });
  });

  describe('POST /api/panel/usuarios/:id/liberar-email', () => {
    it('rechaza liberar el email de una cuenta de prueba desactivada antes del modo demo', async () => {
      await setInactive(demoLawyer.id);

      expectDemoRejection(
        await as(request(server()).post(`${USERS}/${demoLawyer.id}/liberar-email`)),
      );

      expect((await reload(demoLawyer.id)).email).toBe('abogado@demo.test');
    });

    it('libera el de las demás cuentas como siempre', async () => {
      await setInactive(otherLawyer.id);

      await as(request(server()).post(`${USERS}/${otherLawyer.id}/liberar-email`)).expect(204);

      expect((await reload(otherLawyer.id)).email).toBeNull();
    });
  });

  describe('POST /api/panel/usuarios/:id/transferir-principal', () => {
    it('rechaza transferirla a una cuenta de prueba', async () => {
      expectDemoRejection(
        await as(request(server()).post(`${USERS}/${demoAdmin.id}/transferir-principal`)),
      );

      expect((await reload(principal.id)).esPrincipal).toBe(true);
      expect((await reload(demoAdmin.id)).esPrincipal).toBe(false);
    });

    it('rechaza que una cuenta de prueba que es la principal la transfiera', async () => {
      const repository = app.get(DataSource).getRepository(Usuario);
      await repository.update(principal.id, { esPrincipal: false });
      await repository.update(demoAdmin.id, { esPrincipal: true });
      const demoSession = await loginAs(app, 'administradora@demo.test');

      expectDemoRejection(
        await as(
          request(server()).post(`${USERS}/${otherAdmin.id}/transferir-principal`),
          demoSession,
        ),
      );

      expect((await reload(demoAdmin.id)).esPrincipal).toBe(true);
      expect((await reload(otherAdmin.id)).esPrincipal).toBe(false);
    });

    it('la transfiere entre las demás cuentas como siempre', async () => {
      await as(request(server()).post(`${USERS}/${otherAdmin.id}/transferir-principal`)).expect(
        204,
      );

      expect((await reload(otherAdmin.id)).esPrincipal).toBe(true);
    });
  });

  describe('PUT /api/sesion/contrasena', () => {
    const changeOwnPassword = (actor: TestSession) =>
      as(request(server()).put('/api/sesion/contrasena'), actor).send({
        contrasenaActual: TEST_PASSWORD,
        contrasenaNueva: NEW_PASSWORD,
      });

    it('rechaza que una cuenta de prueba cambie su propia contraseña', async () => {
      for (const email of ['administradora@demo.test', 'abogado@demo.test', 'cliente@demo.test']) {
        const actor = await loginAs(app, email);
        const usuario = await app
          .get(DataSource)
          .getRepository(Usuario)
          .findOneOrFail({ where: { email } });
        const before = await reload(usuario.id);

        expectDemoRejection(await changeOwnPassword(actor));
        expect(await reload(usuario.id)).toEqual(before);
      }
    });

    it('las demás cuentas cambian su contraseña como siempre', async () => {
      await changeOwnPassword(await loginAs(app, 'ana@correo.com')).expect(204);
    });
  });
});
