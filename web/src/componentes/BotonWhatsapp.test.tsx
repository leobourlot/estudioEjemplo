import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { whatsappButton, whatsappMenu, WHATSAPP_BUTTON } from '../pruebas/whatsapp-de-prueba';
import { STUDIO_CONTACT, type StudioContact } from '../servicios/datos-estudio';
import { BotonWhatsapp } from './BotonWhatsapp';

// Dos WhatsApp ficticios: estos tests prueban el menú, sin depender de la marca (spec 009, RF-14).
const contact: StudioContact = {
  ...STUDIO_CONTACT,
  whatsapps: [
    { nombre: 'Dra. Ana Robledo', numero: '5493410000001', visible: '+54 9 341 000-0001' },
    { nombre: 'Dr. Luis Peña', numero: '5493410000002', visible: '+54 9 341 000-0002' },
  ],
};

const MESSAGE = 'Hola, me contacto desde el sitio web del estudio.';

const details = () => whatsappButton().closest('details')!;
const menu = () => within(screen.getByRole('list', { name: WHATSAPP_BUTTON }));

describe('BotonWhatsapp (spec 007, RF-22, RF-26 y RF-27; spec 004, RF-19)', () => {
  it('queda fijo abajo a la derecha', () => {
    render(<BotonWhatsapp contact={contact} />);

    expect(details().className).toContain('fixed');
    expect(details().className).toContain('bottom-4');
    expect(details().className).toContain('right-4');
  });

  it('abre un menú con cada WhatsApp, en el orden de la marca', () => {
    render(<BotonWhatsapp contact={contact} />);

    expect(whatsappMenu()).toEqual([
      {
        texto: 'Dra. Ana Robledo+54 9 341 000-0001',
        numero: '5493410000001',
        mensaje: null,
      },
      {
        texto: 'Dr. Luis Peña+54 9 341 000-0002',
        numero: '5493410000002',
        mensaje: null,
      },
    ]);
  });

  it('con mensaje, cada opción lo deja escrito', () => {
    render(<BotonWhatsapp contact={contact} mensaje={MESSAGE} />);

    expect(whatsappMenu().map((opcion) => opcion.mensaje)).toEqual([MESSAGE, MESSAGE]);
  });

  it('cada opción se abre aparte, sin control sobre la página de origen (RF-25)', () => {
    render(<BotonWhatsapp contact={contact} />);

    for (const link of menu().getAllByRole('link')) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('abre y cierra, e indica si está abierto', async () => {
    const user = userEvent.setup();
    render(<BotonWhatsapp contact={contact} />);

    expect(details().open).toBe(false);
    expect(whatsappButton().getAttribute('aria-expanded')).toBe('false');

    await user.click(whatsappButton());
    expect(details().open).toBe(true);
    expect(whatsappButton().getAttribute('aria-expanded')).toBe('true');

    await user.click(whatsappButton());
    expect(details().open).toBe(false);
  });

  it('se cierra con Escape, y el foco vuelve al botón', async () => {
    const user = userEvent.setup();
    render(<BotonWhatsapp contact={contact} />);
    await user.click(whatsappButton());
    menu().getAllByRole('link')[0].focus();

    await user.keyboard('{Escape}');

    expect(details().open).toBe(false);
    expect(document.activeElement).toBe(whatsappButton());
  });

  it('se cierra al elegir una opción y al tocar fuera', async () => {
    const user = userEvent.setup();
    render(
      <>
        <p>Afuera</p>
        <BotonWhatsapp contact={contact} />
      </>,
    );
    await user.click(whatsappButton());

    await user.click(screen.getByText('Afuera'));
    expect(details().open).toBe(false);

    await user.click(whatsappButton());
    await user.click(menu().getAllByRole('link')[1]);
    expect(details().open).toBe(false);
  });

  it('sin el código de la página, el menú y sus enlaces ya están en el HTML (RF-35)', () => {
    const html = renderToString(<BotonWhatsapp contact={contact} />);

    expect(html).toContain('<details');
    expect(html).toContain('href="https://wa.me/5493410000001"');
    expect(html).toContain('href="https://wa.me/5493410000002"');
  });
});

describe('BotonWhatsapp con un solo WhatsApp (spec 009, RF-7)', () => {
  const single: StudioContact = { ...contact, whatsapps: [contact.whatsapps[0]] };
  const link = () => screen.getByRole('link', { name: WHATSAPP_BUTTON });

  it('es un enlace que abre la conversación directamente, sin menú', () => {
    render(<BotonWhatsapp contact={single} />);

    expect(link().getAttribute('href')).toBe('https://wa.me/5493410000001');
    expect(screen.queryByRole('list', { name: WHATSAPP_BUTTON })).toBeNull();
    expect(document.querySelector('details')).toBeNull();
  });

  it('con mensaje lo deja escrito', () => {
    render(<BotonWhatsapp contact={single} mensaje={MESSAGE} />);

    expect(new URL(link().getAttribute('href')!).searchParams.get('text')).toBe(MESSAGE);
  });

  it('queda fijo abajo a la derecha, con el mismo aspecto, y se abre aparte (RF-25)', () => {
    render(<BotonWhatsapp contact={single} />);

    expect(link().className).toContain('fixed');
    expect(link().className).toContain('bottom-4');
    expect(link().className).toContain('right-4');
    expect(link().className).toContain('bg-green-600');
    expect(link().getAttribute('target')).toBe('_blank');
    expect(link().getAttribute('rel')).toBe('noopener noreferrer');
    expect(link().querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('sin el código de la página, el enlace ya está en el HTML (spec 007, RF-35)', () => {
    const html = renderToString(<BotonWhatsapp contact={single} />);

    expect(html).toContain('href="https://wa.me/5493410000001"');
    expect(html).not.toContain('<details');
  });
});
