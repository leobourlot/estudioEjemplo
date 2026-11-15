/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BOURDER_WEB, bourderWhatsappUrl, contactMessage } from './bourder-web';
import { MARCA } from './marca';

// Vitest corre la suite desde web/. Los datos se comparan con el anexo de la spec y no se escriben
// acá: el WhatsApp de Bourder Web es el de la marca de ejemplo, y el test de la spec 009 (RF-13)
// solo exceptúa bourder-web.ts (spec 011, RF-35).
const SPEC = readFileSync(
  resolve('..', 'docs', 'specs', '011-planes-de-suscripcion', 'spec.md'),
  'utf8',
);

/** Spec 011, RF-33 y RF-34: el contacto de Bourder Web en los avisos del plan. */
describe('datos de Bourder Web', () => {
  it('el sitio y el WhatsApp son los de T-12', () => {
    const { whatsapp, sitioUrl, sitioVisible } = BOURDER_WEB;

    expect(SPEC).toContain(
      `"WhatsApp: ${whatsapp.visible}", que abre la conversación con ${whatsapp.numero}.`,
    );
    expect(SPEC).toContain(`"${sitioVisible}", que lleva a ${sitioUrl}.`);
    expect(whatsapp.visible.replace(/\D/g, '')).toBe(whatsapp.numero);
  });

  it('los dos mensajes T-13, con el nombre del estudio de la marca', () => {
    expect(contactMessage('premium', MARCA.nombre)).toBe(
      `Hola, te escribo desde el sistema de ${MARCA.nombre}. Quiero consultar por el plan Premium.`,
    );
    expect(contactMessage('espacio', MARCA.nombre)).toBe(
      `Hola, te escribo desde el sistema de ${MARCA.nombre}. Necesitamos más espacio para PDF.`,
    );
  });

  it('el enlace abre la conversación con el mensaje escrito', () => {
    const url = new URL(bourderWhatsappUrl('espacio', 'Estudio Ejemplo'));

    expect(url.origin + url.pathname).toBe(`https://wa.me/${BOURDER_WEB.whatsapp.numero}`);
    expect(url.searchParams.get('text')).toBe(contactMessage('espacio', 'Estudio Ejemplo'));
  });
});
