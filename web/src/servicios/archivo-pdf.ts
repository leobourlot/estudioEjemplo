/**
 * El PDF elegido en un formulario (spec 010; plan 010, "Comportamiento de la interfaz"). La
 * interfaz rechaza antes de enviar un archivo que no es un PDF o que supera los 5 MB, con los
 * mismos mensajes que la api, para no hacer esperar la subida; la api lo vuelve a verificar
 * (RNF de validación). No importa React (principio 3).
 */

/** Tamaño máximo de un PDF: 5 MB (RF-3). */
export const MAX_PDF_BYTES = 5_242_880;

/** Los primeros bytes donde se busca la marca de PDF, como los lectores de PDF (RF-3). */
const PDF_MARKER_WINDOW = 1024;

const PDF_MARKER = new TextEncoder().encode('%PDF-');

/** Los mensajes del archivo, iguales a los de la api (RF-4). */
export const PDF_FILE_MESSAGES = {
  notPdf: 'El archivo debe ser un PDF',
  empty: 'El archivo está vacío',
  tooLarge: 'El archivo no puede superar los 5 MB',
  onlyOne: 'Podés adjuntar un solo PDF',
} as const;

/** Si `bytes` contiene la marca de PDF. */
function containsMarker(bytes: Uint8Array): boolean {
  for (let inicio = 0; inicio + PDF_MARKER.length <= bytes.length; inicio++) {
    if (PDF_MARKER.every((byte, i) => bytes[inicio + i] === byte)) return true;
  }
  return false;
}

/**
 * El mensaje de la regla que el archivo no cumple, o null si es un PDF aceptable (RF-3, RF-4):
 * vacío, tamaño y marca de inicio en los primeros 1.024 bytes, en ese orden, como la api.
 */
export async function validatePdfFile(archivo: Blob): Promise<string | null> {
  if (archivo.size === 0) return PDF_FILE_MESSAGES.empty;
  if (archivo.size > MAX_PDF_BYTES) return PDF_FILE_MESSAGES.tooLarge;
  const inicio = new Uint8Array(await archivo.slice(0, PDF_MARKER_WINDOW).arrayBuffer());
  return containsMarker(inicio) ? null : PDF_FILE_MESSAGES.notPdf;
}

const KB = 1024;
const MB = 1024 * 1024;

/**
 * El tamaño sin decimales, redondeado al entero más cercano (RF-9): en KB si el redondeo da menos
 * de 1.024 KB, con un mínimo de "1 KB"; si no, en MB.
 */
export function formatPdfSize(bytes: number): string {
  const kb = Math.round(bytes / KB);
  if (kb < 1024) return `${Math.max(1, kb)} KB`;
  return `${Math.max(1, Math.round(bytes / MB))} MB`;
}

/**
 * Un formulario con archivo para la api (plan 010, D2): la parte `datos`, con el mismo JSON que
 * se enviaría sin archivo, y la parte `pdf`.
 */
export function pdfForm(datos: object, pdf: File): FormData {
  const form = new FormData();
  form.append('datos', JSON.stringify(datos));
  form.append('pdf', pdf);
  return form;
}

/** Si un mensaje de la api es de una regla del archivo: el formulario descarta el archivo (RF-11). */
export function isPdfFileError(mensaje: string): boolean {
  return (Object.values(PDF_FILE_MESSAGES) as string[]).includes(mensaje);
}
