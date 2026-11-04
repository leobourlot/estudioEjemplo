import { render, screen, within } from '@testing-library/react';
import { domAnimation, LazyMotion } from 'motion/react';
import { describe, expect, it } from 'vitest';
import { CONTACTO_DE_PRUEBA } from '../pruebas/contacto-de-prueba';
import { STUDIO_CONTACT, type WhatsappAbogada, whatsappUrl } from '../servicios/datos-estudio';
import { MARCA } from '../servicios/marca';
import { DisenoMarca } from './DisenoMarca';
import { COLORES_REDES } from './IconosRedes';

// Dos WhatsApp y una dirección ficticios, para probar la forma sin depender de la marca.
const WHATSAPPS = CONTACTO_DE_PRUEBA.whatsapps;
const ADDRESS = CONTACTO_DE_PRUEBA.direccion!;
const label = (whatsapp: WhatsappAbogada) => `${whatsapp.nombre}: ${whatsapp.visible}`;

function renderBrand(props: Partial<Parameters<typeof DisenoMarca>[0]> = {}) {
  return render(
    <LazyMotion features={domAnimation}>
      <DisenoMarca {...props}>
        <h1>Ingresar</h1>
      </DisenoMarca>
    </LazyMotion>,
  );
}

describe('DisenoMarca (spec 008, RF-11, RF-12 y RF-14)', () => {
  it('el logo y el nombre llevan al sitio público, sin anunciar el logo dos veces', () => {
    renderBrand();

    const home = screen.getByRole('link', { name: STUDIO_CONTACT.nombre });
    expect(home.getAttribute('href')).toBe('/');
    const logo = home.querySelector('img')!;
    expect(logo.getAttribute('src')).toBe(MARCA.archivos.logo.ruta);
    expect(logo.getAttribute('alt')).toBe('');
  });

  it('la tarjeta va en la región principal, con lugar abajo para el botón de WhatsApp', () => {
    renderBrand();

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Ingresar' })).toBeTruthy();
    expect(main.className).toContain('pb-24');
  });

  it('con contacto, muestra la dirección y cada WhatsApp sin mensaje, separados por " · "', () => {
    renderBrand({ conContacto: true, contact: CONTACTO_DE_PRUEBA });

    const links = WHATSAPPS.map((whatsapp) => screen.getByRole('link', { name: label(whatsapp) }));
    links.forEach((link, index) => {
      expect(link.getAttribute('href')).toBe(whatsappUrl(WHATSAPPS[index]));
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });
    expect(links[0].closest('p')!.textContent).toBe(
      `${ADDRESS} · ${label(WHATSAPPS[0])} · ${label(WHATSAPPS[1])}`,
    );
  });

  it('sin otros datos, muestra los WhatsApp de la marca (spec 009, RF-1)', () => {
    renderBrand({ conContacto: true });

    for (const whatsapp of STUDIO_CONTACT.whatsapps) {
      expect(screen.getByRole('link', { name: label(whatsapp) })).toBeTruthy();
    }
  });

  it('antes de cada número va el ícono de WhatsApp en verde, con su contorno, sin anunciarse', () => {
    renderBrand({ conContacto: true, contact: CONTACTO_DE_PRUEBA });

    for (const whatsapp of WHATSAPPS) {
      const link = screen.getByRole('link', { name: label(whatsapp) });
      const icon = link.querySelector('svg')!;
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(link.firstElementChild).toBe(icon);
      const fills = Array.from(icon.querySelectorAll('[fill]')).map((e) => e.getAttribute('fill'));
      expect(fills).toContain(COLORES_REDES.whatsapp);
      expect(icon.querySelector(`[stroke="${MARCA.colores.blanco}"]`)).toBeTruthy();
    }
  });

  it('sin dirección informada, solo los WhatsApp, sin " · " adelante (spec 007, RF-24)', () => {
    renderBrand({ conContacto: true, contact: { ...CONTACTO_DE_PRUEBA, direccion: null } });

    const link = screen.getByRole('link', { name: label(WHATSAPPS[0]) });
    expect(link.closest('p')!.textContent).toBe(`${label(WHATSAPPS[0])} · ${label(WHATSAPPS[1])}`);
  });

  it('sin contacto, no muestra la dirección ni el WhatsApp (RF-14)', () => {
    renderBrand({ contact: CONTACTO_DE_PRUEBA });

    expect(screen.queryByRole('link', { name: label(WHATSAPPS[0]) })).toBeNull();
    expect(screen.queryByText(ADDRESS)).toBeNull();
  });
});
