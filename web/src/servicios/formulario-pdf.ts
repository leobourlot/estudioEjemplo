import { isPdfFileError } from './archivo-pdf';
import { ApiError, errorMessage } from './cliente-http';

/**
 * El PDF dentro del formulario de un movimiento o de un fallo (spec 010, RF-10 a RF-16; plan 010,
 * "Comportamiento de la interfaz"). Estado inmutable y funciones puras: los componentes solo lo
 * muestran. No importa React (principio 3).
 */

/** El PDF del formulario. */
export interface PdfFormState {
  /** El PDF ya guardado, o null si no hay. */
  guardado: { visible: boolean } | null;
  /** Un archivo elegido y ya validado (validatePdfFile), que se enviará al guardar. */
  archivo: File | null;
  /** Si se pidió quitar el PDF guardado. */
  quitar: boolean;
  /** La marca de visibilidad del PDF para el cliente (solo en movimientos). */
  visible: boolean;
  /**
   * El motivo por el que se rechazó el último archivo elegido, o null. Mientras está pendiente,
   * el formulario no se envía (RF-11).
   */
  rechazo: string | null;
}

export const PDF_CONFIRMATIONS = {
  replace:
    'El PDF actual se borrará definitivamente y será reemplazado por el nuevo. No se puede deshacer',
  remove: 'El PDF se borrará definitivamente. No se puede deshacer',
} as const;

/** El estado al abrir el formulario: el PDF guardado, si hay, con su visibilidad. */
export function initialPdfState(guardado: { visible: boolean } | null): PdfFormState {
  return {
    guardado,
    archivo: null,
    quitar: false,
    visible: guardado?.visible ?? false,
    rechazo: null,
  };
}

/** Elige un archivo: el nuevo nace oculto, aunque el que reemplaza fuera visible (RF-16). */
export function choosePdf(state: PdfFormState, archivo: File): PdfFormState {
  return { ...state, archivo, quitar: false, visible: false, rechazo: null };
}

/** Descarta el archivo elegido: vuelve al guardado. */
export function discardChosenPdf(state: PdfFormState): PdfFormState {
  return initialPdfState(state.guardado);
}

/**
 * Un archivo rechazado, en la pantalla o por la api (RF-11): se descarta y el rechazo queda
 * pendiente hasta elegir otro archivo o descartarlo.
 */
export function rejectPdf(state: PdfFormState, motivo: string): PdfFormState {
  return { ...discardChosenPdf(state), rechazo: motivo };
}

/** "Descartar" el aviso del archivo rechazado: se puede guardar sin cambiar el PDF. */
export function dismissRejection(state: PdfFormState): PdfFormState {
  return { ...state, rechazo: null };
}

/** El mensaje que impide enviar el formulario con un rechazo pendiente, o null (RF-11). */
export function pendingRejectionMessage(state: PdfFormState): string | null {
  return state.rechazo === null
    ? null
    : `El PDF elegido no se adjuntó: ${state.rechazo}. Elegí otro archivo o descartalo`;
}

/** "Quitar PDF": quita el archivo elegido y pide quitar el guardado. */
export function removePdf(state: PdfFormState): PdfFormState {
  return { ...state, archivo: null, quitar: true, visible: false, rechazo: null };
}

export function setPdfVisible(state: PdfFormState, visible: boolean): PdfFormState {
  return { ...state, visible };
}

/** Si el formulario termina con un PDF: el elegido o el guardado que no se quita. */
export function hasPdf(state: PdfFormState): boolean {
  return state.archivo !== null || (state.guardado !== null && !state.quitar);
}

/** La casilla de visibilidad solo aparece si el formulario tiene un PDF (RF-15). */
export const showsVisibilityOption = hasPdf;

/** La confirmación que hay que pedir antes de guardar, o null (RF-13). */
export function pdfConfirmation(state: PdfFormState): string | null {
  if (state.guardado === null) return null;
  if (state.archivo !== null) return PDF_CONFIRMATIONS.replace;
  return state.quitar ? PDF_CONFIRMATIONS.remove : null;
}

/** Si la subida se corta (RF-12). El formulario conserva lo escrito y el archivo. */
export const SAVE_INTERRUPTED_MESSAGE = 'No se pudo guardar. Probá de nuevo';

/**
 * Los mensajes para mostrar y el estado del PDF después de un error al guardar. Un error de red
 * con un archivo en el pedido conserva todo (RF-12). Si la api rechazó el archivo, se descarta y
 * hay que elegir otro; si rechazó otro dato, se conserva (RF-11).
 */
export function afterSaveError(
  caught: unknown,
  estado: PdfFormState,
): { problems: string[]; estado: PdfFormState } {
  if (caught instanceof ApiError && caught.status === 0 && estado.archivo !== null) {
    return { problems: [SAVE_INTERRUPTED_MESSAGE], estado };
  }
  const problems = caught instanceof ApiError ? caught.messages : [errorMessage(caught)];
  const rechazo = problems.find(isPdfFileError);
  return { problems, estado: rechazo ? rejectPdf(estado, rechazo) : estado };
}

/** Lo que se suma a los datos del formulario, y el archivo a enviar, si hay (RF-10). */
export interface PdfChanges {
  archivo: File | undefined;
  datos: { pdfVisible?: boolean; quitarPdf?: true };
}

/**
 * Los cambios del PDF para el pedido. `conVisibilidad` es false en los fallos, que no tienen
 * visibilidad para el cliente (RF-27).
 */
export function pdfChanges(
  state: PdfFormState,
  { conVisibilidad }: { conVisibilidad: boolean },
): PdfChanges {
  if (state.archivo !== null) {
    return {
      archivo: state.archivo,
      datos: conVisibilidad ? { pdfVisible: state.visible } : {},
    };
  }
  if (state.quitar && state.guardado !== null) {
    return { archivo: undefined, datos: { quitarPdf: true } };
  }
  if (conVisibilidad && state.guardado !== null && state.visible !== state.guardado.visible) {
    return { archivo: undefined, datos: { pdfVisible: state.visible } };
  }
  return { archivo: undefined, datos: {} };
}
