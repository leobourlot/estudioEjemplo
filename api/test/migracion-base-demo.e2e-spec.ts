import { DataSource, type QueryRunner } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENTITIES, MIGRATIONS } from '../src/base-de-datos/esquema.js';
import { buildDataSourceOptions } from '../src/base-de-datos/opciones-base-de-datos.js';
import { CrearBaseDemo1793664000000 } from '../src/migraciones/1793664000000-crear-base-demo.js';
import { loadTestEnvironment } from './utilidades/base-de-tests.js';

/**
 * Spec 009, RF-21 (plan 009, D6): la tabla que identifica a la base de la demo. La migración la
 * crea vacía en todas las bases; solo el comando demo:marcar le pone su fila, en la base de la
 * demo. La base de tests nunca queda marcada.
 */
describe('migración de la base de la demo', () => {
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const columns = async () => {
    const rows: { name: string; type: string; nullable: string }[] = await queryRunner.query(
      `SELECT COLUMN_NAME AS name, COLUMN_TYPE AS type, IS_NULLABLE AS nullable
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'base_demo' ORDER BY ORDINAL_POSITION`,
    );
    return rows.map((row) => [row.name, row.type, row.nullable]);
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
    expect(MIGRATIONS.at(-1)).toBe(CrearBaseDemo1793664000000);
  });

  it('up crea la tabla base_demo, vacía', async () => {
    expect(await queryRunner.hasTable('base_demo')).toBe(true);
    expect(await columns()).toEqual([
      ['id', 'int', 'NO'],
      ['marcadaEn', 'datetime(6)', 'NO'],
    ]);
    expect(await queryRunner.query('SELECT * FROM base_demo')).toEqual([]);
  });

  it('admite una sola fila', async () => {
    await queryRunner.query('INSERT INTO base_demo (id, marcadaEn) VALUES (1, NOW(6))');

    await expect(
      queryRunner.query('INSERT INTO base_demo (id, marcadaEn) VALUES (2, NOW(6))'),
    ).rejects.toThrow();
    await queryRunner.query('DELETE FROM base_demo');
  });

  it('deja el esquema igual a las entidades', async () => {
    const pending = await dataSource.driver.createSchemaBuilder().log();

    expect(pending.upQueries.map((query) => query.query)).toEqual([]);
  });

  it('down borra la tabla, y up la vuelve a crear', async () => {
    await dataSource.undoLastMigration();
    expect(await queryRunner.hasTable('base_demo')).toBe(false);

    await dataSource.runMigrations();
    expect(await queryRunner.hasTable('base_demo')).toBe(true);
  });
});
