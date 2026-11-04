import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { headingOutline, renderAt, stubSessionStatus } from '../pruebas/sitio-de-prueba';
import { whatsappMessage } from '../pruebas/whatsapp-de-prueba';
import {
  ABOGADAS,
  APERTURA,
  hasOwnPage,
  INTRO_SERVICIOS,
  lawyerName,
  MENSAJES_WHATSAPP,
  SERVICIOS,
  TEAM_SECTION_ID,
  TEXTOS,
} from '../servicios/contenido-sitio';
import { initialsOf } from '../servicios/presentacion-sitio';
import { SitioInicio } from './SitioInicio';
import { MARCA } from '../servicios/marca';

beforeEach(() => {
  stubSessionStatus(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SitioInicio (spec 007, RF-11, RF-12 y RF-18)', () => {
  it('tiene un único h1 con el nombre del estudio, y los títulos en orden', () => {
    const { container } = renderAt('/', <SitioInicio />);

    expect(headingOutline(container)).toEqual([
      `h1 ${MARCA.nombre}`,
      'h2 Seguí tus casos desde donde estés',
      'h2 Nuestros servicios',
      ...SERVICIOS.map((servicio) => `h3 ${servicio.nombre}`),
      `h2 ${MARCA.equipo.titulo}`,
      ...ABOGADAS.map((abogada) => `h3 ${lawyerName(abogada)}`),
      'h2 Contactate con nosotros',
    ]);
  });

  it('la apertura muestra T-1', () => {
    renderAt('/', <SitioInicio />);

    expect(screen.getByText(APERTURA)).toBeTruthy();
  });

  it('la apertura lleva de fondo la balanza, decorativa y detrás del texto', () => {
    renderAt('/', <SitioInicio />);

    const opening = screen.getByRole('heading', { level: 1 }).closest('section')!;
    const scale = opening.querySelector('[data-balanza]')!;
    expect(scale.getAttribute('aria-hidden')).toBe('true');
    expect(scale.getAttribute('class')).toContain('absolute');
    expect(scale.getAttribute('class')).toContain('pointer-events-none');
    expect(scale.nextElementSibling!.className).toContain('relative');
    expect(opening.className).toContain('overflow-hidden');
  });

  it('entre la apertura y Servicios va la sección Portal de clientes (RF-11, RF-47)', () => {
    renderAt('/', <SitioInicio />);

    const section = document.getElementById('portal')!;
    expect(
      section.previousElementSibling!.contains(screen.getByRole('heading', { level: 1 })),
    ).toBe(true);
    expect(section.nextElementSibling!.id).toBe('servicios');
    expect(within(section).getByText(TEXTOS.portal.leyenda, { selector: 'p' })).toBeTruthy();
    expect(within(section).getByRole('heading', { level: 2 }).textContent).toBe(
      'Seguí tus casos desde donde estés',
    );
  });

  it('el botón lleva a la dirección del portal, sin consultar la sesión (RF-47)', () => {
    renderAt('/', <SitioInicio />);

    const section = document.getElementById('portal')!;
    const links = within(section).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toBe('Ir al portal de clientes');
    expect(links[0].getAttribute('href')).toBe('/portal');
  });

  it('la sección muestra la maqueta del portal como una sola imagen (RF-47)', () => {
    renderAt('/', <SitioInicio />);

    const section = document.getElementById('portal')!;
    expect(
      within(section).getByRole('img', { name: TEXTOS.portal.descripcionMaqueta }),
    ).toBeTruthy();
  });

  it('la sección Servicios muestra T-2 y las cuatro tarjetas, en orden', () => {
    renderAt('/', <SitioInicio />);

    const section = document.getElementById('servicios')!;
    expect(within(section).getByText(INTRO_SERVICIOS)).toBeTruthy();
    const links = within(section)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'));
    expect(links).toEqual(SERVICIOS.map((s) => s.ruta));
  });

  it('la sección del equipo muestra una tarjeta por integrante de la marca', () => {
    renderAt('/', <SitioInicio />);

    const section = document.getElementById(TEAM_SECTION_ID)!;
    for (const abogada of ABOGADAS) {
      expect(within(section).getByText(initialsOf(abogada.nombre))).toBeTruthy();
    }
    expect(within(section).queryAllByRole('link')).toHaveLength(ABOGADAS.filter(hasOwnPage).length);
  });

  it('las secciones tienen su "#" y su título recibe el foco', () => {
    renderAt('/', <SitioInicio />);

    for (const id of ['portal', 'servicios', TEAM_SECTION_ID, 'contacto']) {
      const section = document.getElementById(id)!;
      expect(section.querySelector('h2')!.getAttribute('tabindex')).toBe('-1');
    }
  });

  it('usa el mensaje de WhatsApp del inicio y pone su título', () => {
    renderAt('/', <SitioInicio />);

    expect(whatsappMessage()).toBe(MENSAJES_WHATSAPP.general);
    expect(document.title).toBe(MARCA.nombre);
  });
});
