/**
 * Ver y descargar un PDF que entregó la api (spec 010, RF-28; plan 010, D4 y D5). Usa el DOM del
 * navegador, no React, como portapapeles.ts. Las funciones reciben lo que usan del navegador como
 * parámetro para poder probarlas.
 */

/** Lo que se usa de URL para crear y liberar direcciones `blob:`. */
export interface ObjectUrls {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
}

/** Cuánto se espera para liberar la dirección: el navegador ya empezó la descarga. */
const REVOKE_DELAY_MS = 1000;

/**
 * Descarga el archivo con su nombre (RF-7) mediante un enlace `download` temporal, sin cambiar
 * de pantalla (D5). La dirección `blob:` se libera enseguida.
 */
export function saveFile(
  blob: Blob,
  nombre: string,
  doc: Document = document,
  urls: ObjectUrls = URL,
): void {
  const url = urls.createObjectURL(blob);
  const enlace = doc.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.hidden = true;
  doc.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => urls.revokeObjectURL(url), REVOKE_DELAY_MS);
}

/**
 * Muestra el PDF en la pestaña actual con el visor del navegador (D4). El tipo del Blob lo fija
 * la web, no el archivo: aunque el contenido esconda una página web, el navegador lo trata como
 * PDF (RNF de seguridad). La dirección no se libera: la pestaña pasa a mostrarla.
 */
export function openPdfInPlace(
  blob: Blob,
  location: Pick<Location, 'replace'> = window.location,
  urls: ObjectUrls = URL,
): void {
  const pdf = new Blob([blob], { type: 'application/pdf' });
  location.replace(urls.createObjectURL(pdf));
}
