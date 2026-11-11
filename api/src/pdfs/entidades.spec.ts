import { getMetadataArgsStorage } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { Fallo } from '../jurisprudencia/fallo.entity.js';
import { Movimiento } from '../movimientos/movimiento.entity.js';
import { Pdf } from './pdf.entity.js';

const storage = () => getMetadataArgsStorage();

function columnOptions(target: object, propertyName: string) {
  const column = storage().columns.find(
    (args) => args.target === target && args.propertyName === propertyName,
  );
  if (!column) throw new Error(`No existe la columna ${propertyName}`);
  return column.options;
}

const columnNames = (target: object) =>
  storage()
    .columns.filter((args) => args.target === target)
    .map((args) => args.propertyName);

const index = (target: object, name: string) =>
  storage().indices.find((args) => args.target === target && args.name === name);

describe('Pdf (spec 010, RF-1, RF-2, RF-6, RF-8, RF-9)', () => {
  it('se guarda en la tabla pdfs', () => {
    expect(storage().tables.find((args) => args.target === Pdf)?.name).toBe('pdfs');
  });

  it('el contenido es un mediumblob que no se trae salvo que se pida (plan, D1)', () => {
    expect(columnOptions(Pdf, 'contenido')).toMatchObject({ type: 'mediumblob', select: false });
  });

  it('el código tiene 6 caracteres y es único', () => {
    expect(columnOptions(Pdf, 'codigo')).toMatchObject({ type: 'char', length: 6 });
    expect(index(Pdf, 'UQ_pdfs_codigo')).toMatchObject({ columns: ['codigo'], unique: true });
  });

  it('registra el tamaño, quién lo subió y cuándo, con microsegundos', () => {
    expect(columnOptions(Pdf, 'tamano').type).toBe('int');
    expect(columnOptions(Pdf, 'subidoPorId').type).toBe('int');
    expect(columnOptions(Pdf, 'subidoEn')).toMatchObject({ type: 'datetime', precision: 6 });
  });

  it('no tiene columnas para el nombre original ni para el tipo informado (RF-8)', () => {
    expect(columnNames(Pdf).sort()).toEqual(
      ['codigo', 'contenido', 'id', 'subidoEn', 'subidoPorId', 'tamano'].sort(),
    );
  });
});

describe('Columnas nuevas de movimientos y fallos (RF-1, RF-17)', () => {
  it('un movimiento tiene a lo sumo un PDF, que no comparte', () => {
    expect(columnOptions(Movimiento, 'pdfId')).toMatchObject({ type: 'int', nullable: true });
    expect(index(Movimiento, 'UQ_movimientos_pdf')).toMatchObject({
      columns: ['pdfId'],
      unique: true,
    });
  });

  it('la visibilidad del PDF de un movimiento nace en falso', () => {
    expect(columnOptions(Movimiento, 'pdfVisible')).toMatchObject({
      type: 'boolean',
      default: false,
    });
  });

  it('un fallo tiene a lo sumo un PDF, que no comparte', () => {
    expect(columnOptions(Fallo, 'pdfId')).toMatchObject({ type: 'int', nullable: true });
    expect(index(Fallo, 'UQ_fallos_pdf')).toMatchObject({ columns: ['pdfId'], unique: true });
  });

  it('un fallo no tiene visibilidad para el cliente (RF-27)', () => {
    expect(columnNames(Fallo)).not.toContain('pdfVisible');
  });
});
