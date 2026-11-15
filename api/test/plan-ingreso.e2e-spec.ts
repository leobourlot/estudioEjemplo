import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanService } from '../src/plan/plan.service.js';
import { PLAN_MESSAGES } from '../src/plan/reglas-plan.js';
import { Sesion } from '../src/usuarios/sesion.entity.js';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser, TEST_PASSWORD } from './utilidades/datos-de-prueba.js';
import {
  cookieWasCleared,
  loginAs,
  loginDocument,
  nextTestIp,
} from './utilidades/sesion-de-prueba.js';

const INVALID_CREDENTIALS = 'DNI/CUIT o contraseña incorrectos';
const TOO_MANY_ATTEMPTS = 'Demasiados intentos. Probá de nuevo en unos minutos';

/** Spec 011, RF-21 y el caso límite de T-17: el ingreso con el plan Básico. */
describe('ingreso según el plan', () => {
  let app: NestExpressApplication;
  let principal: Usuario;
  let outside: Usuario;

  const server = () => app.getHttpServer();
  const markOutside = (id: number) =>
    app.get(DataSource).getRepository(Usuario).update(id, { fueraDelPlan: true });
  const login = (documento: string, contrasena = TEST_PASSWORD, ip = nextTestIp()) =>
    request(server())
      .post('/api/sesion/ingresar')
      .set('X-Forwarded-For', ip)
      .send({ documento, contrasena });

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
    outside = await createTestUser(app, { rol: 'abogado', email: 'fuera@estudio.com' });
  });

  afterEach(() => vi.restoreAllMocks());

  describe('una cuenta fuera del plan (RF-21)', () => {
    beforeEach(() => markOutside(outside.id));

    it('con la contraseña correcta recibe 403 T-6 y no inicia sesión', async () => {
      const response = await login(loginDocument(outside));

      expect(response.status).toBe(403);
      expect(response.body.message).toBe(PLAN_MESSAGES.outsidePlanLogin);
      expect(response.headers['set-cookie']).toBeUndefined();
      expect(
        await app.get(DataSource).getRepository(Sesion).countBy({ usuarioId: outside.id }),
      ).toBe(0);
    });

    it('con cambio de contraseña pendiente tampoco ingresa', async () => {
      await app
        .get(DataSource)
        .getRepository(Usuario)
        .update(outside.id, { debeCambiarContrasena: true });

      const response = await login(loginDocument(outside));

      expect(response.status).toBe(403);
      expect(response.body.message).toBe(PLAN_MESSAGES.outsidePlanLogin);
    });

    it('con la contraseña incorrecta recibe el mensaje genérico', async () => {
      const response = await login(loginDocument(outside), 'otra clave');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe(INVALID_CREDENTIALS);
    });

    it('cada intento con T-6 cuenta para el bloqueo', async () => {
      const ip = nextTestIp();
      for (let i = 0; i < 5; i++) {
        expect((await login(loginDocument(outside), TEST_PASSWORD, ip)).status).toBe(403);
      }

      const blocked = await login(loginDocument(outside), TEST_PASSWORD, ip);

      expect(blocked.status).toBe(429);
      expect(blocked.body.message).toBe(TOO_MANY_ATTEMPTS);
    });
  });

  it('una sesión abierta antes de la marca se rechaza en la siguiente acción y al renovar', async () => {
    const session = await loginAs(app, 'fuera@estudio.com');
    await markOutside(outside.id);

    const action = await request(server())
      .get('/api/sesion/usuario')
      .set('Cookie', `access_token=${session.accessToken}`);
    expect(action.status).toBe(401);

    const refresh = await request(server())
      .post('/api/sesion/renovar')
      .set('Cookie', `refresh_token=${session.refreshToken}`);
    expect(refresh.status).toBe(401);
    expect(refresh.body.message).toBe(PLAN_MESSAGES.outsidePlanLogin);
    expect(cookieWasCleared(refresh, 'access_token')).toBe(true);
    expect(cookieWasCleared(refresh, 'refresh_token')).toBe(true);

    const status = await request(server())
      .get('/api/sesion/estado')
      .set('Cookie', `access_token=${session.accessToken}`);
    expect(status.body).toEqual({ seccion: null });
  });

  describe('con el ajuste de las cuentas pendiente (T-17)', () => {
    const failApplying = () =>
      vi.spyOn(app.get(PlanService), 'ensureApplied').mockRejectedValue(new Error('sin columna'));

    it('el ingreso responde 503 sin crear sesión ni contar el intento', async () => {
      const ip = nextTestIp();
      failApplying();
      for (let i = 0; i < 6; i++) {
        const response = await login(loginDocument(principal), TEST_PASSWORD, ip);
        expect(response.status).toBe(503);
        expect(response.body.message).toBe(PLAN_MESSAGES.updating);
      }
      expect(await app.get(DataSource).getRepository(Sesion).count()).toBe(0);

      // Cuando el ajuste se completa, ingresa sin reiniciar la api, y los 503 no contaron.
      vi.restoreAllMocks();
      expect((await login(loginDocument(principal), TEST_PASSWORD, ip)).status).toBe(200);
    });

    it('la renovación y las rutas con sesión responden 503; el sitio público sigue', async () => {
      const session = await loginAs(app, 'principal@estudio.com');
      failApplying();

      const action = await request(server())
        .get('/api/sesion/usuario')
        .set('Cookie', `access_token=${session.accessToken}`);
      expect(action.status).toBe(503);
      expect(action.body.message).toBe(PLAN_MESSAGES.updating);

      const refresh = await request(server())
        .post('/api/sesion/renovar')
        .set('Cookie', `refresh_token=${session.refreshToken}`);
      expect(refresh.status).toBe(503);

      const status = await request(server()).get('/api/sesion/estado');
      expect(status.status).toBe(200);
    });
  });
});
