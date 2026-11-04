import { DataSource, type QueryRunner } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENTITIES, MIGRATIONS } from '../src/base-de-datos/esquema.js';
import { buildDataSourceOptions } from '../src/base-de-datos/opciones-base-de-datos.js';
import { HacerOpcionalElFuero1793404800000 } from '../src/migraciones/1793404800000-hacer-opcional-el-fuero.js';
import { loadTestEnvironment } from './utilidades/base-de-tests.js';

/** Spec 002, RF-1 y RF-8: fuero opcional en las causas. */
describe('migración del fuero opcional', () => {
  let dataSource: DataSource;
  let queryRunner: QueryRunner;
  let userId: number;

  const nullable = async () => {
    const rows: { nullable: string }[] = await queryRunner.query(
      `SELECT IS_NULLABLE AS nullable FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'causas' AND COLUMN_NAME = 'fuero'`,
    );
    return rows.map((row) => row.nullable);
  };

  /** Inserta una causa con número y juzgado, y devuelve su id. */
  const insertCase = async (fuero: string | null): Promise<number> => {
    const result: { insertId: number } = await queryRunner.query(
      `INSERT INTO causas (caratula, numeroExpediente, juzgado, fuero, responsableId, creadoPorId)
       VALUES ('Pérez c/ Gómez s/ daños', '1234/2024', 'Juzgado Civil N° 3', ?, ?, ?)`,
      [fuero, userId, userId],
    );
    return result.insertId;
  };

  const caseRow = async (id: number) => {
    const [row]: { fuero: string | null; claveExpediente: string | null }[] =
      await queryRunner.query('SELECT fuero, claveExpediente FROM causas WHERE id = ?', [id]);
    return row;
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

    const result: { insertId: number } = await queryRunner.query(
      `INSERT INTO usuarios (rol, nombre, apellido, contrasenaHash) VALUES ('admin', 'Ana', 'Saavedra', 'x')`,
    );
    userId = result.insertId;
  });

  afterAll(async () => {
    await queryRunner?.release();
    await dataSource?.destroy();
  });

  it('up deja el fuero opcional', async () => {
    expect(await nullable()).toEqual(['YES']);
  });

  it('deja el esquema igual a las entidades', async () => {
    const pending = await dataSource.driver.createSchemaBuilder().log();

    expect(pending.upQueries.map((query) => query.query)).toEqual([]);
  });

  it('una causa sin fuero no tiene clave de expediente, así que no choca con otra (RF-8)', async () => {
    const id = await insertCase(null);
    await insertCase(null);

    expect(await caseRow(id)).toEqual({ fuero: null, claveExpediente: null });
  });

  it('down pone el fuero Otro a las causas sin fuero y lo vuelve a exigir', async () => {
    await queryRunner.query('DELETE FROM causas');
    const id = await insertCase(null);

    const fromFuero = MIGRATIONS.length - MIGRATIONS.indexOf(HacerOpcionalElFuero1793404800000);
    for (let index = 0; index < fromFuero; index++) await dataSource.undoLastMigration();

    expect(await nullable()).toEqual(['NO']);
    expect(await caseRow(id)).toEqual({
      fuero: 'otro',
      claveExpediente: 'otro|Juzgado Civil N° 3|1234/2024',
    });

    // Deja la base como la encontró, con todas las migraciones aplicadas.
    await queryRunner.query('DELETE FROM causas');
    await dataSource.runMigrations();
  });
});
