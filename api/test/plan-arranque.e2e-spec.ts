import type { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import { afterEach, describe, expect, it } from 'vitest';
import type { Plan } from '../src/plan/reglas-plan.js';
import { Sesion } from '../src/usuarios/sesion.entity.js';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { loginAs } from './utilidades/sesion-de-prueba.js';

/**
 * Spec 011, RF-3, RF-20 y RF-25: al arrancar con el plan Básico se marca quién queda fuera del
 * plan, y con el Premium se quitan las marcas. Cada test carga las cuentas en un primer arranque
 * y las verifica en otro que no vacía las tablas.
 */
describe('ajuste de las cuentas al arrancar', () => {
  let app: NestExpressApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  const reboot = async (plan: Plan) => {
    await app?.close();
    app = await createTestApp({ plan, keepTables: true });
  };

  const staff = async (
    email: string,
    creadoEn: string,
    data: Omit<Partial<Usuario>, 'cliente'> = {},
  ): Promise<number> => {
    const usuario = await createTestUser(app!, { rol: 'abogado', email, ...data });
    await app!
      .get(DataSource)
      .query('UPDATE usuarios SET creadoEn = ? WHERE id = ?', [new Date(creadoEn), usuario.id]);
    return usuario.id;
  };

  const marked = async (): Promise<number[]> => {
    const rows = await app!
      .get(DataSource)
      .getRepository(Usuario)
      .find({ where: { fueraDelPlan: true }, order: { id: 'ASC' } });
    return rows.map((usuario) => usuario.id);
  };

  const snapshot = async () =>
    app!
      .get(DataSource)
      .getRepository(Usuario)
      .find({
        select: {
          id: true,
          rol: true,
          email: true,
          activo: true,
          modificadoEn: true,
          debeCambiarContrasena: true,
        },
        order: { id: 'ASC' },
      });

  it('con 4 integrantes activos, deja al principal y al más antiguo, y marca a los otros dos', async () => {
    app = await createTestApp();
    const principal = await staff('principal@estudio.com', '2022-01-01', {
      rol: 'admin',
      esPrincipal: true,
    });
    const oldest = await staff('antiguo@estudio.com', '2020-01-01');
    const second = await staff('segundo@estudio.com', '2021-01-01', { rol: 'admin' });
    const newest = await staff('nuevo@estudio.com', '2025-01-01', { debeCambiarContrasena: true });
    const before = await snapshot();

    await reboot('basico');

    expect(await marked()).toEqual([second, newest]);
    expect(await marked()).not.toContain(principal);
    expect(await marked()).not.toContain(oldest);
    // RF-20: no se desactiva a nadie ni se cambia ningún otro dato.
    expect(await snapshot()).toEqual(before);
  });

  it('el principal más nuevo igual queda, con el más antiguo de los demás', async () => {
    app = await createTestApp();
    await staff('principal@estudio.com', '2026-01-01', { rol: 'admin', esPrincipal: true });
    const oldest = await staff('antiguo@estudio.com', '2019-01-01');
    const other = await staff('otro@estudio.com', '2020-01-01');

    await reboot('basico');

    expect(await marked()).toEqual([other]);
    expect(await marked()).not.toContain(oldest);
  });

  it('las cuentas desactivadas no cuentan ni se marcan, y los clientes nunca se marcan', async () => {
    app = await createTestApp();
    await staff('principal@estudio.com', '2022-01-01', { rol: 'admin', esPrincipal: true });
    await staff('desactivado@estudio.com', '2018-01-01', { activo: false });
    await staff('activo@estudio.com', '2023-01-01');
    await createTestUser(app, { rol: 'cliente', email: 'cliente@estudio.com' });

    await reboot('basico');

    expect(await marked()).toEqual([]);
  });

  it('un segundo arranque con el plan Básico no cambia las marcas', async () => {
    app = await createTestApp();
    await staff('principal@estudio.com', '2022-01-01', { rol: 'admin', esPrincipal: true });
    await staff('antiguo@estudio.com', '2020-01-01');
    const third = await staff('tercero@estudio.com', '2023-01-01');

    await reboot('basico');
    await reboot('basico');

    expect(await marked()).toEqual([third]);
  });

  it('con el plan Premium se quitan todas las marcas, sin cerrar sesiones', async () => {
    app = await createTestApp();
    await staff('principal@estudio.com', '2022-01-01', { rol: 'admin', esPrincipal: true });
    await staff('antiguo@estudio.com', '2020-01-01');
    await staff('tercero@estudio.com', '2023-01-01');
    await loginAs(app, 'principal@estudio.com');
    const sessions = await app.get(DataSource).getRepository(Sesion).count();

    await reboot('basico');
    expect(await marked()).toHaveLength(1);
    await reboot('premium');

    expect(await marked()).toEqual([]);
    expect(await app!.get(DataSource).getRepository(Sesion).count()).toBe(sessions);
  });
});
