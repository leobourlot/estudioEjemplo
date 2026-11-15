import { whatsappUrl } from './datos-estudio';
import type { WhatsappEstudio } from './tipos-marca';

/**
 * Datos de contacto de Bourder Web, que mantiene el sistema (spec 011, RF-34; plan 011, D9). Son
 * los mismos para todos los estudios y no cambian con la marca, así que no van en el archivo de
 * marca. Son la excepción del principio 5 de la constitución para Bourder Web, y el test de la
 * spec 009 (RF-13) no revisa este archivo (spec 011, RF-35). Ningún otro archivo los repite.
 */

const WHATSAPP: WhatsappEstudio = {
  nombre: 'Bourder Web',
  numero: '5493454017104',
  visible: '+54 9 345 401-7104',
};

export const BOURDER_WEB = {
  nombre: 'Bourder Web',
  /** El sitio, también el del enlace "Diseñado por" del pie (spec 009, RF-10). */
  sitioUrl: 'https://bourderweb.com.ar',
  /** El sitio como se muestra en el contacto (T-12). */
  sitioVisible: 'bourderweb.com.ar',
  whatsapp: WHATSAPP,
} as const;

/** Por qué se contacta: para el plan Premium (T-2, T-3) o por espacio (T-8, T-9). */
export type MotivoContacto = 'premium' | 'espacio';

/** T-13: el mensaje del WhatsApp, con el nombre completo del estudio. */
export function contactMessage(motivo: MotivoContacto, nombreEstudio: string): string {
  const saludo = `Hola, te escribo desde el sistema de ${nombreEstudio}.`;
  return motivo === 'premium'
    ? `${saludo} Quiero consultar por el plan Premium.`
    : `${saludo} Necesitamos más espacio para PDF.`;
}

/** El enlace al WhatsApp de Bourder Web, con el mensaje T-13 escrito (RF-33). */
export function bourderWhatsappUrl(motivo: MotivoContacto, nombreEstudio: string): string {
  return whatsappUrl(BOURDER_WEB.whatsapp, contactMessage(motivo, nombreEstudio));
}
