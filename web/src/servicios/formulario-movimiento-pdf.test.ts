import { describe, expect, it } from 'vitest';
import { testMovimientoDetalle } from '../pruebas/movimientos-de-prueba';
import {
  movementFormFrom,
  needsRestoreConfirmation,
  needsVisibleChangeWarning,
  PDF_NOTICES,
  pdfVisibilityNotice,
  RESTORE_WITH_PDF_WARNING,
} from './formulario-movimiento';

const PDF = {
  codigo: 'K7Q2MX',
  tamano: 850_000,
  subidoPor: { id: 1, nombre: 'Luis', apellido: 'Sosa', activo: true },
  subidoEn: '2026-10-01T15:00:00.000Z',
};

/** Spec 010, T28: avisos de que el cliente verá el PDF (RF-18) y confirmación al restaurar (RF-19). */
describe('avisos del PDF de un movimiento', () => {
  describe('pdfVisibilityNotice (RF-18)', () => {
    it.each([
      // [movimiento antes, después, tiene PDF, PDF nuevo, aviso]
      ['el movimiento pasa a visible con su PDF', false, true, true, false, PDF_NOTICES.alsoPdf],
      ['el movimiento pasa a visible con un PDF nuevo', false, true, true, true, PDF_NOTICES.alsoPdf],
      ['un PDF nuevo en un movimiento visible', true, true, true, true, PDF_NOTICES.newPdf],
      ['un PDF nuevo en un movimiento oculto', false, false, true, true, null],
      ['un PDF nuevo y el movimiento pasa a oculto', true, false, true, true, null],
      ['el movimiento pasa a visible sin PDF', false, true, false, false, null],
      ['nada cambia en un movimiento visible con PDF', true, true, true, false, null],
      ['se quita el PDF de un movimiento visible', true, true, false, false, null],
    ] as const)('%s', (_caso, movAntes, movDespues, tienePdf, nuevo, aviso) => {
      expect(
        pdfVisibilityNotice({
          movimientoAntes: movAntes,
          movimientoDespues: movDespues,
          tienePdf,
          pdfNuevo: nuevo,
        }),
      ).toBe(aviso);
    });

    it('tiene los textos de la spec', () => {
      expect(PDF_NOTICES).toEqual({
        alsoPdf: 'El cliente también podrá ver y descargar el PDF',
        newPdf: 'El cliente podrá ver y descargar este PDF',
      });
    });
  });

  it('el aviso de la spec 003 (RF-13) no cuenta los cambios del PDF', () => {
    const movimiento = testMovimientoDetalle({ visible: true, pdf: PDF });
    // El formulario no cambia ningún dato del movimiento: el PDF va aparte.
    expect(needsVisibleChangeWarning(movimiento, movementFormFrom(movimiento))).toBe(false);
  });

  describe('needsRestoreConfirmation (RF-19)', () => {
    it.each([
      [true, true],
      [false, false],
    ])('movimiento visible %s con PDF: %s', (visible, esperado) => {
      const movimiento = testMovimientoDetalle({ anulado: true, visible, pdf: PDF });
      expect(needsRestoreConfirmation(movimiento)).toBe(esperado);
    });

    it('sin PDF no pide confirmación', () => {
      expect(needsRestoreConfirmation(testMovimientoDetalle({ anulado: true, visible: true }))).toBe(
        false,
      );
    });

    it('tiene el texto de la spec', () => {
      expect(RESTORE_WITH_PDF_WARNING).toBe(
        'Al restaurarlo, el cliente volverá a ver este movimiento y su PDF',
      );
    });
  });
});
