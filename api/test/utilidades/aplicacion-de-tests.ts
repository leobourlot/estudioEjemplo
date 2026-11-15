import type { Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module.js';
import { ENTITIES, MIGRATIONS } from '../../src/base-de-datos/esquema.js';
import { buildDataSourceOptions } from '../../src/base-de-datos/opciones-base-de-datos.js';
import { configureApp } from '../../src/configurar-aplicacion.js';
import { PLAN_SETTINGS, type PlanSettings } from '../../src/plan/plan.service.js';
import { BYTES_PER_GB, type Plan } from '../../src/plan/reglas-plan.js';
import { loadTestEnvironment } from './base-de-tests.js';

const TABLES = ['causa_colaboradores', 'partes', 'causas', 'sesiones', 'clientes', 'usuarios'];

/** Aplica las migraciones pendientes sobre la base de tests. */
async function migrateTestDatabase(): Promise<void> {
  const dataSource = new DataSource({
    ...buildDataSourceOptions(loadTestEnvironment()),
    entities: ENTITIES,
    migrations: MIGRATIONS,
  });
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
}

/** Vacía todas las tablas de la base de tests. */
export async function clearTables(app: NestExpressApplication): Promise<void> {
  const queryRunner = app.get(DataSource).createQueryRunner();
  try {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of TABLES) {
      await queryRunner.query(`TRUNCATE TABLE \`${table}\``);
    }
  } finally {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
    await queryRunner.release();
  }
}

export interface TestAppOptions {
  /** Rutas solo para el test (por ejemplo, TestOnlyController). */
  extraControllers?: Type[];
  /** Plan de la publicación (spec 011). Sin indicarlo, el de .env.test. */
  plan?: Plan;
  /** Espacio para PDF en GB (spec 011, RF-27). Sin indicarlo, el de .env.test. */
  espacioPdfGb?: number;
  /** No vacía las tablas: un segundo arranque encuentra lo que dejó el primero (spec 011, RF-20). */
  keepTables?: boolean;
}

/**
 * Levanta la aplicación completa contra la base de tests, con la misma configuración
 * HTTP que main.ts, y deja las tablas vacías salvo con `keepTables`.
 *
 * El plan y el espacio se cambian reemplazando PLAN_SETTINGS y no con process.env, porque
 * ConfigModule lee y valida el entorno al importarse AppModule (plan 011, "Configuración, demo y
 * tests de la api").
 */
export async function createTestApp(options: TestAppOptions = {}): Promise<NestExpressApplication> {
  // Valida .env.test (y que la base sea de tests) antes de tocar nada.
  const environment = loadTestEnvironment();
  await migrateTestDatabase();

  const settings: PlanSettings = {
    plan: options.plan ?? environment.PLAN,
    espacioPdfBytes:
      options.espacioPdfGb === undefined
        ? environment.ESPACIO_PDF_BYTES
        : options.espacioPdfGb * BYTES_PER_GB,
  };
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: options.extraControllers ?? [],
  })
    .overrideProvider(PLAN_SETTINGS)
    .useValue(settings)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  if (!options.keepTables) await clearTables(app);
  return app;
}
