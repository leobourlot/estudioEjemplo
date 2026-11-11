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
  visible: true,
  subidoPor: { id: 1, nombre: 'Luis', apellido: 'Sosa', activo: true },
  subidoEn: '2026-10-01T15:00:00.000Z',
};

/** Spec 010, T28: avisos de visibilidad del PDF (RF-18) y confirmación al restaurar (RF-19). */
describe('avisos del PDF de un movimiento', () => {
  describe('pdfVisibilityNotice (RF-18)', () => {
    it.each([
      // [movimiento antes, después, PDF visible antes, después, PDF nuevo, aviso]
      ['el movimiento pasa a visible con el PDF visible', false, true, true, true, false, PDF_NOTICES.alsoPdf],
      ['el movimiento pasa a visible con un PDF nuevo visible', false, true, false, true, true, PDF_NOTICES.alsoPdf],
      ['el PDF pasa a visible con el movimiento ya visible', true, true, false, true, false, PDF_NOTICES.pdfVisible],
      ['un PDF nuevo visible en un movimiento visible', true, true, true, true, true, PDF_NOTICES.pdfVisible],
      ['el PDF pasa a visible con el movimiento oculto', false, false, false, true, false, PDF_NOTICES.whenMovementVisible],
      ['el PDF pasa a visible y el movimiento a oculto', true, false, false, true, false, PDF_NOTICES.whenMovementVisible],
      ['el movimiento pasa a visible con el PDF oculto', false, true, false, false, false, null],
      ['nada cambia', true, true, true, true, false, null],
      ['el PDF pasa a oculto', true, true, true, false, false, null],
    ] as const)('%s', (_caso, movAntes, movDespues, pdfAntes, pdfDespues, nuevo, aviso) => {
      expect(
        pdfVisibilityNotice({
          movimientoAntes: movAntes,
          movimientoDespues: movDespues,
          pdfVisibleAntes: pdfAntes,
          pdfVisibleDespues: pdfDespues,
          pdfNuevo: nuevo,
        }),
      ).toBe(aviso);
    });

    it('tiene los textos de la spec', () => {
      expect(PDF_NOTICES).toEqual({
        alsoPdf: 'El cliente también podrá ver y descargar el PDF',
        pdfVisible: 'El cliente podrá ver y descargar este PDF',
        whenMovementVisible:
          'El cliente podrá ver y descargar este PDF cuando el movimiento sea visible',
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
      [true, true, true],
      [true, false, false],
      [false, true, false],
      [false, false, false],
    ])('movimiento visible %s y PDF visible %s: %s', (visible, pdfVisible, esperado) => {
      const movimiento = testMovimientoDetalle({
        anulado: true,
        visible,
        pdf: { ...PDF, visible: pdfVisible },
      });
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
