import { DataSource, type QueryRunner } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENTITIES, MIGRATIONS } from '../src/base-de-datos/esquema.js';
import { buildDataSourceOptions } from '../src/base-de-datos/opciones-base-de-datos.js';
import { AgregarFueraDelPlanAUsuarios1794614400000 } from '../src/migraciones/1794614400000-agregar-fuera-del-plan-a-usuarios.js';
import { loadTestEnvironment } from './utilidades/base-de-tests.js';

/** Spec 011, RF-20: la marca de los integrantes fuera del plan Básico. */
describe('migración que agrega la marca de fuera del plan', () => {
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const userColumns = async () => {
    const rows: { name: string }[] = await queryRunner.query(
      `SELECT COLUMN_NAME AS name FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios'`,
    );
    return rows.map((row) => row.name);
  };

  const insertUser = async (nombre: string) => {
    const result: { insertId: number } = await queryRunner.query(
      `INSERT INTO usuarios (rol, nombre, apellido, contrasenaHash) VALUES ('abogado', ?, 'Saavedra', 'x')`,
      [nombre],
    );
    return result.insertId;
  };

  beforeAll(async () => {
    dataSource = new DataSource({
      ...buildDataSourceOptions(loadTestEnvironment()),
      entities: ENTITIES,
      migrations: MIGRATIONS,
    });
    await dataSource.initialize();
    // Parte de una base de tests vacía y aplica todas las migraciones.
    await dataSource.dropDatabase();
    await dataSource.runMigrations();
    queryRunner = dataSource.createQueryRunner();
  }, 60_000);

  afterAll(async () => {
    await queryRunner?.release();
    await dataSource?.destroy();
  });

  it('es la última migración', () => {
    expect(MIGRATIONS.at(-1)).toBe(AgregarFueraDelPlanAUsuarios1794614400000);
  });

  it('deja el esquema igual a las entidades', async () => {
    const pending = await dataSource.driver.createSchemaBuilder().log();

    expect(pending.upQueries.map((query) => query.query)).toEqual([]);
  });

  it('una cuenta existente queda sin la marca, una nueva nace sin ella, y down la quita', async () => {
    await dataSource.undoLastMigration();
    expect(await userColumns()).not.toContain('fueraDelPlan');
    const existente = await insertUser('Ana');

    await dataSource.runMigrations();
    const nueva = await insertUser('Bruno');

    const rows: { id: number; fueraDelPlan: number }[] = await queryRunner.query(
      'SELECT id, fueraDelPlan FROM usuarios ORDER BY id',
    );
    expect(rows).toEqual([
      { id: existente, fueraDelPlan: 0 },
      { id: nueva, fueraDelPlan: 0 },
    ]);

    await dataSource.undoLastMigration();
    expect(await userColumns()).not.toContain('fueraDelPlan');
    await dataSource.runMigrations();
    expect(await userColumns()).toContain('fueraDelPlan');

    // Deja la base como la encontró.
    await queryRunner.query('DELETE FROM usuarios');
  });
});
