import { MARCA } from './marca';
import { REDES_DE_MUESTRA } from './redes-de-muestra';
import type { ContactoMarca, EmailEstudio, RedSocial, WhatsappEstudio } from './tipos-marca';

/**
 * Datos de contacto del estudio (spec 007, RF-3 y RF-22 a RF-24; spec 004, RF-18 y RF-19). Son
 * públicos y fijos y salen del archivo de marca (spec 009, RF-1): no se editan desde el panel. Son
 * la única fuente del nombre y del contacto para el sitio público, el ingreso, el portal y el
 * panel.
 */

export type { RedSocial };

/** Un WhatsApp del estudio, de una integrante o del estudio (spec 009, RF-7). */
export type WhatsappAbogada = WhatsappEstudio;

/** Un email del estudio, de una integrante o del estudio (spec 009, RF-7). */
export type EmailAbogada = EmailEstudio;

export interface StudioContact extends ContactoMarca {
  nombre: string;
  /** El nombre como se muestra en pantalla: la primera línea no se corta (RF-3). */
  nombreLineas: readonly [string, string];
}

export const STUDIO_CONTACT: StudioContact = {
  nombre: MARCA.nombre,
  nombreLineas: MARCA.nombreLineas,
  ...MARCA.contacto,
};

/**
 * Enlace que abre una conversación de WhatsApp con una abogada. Con un mensaje, lo deja escrito
 * para que el visitante lo cambie o lo envíe (spec 007, RF-27); sin mensaje, la abre vacía, como
 * en el ingreso y el portal (spec 004, RF-19).
 */
export function whatsappUrl(whatsapp: WhatsappAbogada, mensaje?: string): string {
  const base = `https://wa.me/${whatsapp.numero}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

/** Enlace "Cómo llegar": la dirección en Google Maps (spec 007, RF-23). */
export function mapsUrl(direccion: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
}

/**
 * Las redes que se muestran: las del estudio o, si se pide y el estudio todavía no informó
 * ninguna, las de muestra (spec 007, RF-24). Regla pura, para los tests.
 */
export function pickNetworks(
  redes: readonly RedSocial[],
  muestra: readonly RedSocial[] | null,
): readonly RedSocial[] {
  return redes.length === 0 && muestra ? muestra : redes;
}

/**
 * Las redes del bloque de contacto y del pie. Las de muestra solo en la versión de desarrollo:
 * al construir para publicar, Vite reemplaza la condición por `false` y elimina la rama, así las
 * redes de muestra no quedan ni en el código publicado (spec 007, RF-24).
 */
export function networksToShow(contact: StudioContact = STUDIO_CONTACT): readonly RedSocial[] {
  if (import.meta.env.MODE === 'development') return pickNetworks(contact.redes, REDES_DE_MUESTRA);
  return contact.redes;
}
