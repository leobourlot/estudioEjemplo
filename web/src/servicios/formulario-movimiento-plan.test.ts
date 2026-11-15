import { describe, expect, it } from 'vitest';
import { isPdfFileError } from './archivo-pdf';
import { PDF_NOTICES, pdfVisibilityNotice, restoreNotice } from './formulario-movimiento';
import { PLAN_TEXTS } from './plan';

const change = (overrides: Partial<Parameters<typeof pdfVisibilityNotice>[0]> = {}) => ({
  movimientoAntes: false,
  movimientoDespues: true,
  tienePdf: true,
  pdfNuevo: false,
  ...overrides,
});

/** Spec 011, RF-15 y RF-28: las reglas de los formularios con el plan. */
describe('reglas de los formularios según el plan', () => {
  describe('pdfVisibilityNotice', () => {
    it('con el plan Básico, al dejar visible un movimiento con PDF, T-11', () => {
      expect(pdfVisibilityNotice(change({ planPremium: false }))).toBe(PLAN_TEXTS.pdfKeptHidden);
    });

    it('con el plan Básico, sin PDF o sin dejarlo visible, nada; y nunca los avisos de la spec 010', () => {
      expect(pdfVisibilityNotice(change({ planPremium: false, tienePdf: false }))).toBeNull();
      expect(
        pdfVisibilityNotice(change({ planPremium: false, movimientoDespues: false })),
      ).toBeNull();
      expect(
        pdfVisibilityNotice(change({ planPremium: false, movimientoAntes: true, pdfNuevo: true })),
      ).toBeNull();
    });

    it('con el plan Premium, como en la spec 010', () => {
      expect(pdfVisibilityNotice(change({ planPremium: true }))).toBe(PDF_NOTICES.alsoPdf);
      expect(pdfVisibilityNotice(change())).toBe(PDF_NOTICES.alsoPdf);
    });
  });

  describe('restoreNotice', () => {
    it('con el plan Básico, T-11 al restaurar un movimiento visible con PDF', () => {
      expect(restoreNotice({ visible: true, tienePdf: true }, false)).toBe(
        PLAN_TEXTS.pdfKeptHidden,
      );
    });

    it('sin PDF, oculto o con el plan Premium, nada', () => {
      expect(restoreNotice({ visible: true, tienePdf: false }, false)).toBeNull();
      expect(restoreNotice({ visible: false, tienePdf: true }, false)).toBeNull();
      expect(restoreNotice({ visible: true, tienePdf: true }, true)).toBeNull();
    });
  });

  describe('isPdfFileError', () => {
    it('T-4 y T-9 descartan el archivo', () => {
      expect(isPdfFileError(PLAN_TEXTS.featureNotIncluded)).toBe(true);
      expect(
        isPdfFileError(
          'Se completó el espacio para PDF del estudio (10 GB). Quitá algún PDF que no necesites o pedí más espacio a Bourder Web.',
        ),
      ).toBe(true);
      expect(isPdfFileError('La descripción es obligatoria')).toBe(false);
    });
  });
});
