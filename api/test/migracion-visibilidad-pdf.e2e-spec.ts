import { DataSource, type QueryRunner } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENTITIES, MIGRATIONS } from '../src/base-de-datos/esquema.js';
import { buildDataSourceOptions } from '../src/base-de-datos/opciones-base-de-datos.js';
import { QuitarVisibilidadDelPdf1794441600000 } from '../src/migraciones/1794441600000-quitar-visibilidad-del-pdf.js';
import { loadTestEnvironment } from './utilidades/base-de-tests.js';
import { minimalPdf } from './utilidades/pdfs-de-prueba.js';

/**
 * Spec 010, RF-17 y RF-33: el PDF de un movimiento no tiene visibilidad propia. El cliente lo ve
 * si puede ver el movimiento.
 */
describe('migración que quita la visibilidad del PDF', () => {
  let dataSource: DataSource;
  let queryRunner: QueryRunner;
  let userId: number;
  let causaId: number;

  const movementColumns = async () => {
    const rows: { name: string }[] = await queryRunner.query(
      `SELECT COLUMN_NAME AS name FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'movimientos'`,
    );
    return rows.map((row) => row.name);
  };

  /** Inserta un movimiento, con un PDF nuevo o sin él, y devuelve su id. */
  const insertMovement = async (visible: boolean, codigo: string | null) => {
    let pdfId: number | null = null;
    if (codigo) {
      const contenido = minimalPdf();
      const pdf: { insertId: number } = await queryRunner.query(
        `INSERT INTO pdfs (contenido, tamano, codigo, subidoPorId, subidoEn)
         VALUES (?, ?, ?, ?, NOW(6))`,
        [contenido, contenido.length, codigo, userId],
      );
      pdfId = pdf.insertId;
    }
    const result: { insertId: number } = await queryRunner.query(
      `INSERT INTO movimientos (causaId, fecha, tipo, descripcion, visible, creadoPorId, creadoEn, pdfId)
       VALUES (?, '2026-10-24', 'resolucion', 'Resolución', ?, ?, NOW(6), ?)`,
      [causaId, visible, userId, pdfId],
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

    const user: { insertId: number } = await queryRunner.query(
      `INSERT INTO usuarios (rol, nombre, apellido, contrasenaHash) VALUES ('abogado', 'Ana', 'Saavedra', 'x')`,
    );
    userId = user.insertId;
    const causa: { insertId: number } = await queryRunner.query(
      `INSERT INTO causas (caratula, fuero, responsableId, creadoPorId) VALUES ('Pérez c/ Gómez', 'civil', ?, ?)`,
      [userId, userId],
    );
    causaId = causa.insertId;
  }, 60_000);

  afterAll(async () => {
    await queryRunner?.release();
    await dataSource?.destroy();
  });

  it('es la última migración', () => {
    expect(MIGRATIONS.at(-1)).toBe(QuitarVisibilidadDelPdf1794441600000);
  });

  it('up quita la visibilidad del PDF de los movimientos', async () => {
    expect(await movementColumns()).not.toContain('pdfVisible');
  });

  it('deja el esquema igual a las entidades', async () => {
    const pending = await dataSource.driver.createSchemaBuilder().log();

    expect(pending.upQueries.map((query) => query.query)).toEqual([]);
  });

  it('down vuelve a crear la marca, visible solo en el PDF de un movimiento visible, y up la quita', async () => {
    const visibleConPdf = await insertMovement(true, 'VIS001');
    const ocultoConPdf = await insertMovement(false, 'OCU001');
    const visibleSinPdf = await insertMovement(true, null);

    await dataSource.undoLastMigration();

    const rows: { id: number; pdfVisible: number }[] = await queryRunner.query(
      'SELECT id, pdfVisible FROM movimientos ORDER BY id',
    );
    expect(rows).toEqual([
      { id: visibleConPdf, pdfVisible: 1 },
      { id: ocultoConPdf, pdfVisible: 0 },
      { id: visibleSinPdf, pdfVisible: 0 },
    ]);

    await dataSource.runMigrations();
    expect(await movementColumns()).not.toContain('pdfVisible');

    // Deja la base como la encontró.
    await queryRunner.query('DELETE FROM movimientos');
    await queryRunner.query('DELETE FROM pdfs');
  });
});
