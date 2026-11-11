import { DataSource, type QueryRunner } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENTITIES, MIGRATIONS } from '../src/base-de-datos/esquema.js';
import { buildDataSourceOptions } from '../src/base-de-datos/opciones-base-de-datos.js';
import { CrearPdfs1794182400000 } from '../src/migraciones/1794182400000-crear-pdfs.js';
import { loadTestEnvironment } from './utilidades/base-de-tests.js';
import { bufferOfSize, minimalPdf } from './utilidades/pdfs-de-prueba.js';

/**
 * Plan 010, "Entidades de TypeORM y migración": la tabla pdfs y las columnas nuevas de
 * movimientos y fallos (spec 010, RF-1, RF-2, RF-6, RF-17).
 */
describe('migración de los PDF', () => {
  let dataSource: DataSource;
  let queryRunner: QueryRunner;
  let userId: number;
  let causaId: number;

  const columns = async (table: string) => {
    const rows: { name: string; type: string; nullable: string; byDefault: string | null }[] =
      await queryRunner.query(
        `SELECT COLUMN_NAME AS name, COLUMN_TYPE AS type, IS_NULLABLE AS nullable,
           COLUMN_DEFAULT AS byDefault
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
        [table],
      );
    return rows.map((row) => [row.name, row.type, row.nullable, row.byDefault]);
  };

  const insertPdf = async (codigo: string, contenido: Buffer = minimalPdf()) => {
    const result: { insertId: number } = await queryRunner.query(
      `INSERT INTO pdfs (contenido, tamano, codigo, subidoPorId, subidoEn)
       VALUES (?, ?, ?, ?, NOW(6))`,
      [contenido, contenido.length, codigo, userId],
    );
    return result.insertId;
  };

  const insertMovement = async (pdfId: number | null) => {
    const result: { insertId: number } = await queryRunner.query(
      `INSERT INTO movimientos (causaId, fecha, tipo, descripcion, creadoPorId, creadoEn, pdfId)
       VALUES (?, '2026-10-24', 'resolucion', 'Resolución', ?, NOW(6), ?)`,
      [causaId, userId, pdfId],
    );
    return result.insertId;
  };

  const clearData = async () => {
    await queryRunner.query('DELETE FROM movimientos');
    await queryRunner.query('DELETE FROM fallos');
    await queryRunner.query('DELETE FROM pdfs');
  };

  beforeAll(async () => {
    dataSource = new DataSource({
      ...buildDataSourceOptions(loadTestEnvironment()),
      entities: ENTITIES,
      migrations: MIGRATIONS,
    });
    await dataSource.initialize();
    // Parte de una base de tests vacía y aplica todas las migraciones, incluidas las de las
    // specs 001 a 009.
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
    expect(MIGRATIONS.at(-1)).toBe(CrearPdfs1794182400000);
  });

  it('up crea la tabla pdfs', async () => {
    expect(await columns('pdfs')).toEqual([
      ['id', 'int', 'NO', null],
      ['contenido', 'mediumblob', 'NO', null],
      ['tamano', 'int', 'NO', null],
      ['codigo', 'char(6)', 'NO', null],
      ['subidoPorId', 'int', 'NO', null],
      ['subidoEn', 'datetime(6)', 'NO', null],
    ]);
  });

  it('up suma pdfId y pdfVisible a movimientos, y pdfId a fallos', async () => {
    const movimientos = await columns('movimientos');
    expect(movimientos).toContainEqual(['pdfId', 'int', 'YES', null]);
    expect(movimientos).toContainEqual(['pdfVisible', 'tinyint', 'NO', '0']);
    const fallos = await columns('fallos');
    expect(fallos).toContainEqual(['pdfId', 'int', 'YES', null]);
    expect(fallos.map(([name]) => name)).not.toContain('pdfVisible');
  });

  it('deja el esquema igual a las entidades', async () => {
    const pending = await dataSource.driver.createSchemaBuilder().log();

    expect(pending.upQueries.map((query) => query.query)).toEqual([]);
  });

  it('guarda un PDF de 5 MB y lo devuelve idéntico (RF-3, RF-5)', async () => {
    const contenido = bufferOfSize(5_242_880);
    const id = await insertPdf('GRANDE', contenido);

    const [row]: { contenido: Buffer }[] = await queryRunner.query(
      'SELECT contenido FROM pdfs WHERE id = ?',
      [id],
    );
    expect(Buffer.compare(row.contenido, contenido)).toBe(0);
    await clearData();
  });

  it('no admite dos PDF con el mismo código (RF-6)', async () => {
    await insertPdf('ABC123');
    await expect(insertPdf('ABC123')).rejects.toThrow(/UQ_pdfs_codigo/);
    await clearData();
  });

  it('un PDF no se comparte entre dos movimientos, y la visibilidad nace en falso (RF-1, RF-17)', async () => {
    const pdfId = await insertPdf('MOV001');
    const movementId = await insertMovement(pdfId);
    await expect(insertMovement(pdfId)).rejects.toThrow(/UQ_movimientos_pdf/);

    const [row]: { pdfVisible: number }[] = await queryRunner.query(
      'SELECT pdfVisible FROM movimientos WHERE id = ?',
      [movementId],
    );
    expect(row.pdfVisible).toBe(0);
    await clearData();
  });

  it('un PDF no se comparte entre dos fallos (RF-1)', async () => {
    const pdfId = await insertPdf('FAL001');
    const insertRuling = () =>
      queryRunner.query(
        `INSERT INTO fallos (caratula, tribunal, fuero, fecha, sumario, creadoPorId, creadoEn, pdfId)
         VALUES ('Pérez c/ Gómez', 'CNCiv., Sala A', 'civil', '2019-05-12', 'Sumario', ?, NOW(6), ?)`,
        [userId, pdfId],
      );
    await insertRuling();
    await expect(insertRuling()).rejects.toThrow(/UQ_fallos_pdf/);
    await clearData();
  });

  it('no deja borrar un PDF que todavía está en un movimiento (RF-14)', async () => {
    const pdfId = await insertPdf('MOV002');
    await insertMovement(pdfId);
    await expect(queryRunner.query('DELETE FROM pdfs WHERE id = ?', [pdfId])).rejects.toThrow(
      /FK_movimientos_pdf/,
    );
    await clearData();
  });

  it('down quita las columnas y la tabla, y up las vuelve a crear', async () => {
    await dataSource.undoLastMigration();
    expect(await queryRunner.hasTable('pdfs')).toBe(false);
    expect((await columns('movimientos')).map(([name]) => name)).not.toContain('pdfId');
    expect((await columns('movimientos')).map(([name]) => name)).not.toContain('pdfVisible');
    expect((await columns('fallos')).map(([name]) => name)).not.toContain('pdfId');

    await dataSource.runMigrations();
    expect(await queryRunner.hasTable('pdfs')).toBe(true);
  });
});
