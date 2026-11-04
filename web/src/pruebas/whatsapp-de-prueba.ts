import { screen, within } from '@testing-library/react';

/**
 * Ayudas para los tests del botón de WhatsApp (spec 007, RF-22, RF-26 y RF-27; spec 009, RF-7).
 * Con dos o más WhatsApp, el botón abre un menú con una opción por cada uno; con uno solo, el
 * botón es un enlace que abre la conversación directamente. Las ayudas sirven para los dos casos,
 * así los tests de las páginas no dependen de cuántos WhatsApp tenga la marca.
 */

export const WHATSAPP_BUTTON = 'Escribinos por WhatsApp';

/** El botón flotante: el <summary> del menú o, con un solo WhatsApp, el enlace directo. */
export function whatsappButton(): HTMLElement {
  return (
    screen.queryByLabelText(WHATSAPP_BUTTON, { selector: 'summary' }) ??
    screen.getByRole('link', { name: WHATSAPP_BUTTON })
  );
}

/** El elemento fijo abajo a la derecha: el <details> del menú o el enlace directo. */
export function whatsappFloating(): HTMLElement {
  const button = whatsappButton();
  return button.closest('details') ?? button;
}

/** Los enlaces del botón: las opciones del menú o, con un solo WhatsApp, el enlace directo. */
function whatsappLinks(): HTMLElement[] {
  const menu = screen.queryByRole('list', { name: WHATSAPP_BUTTON });
  return menu ? within(menu).getAllByRole('link') : [whatsappButton()];
}

/** Las opciones del botón: el texto, el número del enlace y el mensaje ya escrito. */
export function whatsappMenu() {
  return whatsappLinks().map((link) => {
    const url = new URL(link.getAttribute('href')!);
    return {
      texto: link.textContent,
      numero: url.pathname.slice(1),
      mensaje: url.searchParams.get('text'),
    };
  });
}

/** El mensaje del botón, que es el mismo en todas sus opciones. */
export function whatsappMessage(): string | null {
  const messages = new Set(whatsappMenu().map((opcion) => opcion.mensaje));
  if (messages.size !== 1) throw new Error('Las opciones del botón no tienen el mismo mensaje');
  return [...messages][0];
}
