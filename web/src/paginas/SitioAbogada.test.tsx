import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { headingOutline, renderAt, stubSessionStatus } from '../pruebas/sitio-de-prueba';
import { whatsappMessage } from '../pruebas/whatsapp-de-prueba';
import {
  ABOGADAS,
  hasOwnPage,
  lawyerName,
  lawyerPath,
  MENSAJES_WHATSAPP,
  photoAlt,
  SERVICIOS,
  teamSectionPath,
  TEXTOS,
} from '../servicios/contenido-sitio';
import { MARCA } from '../servicios/marca';
import { initialsOf, pageTitle } from '../servicios/presentacion-sitio';
import { SitioAbogada } from './SitioAbogada';
import { SitioNoEncontrada } from './SitioNoEncontrada';

const withPage = ABOGADAS.filter(hasOwnPage).map((abogada) => [abogada.nombre, abogada] as const);

const whatsappText = whatsappMessage;

beforeEach(() => {
  stubSessionStatus(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SitioAbogada (spec 007, RF-7 y RF-19; spec 009, RF-5 y RF-6)', () => {
  it.each(withPage)(
    'la de %s: volver al equipo, iniciales, nombre, título profesional y texto completo',
    (_nombre, abogada) => {
      const { container } = renderAt(lawyerPath(abogada), <SitioAbogada abogada={abogada} />);

      expect(
        screen.getByRole('link', { name: TEXTOS.detalle.volverAAbogadas }).getAttribute('href'),
      ).toBe(teamSectionPath());
      expect(screen.getByText(initialsOf(abogada.nombre))).toBeTruthy();
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(lawyerName(abogada));
      expect(within(screen.getByRole('main')).getByText(abogada.titulo)).toBeTruthy();
      const paragraphs = Array.from(screen.getByRole('main').querySelectorAll('p')).map(
        (p) => p.textContent,
      );
      expect(paragraphs).toEqual([abogada.titulo, ...abogada.texto!]);
      expect(headingOutline(container)).toEqual([
        `h1 ${lawyerName(abogada)}`,
        'h2 Contactate con nosotros',
      ]);
      if (abogada.foto) expect(screen.getByRole('img', { name: photoAlt(abogada) })).toBeTruthy();
    },
  );

  it.each(withPage)(
    'la de %s usa el mensaje general de WhatsApp y pone su título',
    (_n, abogada) => {
      renderAt(lawyerPath(abogada), <SitioAbogada abogada={abogada} />);

      expect(whatsappText()).toBe(MENSAJES_WHATSAPP.general);
      expect(document.title).toBe(pageTitle(lawyerName(abogada)));
    },
  );
});

describe('SitioNoEncontrada (spec 007, RF-9 y RF-42)', () => {
  const PATH = '/servicios/no-existe-esto?texto=<script>alert(1)</script>#algo';

  it('muestra el aviso, "Ir al inicio" y los cuatro servicios', () => {
    renderAt(PATH, <SitioNoEncontrada />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('No encontramos esa página');
    expect(
      screen.getByText('Puede que la dirección esté mal escrita o que la página ya no exista.'),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ir al inicio' }).getAttribute('href')).toBe('/');
    const services = within(screen.getByRole('navigation', { name: 'Servicios' }));
    expect(services.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(
      SERVICIOS.map((s) => s.ruta),
    );
  });

  it('nunca muestra la dirección pedida ni lo que viene después del "?"', () => {
    const { container } = renderAt(PATH, <SitioNoEncontrada />);

    expect(container.textContent).not.toContain('no-existe-esto');
    expect(container.textContent).not.toContain('script');
    expect(container.textContent).not.toContain('algo');
    expect(container.querySelector('script')).toBeNull();
  });

  it('tiene el encabezado, el contacto, el botón de WhatsApp y su título', () => {
    renderAt(PATH, <SitioNoEncontrada />);

    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Contactate con nosotros' })).toBeTruthy();
    expect(whatsappText()).toBe(MENSAJES_WHATSAPP.general);
    expect(document.title).toBe(`Página no encontrada · ${MARCA.nombre}`);
  });
});
