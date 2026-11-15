import type { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import { afterEach, describe, expect, it } from 'vitest';
import { PlanService } from '../src/plan/plan.service.js';
import { BYTES_PER_GB } from '../src/plan/reglas-plan.js';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';

/** Spec 011, RF-1 y RF-27: el plan y el espacio de la publicación, y cómo los cambian los tests. */
describe('plan de la publicación', () => {
  let app: NestExpressApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('sin opciones usa el plan de .env.test, que es Premium', async () => {
    app = await createTestApp();
    const plan = app.get(PlanService);

    expect(plan.plan).toBe('premium');
    expect(plan.isPremium).toBe(true);
  });

  it('con plan basico, el plan es Básico', async () => {
    app = await createTestApp({ plan: 'basico' });

    expect(app.get(PlanService).isPremium).toBe(false);
    expect(app.get(PlanService).plan).toBe('basico');
  });

  it('con espacioPdfGb, el espacio en bytes', async () => {
    app = await createTestApp({ espacioPdfGb: 1 });

    expect(app.get(PlanService).pdfSpaceBytes).toBe(BYTES_PER_GB);
  });

  it('con keepTables, un segundo arranque encuentra las cuentas del primero', async () => {
    app = await createTestApp();
    const created = await createTestUser(app, { rol: 'abogado', email: 'conservada@estudio.com' });
    await app.close();

    app = await createTestApp({ keepTables: true, plan: 'basico' });
    const found = await app.get(DataSource).getRepository(Usuario).findOneBy({ id: created.id });

    expect(found?.email).toBe('conservada@estudio.com');
  });
});
