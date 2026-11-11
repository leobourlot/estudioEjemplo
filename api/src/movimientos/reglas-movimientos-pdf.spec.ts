import { describe, expect, it } from 'vitest';
import { diffMovement, loadChanges, type MovementData } from './reglas-movimientos.js';

const PDF = { codigo: 'K7Q2MX', tamano: 850_000, visible: false };

const MOVEMENT: MovementData = {
  fecha: '2024-03-01',
  tipo: 'providencia',
  descripcion: 'Se fija audiencia preliminar.',
  textoCliente: null,
  visible: false,
  anulado: false,
  pdf: null,
};

/** Spec 010, RF-20 y RF-21: el PDF como un dato más del historial de cambios. */
describe('Historial de cambios con el PDF', () => {
  it('registra que se adjuntó un PDF', () => {
    expect(diffMovement(MOVEMENT, { ...MOVEMENT, pdf: PDF })).toEqual([
      { campo: 'pdf', anterior: null, nuevo: PDF },
    ]);
  });

  it('registra que se quitó', () => {
    expect(diffMovement({ ...MOVEMENT, pdf: PDF }, MOVEMENT)).toEqual([
      { campo: 'pdf', anterior: PDF, nuevo: null },
    ]);
  });

  it('registra el cambio de visibilidad del PDF', () => {
    const visible = { ...PDF, visible: true };
    expect(diffMovement({ ...MOVEMENT, pdf: PDF }, { ...MOVEMENT, pdf: visible })).toEqual([
      { campo: 'pdf', anterior: PDF, nuevo: visible },
    ]);
  });

  it('un reemplazo con el mismo tamaño y la misma visibilidad se registra por el código', () => {
    const otro = { ...PDF, codigo: 'P4N8RC' };
    expect(diffMovement({ ...MOVEMENT, pdf: PDF }, { ...MOVEMENT, pdf: otro })).toEqual([
      { campo: 'pdf', anterior: PDF, nuevo: otro },
    ]);
  });

  it('el mismo PDF, aunque sea otro objeto, no es un cambio', () => {
    expect(diffMovement({ ...MOVEMENT, pdf: PDF }, { ...MOVEMENT, pdf: { ...PDF } })).toEqual([]);
  });

  it('un cambio de datos sin cambio del PDF no registra el PDF', () => {
    expect(
      diffMovement({ ...MOVEMENT, pdf: PDF }, { ...MOVEMENT, pdf: PDF, visible: true }),
    ).toEqual([{ campo: 'visible', anterior: false, nuevo: true }]);
  });

  it('la carga registra el PDF, también cuando no hay', () => {
    expect(loadChanges({ ...MOVEMENT, pdf: PDF }).at(-1)).toEqual({
      campo: 'pdf',
      anterior: null,
      nuevo: PDF,
    });
    expect(loadChanges(MOVEMENT).at(-1)).toEqual({ campo: 'pdf', anterior: null, nuevo: null });
  });

  it('nunca registra el contenido: solo código, tamaño y visibilidad', () => {
    const [cambio] = diffMovement(MOVEMENT, {
      ...MOVEMENT,
      pdf: { ...PDF, contenido: Buffer.from('%PDF-') } as MovementData['pdf'],
    });
    expect(Object.keys(cambio.nuevo as object).sort()).toEqual(['codigo', 'tamano', 'visible']);
  });
});
