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
  removePdf,
  setPdfVisible,
  showsVisibilityOption,
} from './formulario-pdf';

const FILE = new File(['%PDF-1.4'], 'escrito.pdf', { type: 'application/pdf' });

/** Spec 010, T28: el PDF dentro de un formulario (RF-10, RF-13, RF-15, RF-16). */
describe('el PDF en el formulario', () => {
  describe('casilla de visibilidad (RF-15, RF-16)', () => {
    it('no aparece sin PDF', () => {
      expect(showsVisibilityOption(initialPdfState(null))).toBe(false);
    });

    it('aparece con un PDF guardado, con su visibilidad', () => {
      const state = initialPdfState({ visible: true });
      expect(showsVisibilityOption(state)).toBe(true);
      expect(state.visible).toBe(true);
    });

    it('aparece con un archivo elegido, desmarcada', () => {
      const state = choosePdf(initialPdfState(null), FILE);
      expect(showsVisibilityOption(state)).toBe(true);
      expect(state.visible).toBe(false);
    });

    it('al elegir un archivo que reemplaza a uno visible, vuelve a desmarcada (RF-16)', () => {
      expect(choosePdf(initialPdfState({ visible: true }), FILE).visible).toBe(false);
    });

    it('desaparece al quitar el PDF', () => {
      expect(showsVisibilityOption(removePdf(initialPdfState({ visible: true })))).toBe(false);
    });

    it('al descartar el archivo elegido, vuelve al PDF guardado y su visibilidad', () => {
      const state = discardChosenPdf(choosePdf(initialPdfState({ visible: true }), FILE));
      expect(state).toEqual(initialPdfState({ visible: true }));
      expect(showsVisibilityOption(discardChosenPdf(choosePdf(initialPdfState(null), FILE)))).toBe(
        false,
      );
    });
  });

  describe('confirmaciones (RF-13)', () => {
    it('reemplazar un PDF guardado pide confirmación', () => {
      expect(pdfConfirmation(choosePdf(initialPdfState({ visible: false }), FILE))).toBe(
        'El PDF actual se borrará definitivamente y será reemplazado por el nuevo. No se puede deshacer',
      );
    });

    it('quitarlo pide confirmación', () => {
      expect(pdfConfirmation(removePdf(initialPdfState({ visible: false })))).toBe(
        'El PDF se borrará definitivamente. No se puede deshacer',
      );
    });

    it('adjuntar el primero o cambiar la visibilidad no piden confirmación', () => {
      expect(pdfConfirmation(choosePdf(initialPdfState(null), FILE))).toBeNull();
      expect(pdfConfirmation(setPdfVisible(initialPdfState({ visible: false }), true))).toBeNull();
      expect(pdfConfirmation(initialPdfState({ visible: false }))).toBeNull();
    });

    it('tiene los textos de la spec', () => {
      expect(PDF_CONFIRMATIONS.replace).toMatch(/^El PDF actual se borrará definitivamente/);
      expect(PDF_CONFIRMATIONS.remove).toMatch(/^El PDF se borrará definitivamente/);
    });
  });

  describe('archivo rechazado pendiente (RF-11)', () => {
    it('rejectPdf vuelve al PDF guardado y deja el rechazo pendiente, con su mensaje', () => {
      const state = rejectPdf(choosePdf(initialPdfState({ visible: true }), FILE), 'El archivo debe ser un PDF');
      expect(state.archivo).toBeNull();
      expect(state.visible).toBe(true);
      expect(pendingRejectionMessage(state)).toBe(
        'El PDF elegido no se adjuntó: El archivo debe ser un PDF. Elegí otro archivo o descartalo',
      );
    });

    it('descartar, elegir otro archivo o quitar el PDF dejan de tener el rechazo pendiente', () => {
      const rechazado = rejectPdf(initialPdfState(null), 'El archivo está vacío');
      expect(pendingRejectionMessage(dismissRejection(rechazado))).toBeNull();
      expect(pendingRejectionMessage(choosePdf(rechazado, FILE))).toBeNull();
      expect(pendingRejectionMessage(removePdf(rechazado))).toBeNull();
    });

    it('sin rechazo, no hay mensaje', () => {
      expect(pendingRejectionMessage(initialPdfState(null))).toBeNull();
    });
  });

  describe('después de un error al guardar (RF-11, RF-12)', () => {
    const conArchivo = choosePdf(initialPdfState(null), FILE);

    it('un error de red con un archivo dice "No se pudo guardar. Probá de nuevo" y conserva todo', () => {
      expect(afterSaveError(new ApiError(0, ['Sin conexión']), conArchivo)).toEqual({
        problems: [SAVE_INTERRUPTED_MESSAGE],
        estado: conArchivo,
      });
      expect(SAVE_INTERRUPTED_MESSAGE).toBe('No se pudo guardar. Probá de nuevo');
    });

    it('un error de red sin archivo muestra el mensaje de siempre', () => {
      expect(afterSaveError(new ApiError(0, ['Sin conexión']), initialPdfState(null)).problems).toEqual([
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
    it('adjuntar: el archivo y su visibilidad', () => {
      const state = setPdfVisible(choosePdf(initialPdfState(null), FILE), true);
      expect(pdfChanges(state, { conVisibilidad: true })).toEqual({
        archivo: FILE,
        datos: { pdfVisible: true },
      });
    });

    it('reemplazar: el archivo, con la visibilidad en false si no se marcó', () => {
      const state = choosePdf(initialPdfState({ visible: true }), FILE);
      expect(pdfChanges(state, { conVisibilidad: true })).toEqual({
        archivo: FILE,
        datos: { pdfVisible: false },
      });
    });

    it('quitar: quitarPdf, sin archivo', () => {
      expect(pdfChanges(removePdf(initialPdfState({ visible: true })), { conVisibilidad: true })).toEqual({
        archivo: undefined,
        datos: { quitarPdf: true },
      });
    });

    it('cambiar la visibilidad del guardado: solo pdfVisible', () => {
      const state = setPdfVisible(initialPdfState({ visible: false }), true);
      expect(pdfChanges(state, { conVisibilidad: true })).toEqual({
        archivo: undefined,
        datos: { pdfVisible: true },
      });
    });

    it('sin cambios del PDF, nada', () => {
      expect(pdfChanges(initialPdfState({ visible: true }), { conVisibilidad: true })).toEqual({
        archivo: undefined,
        datos: {},
      });
      expect(pdfChanges(initialPdfState(null), { conVisibilidad: true })).toEqual({
        archivo: undefined,
        datos: {},
      });
    });

    it('en un fallo nunca se envía la visibilidad (RF-27)', () => {
      expect(pdfChanges(choosePdf(initialPdfState(null), FILE), { conVisibilidad: false })).toEqual({
        archivo: FILE,
        datos: {},
      });
    });

    it('quitar un PDF que no estaba guardado no envía nada', () => {
      expect(pdfChanges(removePdf(initialPdfState(null)), { conVisibilidad: true })).toEqual({
        archivo: undefined,
        datos: {},
      });
    });
  });
});
