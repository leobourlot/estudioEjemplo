import { describe, expect, it } from 'vitest';
import { ApiError } from './cliente-http';
import {
  afterSaveError,
  dismissRejection,
  pendingRejectionMessage,
  rejectPdf,
  SAVE_INTERRUPTED_MESSAGE,
  choosePdf,
  discardChosenPdf,
  initialPdfState,
  PDF_CONFIRMATIONS,
  pdfChanges,
  pdfConfirmation,
  hasPdf,
  removePdf,
} from './formulario-pdf';

const FILE = new File(['%PDF-1.4'], 'escrito.pdf', { type: 'application/pdf' });

/** Spec 010, T28: el PDF dentro de un formulario (RF-10, RF-13, RF-17). */
describe('el PDF en el formulario', () => {
  describe('si el formulario termina con un PDF', () => {
    it('sin PDF guardado ni elegido, no', () => {
      expect(hasPdf(initialPdfState(false))).toBe(false);
    });

    it('con un PDF guardado o con un archivo elegido, sí', () => {
      expect(hasPdf(initialPdfState(true))).toBe(true);
      expect(hasPdf(choosePdf(initialPdfState(false), FILE))).toBe(true);
    });

    it('al quitarlo, no', () => {
      expect(hasPdf(removePdf(initialPdfState(true)))).toBe(false);
    });

    it('al descartar el archivo elegido, vuelve al PDF guardado', () => {
      expect(discardChosenPdf(choosePdf(initialPdfState(true), FILE))).toEqual(initialPdfState(true));
      expect(hasPdf(discardChosenPdf(choosePdf(initialPdfState(false), FILE)))).toBe(false);
    });

    it('no tiene visibilidad propia: la decide la del movimiento (RF-17)', () => {
      expect(Object.keys(initialPdfState(true)).sort()).toEqual([
        'archivo',
        'guardado',
        'quitar',
        'rechazo',
      ]);
    });
  });

  describe('confirmaciones (RF-13)', () => {
    it('reemplazar un PDF guardado pide confirmación', () => {
      expect(pdfConfirmation(choosePdf(initialPdfState(true), FILE))).toBe(
        'El PDF actual se borrará definitivamente y será reemplazado por el nuevo. No se puede deshacer',
      );
    });

    it('quitarlo pide confirmación', () => {
      expect(pdfConfirmation(removePdf(initialPdfState(true)))).toBe(
        'El PDF se borrará definitivamente. No se puede deshacer',
      );
    });

    it('adjuntar el primero o no cambiar el PDF no piden confirmación', () => {
      expect(pdfConfirmation(choosePdf(initialPdfState(false), FILE))).toBeNull();
      expect(pdfConfirmation(initialPdfState(true))).toBeNull();
    });

    it('tiene los textos de la spec', () => {
      expect(PDF_CONFIRMATIONS.replace).toMatch(/^El PDF actual se borrará definitivamente/);
      expect(PDF_CONFIRMATIONS.remove).toMatch(/^El PDF se borrará definitivamente/);
    });
  });

  describe('archivo rechazado pendiente (RF-11)', () => {
    it('rejectPdf vuelve al PDF guardado y deja el rechazo pendiente, con su mensaje', () => {
      const state = rejectPdf(choosePdf(initialPdfState(true), FILE), 'El archivo debe ser un PDF');
      expect(state.archivo).toBeNull();
      expect(state.guardado).toBe(true);
      expect(pendingRejectionMessage(state)).toBe(
        'El PDF elegido no se adjuntó: El archivo debe ser un PDF. Elegí otro archivo o descartalo',
      );
    });

    it('descartar, elegir otro archivo o quitar el PDF dejan de tener el rechazo pendiente', () => {
      const rechazado = rejectPdf(initialPdfState(false), 'El archivo está vacío');
      expect(pendingRejectionMessage(dismissRejection(rechazado))).toBeNull();
      expect(pendingRejectionMessage(choosePdf(rechazado, FILE))).toBeNull();
      expect(pendingRejectionMessage(removePdf(rechazado))).toBeNull();
    });

    it('sin rechazo, no hay mensaje', () => {
      expect(pendingRejectionMessage(initialPdfState(false))).toBeNull();
    });
  });

  describe('después de un error al guardar (RF-11, RF-12)', () => {
    const conArchivo = choosePdf(initialPdfState(false), FILE);

    it('un error de red con un archivo dice "No se pudo guardar. Probá de nuevo" y conserva todo', () => {
      expect(afterSaveError(new ApiError(0, ['Sin conexión']), conArchivo)).toEqual({
        problems: [SAVE_INTERRUPTED_MESSAGE],
        estado: conArchivo,
      });
      expect(SAVE_INTERRUPTED_MESSAGE).toBe('No se pudo guardar. Probá de nuevo');
    });

    it('un error de red sin archivo muestra el mensaje de siempre', () => {
      expect(afterSaveError(new ApiError(0, ['Sin conexión']), initialPdfState(false)).problems).toEqual([
        'Sin conexión',
      ]);
    });

    it('un rechazo del archivo lo descarta', () => {
      const { problems, estado } = afterSaveError(
        new ApiError(400, ['El archivo debe ser un PDF']),
        conArchivo,
      );
      expect(problems).toEqual(['El archivo debe ser un PDF']);
      expect(estado.archivo).toBeNull();
      // Queda pendiente: el próximo "Guardar" no envía nada hasta elegir otro o descartarlo.
      expect(pendingRejectionMessage(estado)).toMatch(/^El PDF elegido no se adjuntó/);
    });

    it('un rechazo de otro dato conserva el archivo', () => {
      const { estado } = afterSaveError(
        new ApiError(400, ['Indicá la descripción del movimiento']),
        conArchivo,
      );
      expect(estado.archivo).toBe(FILE);
    });
  });

  describe('lo que se envía (RF-10)', () => {
    it('adjuntar: solo el archivo, sin visibilidad del PDF (RF-17)', () => {
      expect(pdfChanges(choosePdf(initialPdfState(false), FILE))).toEqual({
        archivo: FILE,
        datos: {},
      });
    });

    it('reemplazar: solo el archivo', () => {
      expect(pdfChanges(choosePdf(initialPdfState(true), FILE))).toEqual({
        archivo: FILE,
        datos: {},
      });
    });

    it('quitar: quitarPdf, sin archivo', () => {
      expect(pdfChanges(removePdf(initialPdfState(true)))).toEqual({
        archivo: undefined,
        datos: { quitarPdf: true },
      });
    });

    it('sin cambios del PDF, nada', () => {
      expect(pdfChanges(initialPdfState(true))).toEqual({ archivo: undefined, datos: {} });
      expect(pdfChanges(initialPdfState(false))).toEqual({ archivo: undefined, datos: {} });
    });

    it('quitar un PDF que no estaba guardado no envía nada', () => {
      expect(pdfChanges(removePdf(initialPdfState(false)))).toEqual({
        archivo: undefined,
        datos: {},
      });
    });
  });
});
