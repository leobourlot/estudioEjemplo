import { randomInt } from 'node:crypto';
import type { TipoMovimiento } from '../movimientos/movimiento.entity.js';

/**
 * Reglas de los PDF de movimientos y fallos (spec 010; plan, "Reglas puras"). Funciones puras,
 * sin acceso a la base.
 */

/** Tamaño máximo de un PDF: 5 MB (RF-3). */
export const MAX_PDF_BYTES = 5_242_880;

/** Margen para la parte `datos` y los separadores de un formulario con archivo (plan, D3). */
export const PDF_FORM_MARGIN_BYTES = 65_536;

/** Los primeros bytes donde se busca la marca de PDF, como los lectores de PDF (RF-3). */
export const PDF_MARKER_WINDOW = 1024;

/** Cuántos PDF puede tener la base con el modo demo encendido (RF-41). */
export const DEMO_PDF_LIMIT = 4;

const PDF_MARKER = Buffer.from('%PDF-', 'latin1');

export const PDF_MESSAGES = {
  notPdf: 'El archivo debe ser un PDF',
  empty: 'El archivo está vacío',
  tooLarge: 'El archivo no puede superar los 5 MB',
  onlyOne: 'Podés adjuntar un solo PDF',
  invalidForm: 'Los datos del formulario no son válidos',
  notFound: 'No existe ese PDF',
  movementWithoutPdf: 'El movimiento no tiene PDF',
  attachAndRemove: 'No se puede adjuntar y quitar el PDF a la vez',
  demoLimit: 'En la demo se pueden tener hasta 4 PDF. Quitá uno para subir otro',
  quitarPdf: 'Para quitar el PDF, indicá sí',
} as const;

/**
 * Regla del campo `quitarPdf` de los DTO de modificación de movimientos y fallos (RF-14): solo
 * se indica con `true`. Con la forma de las reglas de usuarios/dto/reglas.ts.
 */
export const quitarPdfRule = (value: unknown): string | null =>
  value === true ? null : PDF_MESSAGES.quitarPdf;

/**
 * El mensaje de la regla que el contenido no cumple, o null si es un PDF aceptable (RF-3,
 * RF-4). Orden: vacío, tamaño y marca de inicio dentro de los primeros 1.024 bytes.
 */
export function validatePdfContent(contenido: Buffer): string | null {
  if (contenido.length === 0) return PDF_MESSAGES.empty;
  if (contenido.length > MAX_PDF_BYTES) return PDF_MESSAGES.tooLarge;
  if (!contenido.subarray(0, PDF_MARKER_WINDOW).includes(PDF_MARKER)) return PDF_MESSAGES.notPdf;
  return null;
}

/** Letras mayúsculas sin tildes y números (RF-6). */
export const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 6;

/** Un código de 6 caracteres al azar (RF-6). `random(max)` devuelve un entero en [0, max). */
export function generateCode(random: (max: number) => number = randomInt): string {
  let codigo = '';
  for (let i = 0; i < CODE_LENGTH; i++) codigo += CODE_ALPHABET[random(CODE_ALPHABET.length)];
  return codigo;
}

/** El tipo de movimiento como va en el nombre del archivo, sin tildes (RF-7). */
export const TYPE_NAMES_WITHOUT_ACCENTS: Readonly<Record<TipoMovimiento, string>> = {
  escrito_presentado: 'Escrito presentado',
  providencia: 'Providencia',
  resolucion: 'Resolucion',
  sentencia: 'Sentencia',
  notificacion: 'Notificacion',
  audiencia: 'Audiencia',
  pericia: 'Pericia',
  oficio: 'Oficio',
  otro: 'Otro',
};

/** "2026-10-24 Resolucion K7Q2MX.pdf": fecha, tipo sin tildes y código (RF-7). */
export function movementPdfName(
  movimiento: { fecha: string; tipo: TipoMovimiento },
  codigo: string,
): string {
  return `${movimiento.fecha} ${TYPE_NAMES_WITHOUT_ACCENTS[movimiento.tipo]} ${codigo}.pdf`;
}

/** "Fallo 2019-05-12 P4N8RC.pdf" (RF-7). */
export function rulingPdfName(fallo: { fecha: string }, codigo: string): string {
  return `Fallo ${fallo.fecha} ${codigo}.pdf`;
}
