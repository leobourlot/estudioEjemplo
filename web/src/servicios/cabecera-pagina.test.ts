import { describe, expect, it } from 'vitest';
import { buildHead, escapeHtml, jsonForScript, legalServiceData } from './cabecera-pagina';
import { CONTACTO_DE_PRUEBA } from '../pruebas/contacto-de-prueba';
import { STUDIO_CONTACT, type StudioContact } from './datos-estudio';
import { MARCA } from './marca';
import { NOT_FOUND_PAGE, PUBLIC_PAGES, publicPageFor } from './rutas-sitio';

const SITE = 'https://ejemplo.test';

/** Lee la cabecera con el DOM del navegador, como la leería un buscador. */
function parseHead(html: string): Document {
  return new DOMParser().parseFromString(`<html><head>${html}</head></html>`, 'text/html');
}

const metaContent = (doc: Document, selector: string) =>
  doc.querySelector(selector)?.getAttribute('content') ?? null;

describe('buildHead (RF-34, RF-36, RF-37)', () => {
  it.each(PUBLIC_PAGES.map((p) => [p.ruta, p] as const))(
    'arma título, descripción, dirección principal y vista previa de %s',
    (ruta, pagina) => {
      const doc = parseHead(buildHead(pagina, SITE));

      expect(doc.title).toBe(pagina.titulo);
      expect(metaContent(doc, 'meta[name="description"]')).toBe(pagina.descripcion);
      expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(SITE + ruta);
      expect(metaContent(doc, 'meta[property="og:title"]')).toBe(pagina.titulo);
      expect(metaContent(doc, 'meta[property="og:description"]')).toBe(pagina.descripcion);
      expect(metaContent(doc, 'meta[property="og:url"]')).toBe(SITE + ruta);
      expect(metaContent(doc, 'meta[property="og:image"]')).toBe(SITE + MARCA.archivos.compartir);
      expect(metaContent(doc, 'meta[property="og:image:alt"]')).toBe(STUDIO_CONTACT.nombre);
      expect(metaContent(doc, 'meta[property="og:site_name"]')).toBe(STUDIO_CONTACT.nombre);
      expect(metaContent(doc, 'meta[property="og:locale"]')).toBe('es_AR');
      expect(metaContent(doc, 'meta[property="og:type"]')).toBe('website');
      expect(metaContent(doc, 'meta[name="twitter:card"]')).toBe('summary_large_image');
      expect(doc.querySelector('meta[name="robots"]')).toBeNull();
    },
  );

  it('la página inexistente no se lista ni se comparte (RF-38)', () => {
    const doc = parseHead(buildHead(NOT_FOUND_PAGE, SITE));

    expect(doc.title).toBe(NOT_FOUND_PAGE.titulo);
    expect(metaContent(doc, 'meta[name="robots"]')).toBe('noindex');
    expect(doc.querySelector('meta[name="description"]')).toBeNull();
    expect(doc.querySelector('link[rel="canonical"]')).toBeNull();
    expect(doc.querySelector('meta[property^="og:"]')).toBeNull();
  });

  it('una pantalla de la aplicación no se lista (RF-38)', () => {
    const app = {
      ruta: '/app',
      titulo: STUDIO_CONTACT.nombre,
      descripcion: null,
      indexable: false,
    };
    const doc = parseHead(buildHead(app, SITE));

    expect(metaContent(doc, 'meta[name="robots"]')).toBe('noindex');
    expect(doc.querySelector('script')).toBeNull();
  });

  it('solo el inicio lleva los datos del estudio para buscadores', () => {
    const scripts = PUBLIC_PAGES.map(
      (p) =>
        parseHead(buildHead(p, SITE)).querySelectorAll('script[type="application/ld+json"]').length,
    );

    expect(scripts).toEqual(PUBLIC_PAGES.map((p) => (p.ruta === '/' ? 1 : 0)));
    const doc = parseHead(buildHead(publicPageFor('/')!, SITE));
    const data = JSON.parse(doc.querySelector('script')!.textContent!);
    expect(data).toEqual(legalServiceData(SITE));
  });

  it('escapa los valores: ningún texto puede abrir otra etiqueta', () => {
    const pagina = {
      ruta: '/x',
      titulo: 'A & B <script>alert(1)</script>',
      descripcion: 'Dice "hola" y \'chau\' <b>',
      indexable: true,
    };
    const html = buildHead(pagina, SITE);
    const doc = parseHead(html);

    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('<b>');
    expect(doc.title).toBe(pagina.titulo);
    expect(metaContent(doc, 'meta[name="description"]')).toBe(pagina.descripcion);
  });
});

describe('legalServiceData (RF-37)', () => {
  it('sin otros datos, lleva el nombre, los teléfonos y el logo de la marca (spec 009, RF-2)', () => {
    expect(legalServiceData(SITE)).toMatchObject({
      name: MARCA.nombre,
      url: `${SITE}/`,
      telephone: STUDIO_CONTACT.whatsapps.map((whatsapp) => `+${whatsapp.numero}`),
      logo: SITE + MARCA.archivos.logoPng,
      image: SITE + MARCA.archivos.logoPng,
    });
  });

  it('lleva nombre, dirección del sitio, teléfonos, logo, dirección, email y redes; sin horarios no los suma', () => {
    expect(legalServiceData(SITE, CONTACTO_DE_PRUEBA)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'LegalService',
      name: CONTACTO_DE_PRUEBA.nombre,
      url: `${SITE}/`,
      telephone: ['+5493410000001', '+5493410000002'],
      logo: SITE + MARCA.archivos.logoPng,
      image: SITE + MARCA.archivos.logoPng,
      address: { '@type': 'PostalAddress', streetAddress: CONTACTO_DE_PRUEBA.direccion },
      email: ['ana@estudio-de-prueba.test', 'luis@estudio-de-prueba.test'],
      sameAs: ['https://www.instagram.com/estudio-de-prueba/'],
    });
  });

  it('suma dirección, horarios, email y redes cuando el estudio los informa', () => {
    const contact: StudioContact = {
      ...CONTACTO_DE_PRUEBA,
      direccion: 'San Martín 123, Villaguay',
      horarios: ['Lunes a viernes de 8 a 13'],
      emails: [{ nombre: 'Dra. Ana Gómez', email: 'estudio@ejemplo.test' }],
      redes: [{ red: 'Instagram', usuario: '@estudio', url: 'https://instagram.com/estudio' }],
    };

    expect(legalServiceData(SITE, contact)).toMatchObject({
      address: { '@type': 'PostalAddress', streetAddress: 'San Martín 123, Villaguay' },
      openingHours: ['Lunes a viernes de 8 a 13'],
      email: ['estudio@ejemplo.test'],
      sameAs: ['https://instagram.com/estudio'],
    });
  });
});

describe('escapes', () => {
  it('escapeHtml escapa &, <, >, comillas dobles y simples', () => {
    expect(escapeHtml(`a & <b> "c" 'd'`)).toBe('a &amp; &lt;b&gt; &quot;c&quot; &#39;d&#39;');
  });

  it('jsonForScript no deja ningún "<" y sigue siendo el mismo JSON', () => {
    const data = { texto: '</script><script>alert(1)</script>' };
    const json = jsonForScript(data);

    expect(json).not.toContain('<');
    expect(JSON.parse(json)).toEqual(data);
  });
});

describe('buildHead en modo demo (spec 009, RF-25)', () => {
  const robots = (doc: Document) =>
    Array.from(doc.querySelectorAll('meta[name="robots"]')).map((m) => m.getAttribute('content'));

  it.each(PUBLIC_PAGES.map((p) => [p.ruta, p] as const))(
    '%s lleva la indicación de no listarla y conserva la vista previa al compartir',
    (_ruta, pagina) => {
      const doc = parseHead(buildHead(pagina, SITE, STUDIO_CONTACT, true));

      expect(robots(doc)).toEqual(['noindex']);
      expect(metaContent(doc, 'meta[property="og:image"]')).toBe(SITE + MARCA.archivos.compartir);
      expect(metaContent(doc, 'meta[property="og:title"]')).toBe(pagina.titulo);
    },
  );

  it('la página inexistente lleva una sola indicación de no listarla', () => {
    const doc = parseHead(buildHead(NOT_FOUND_PAGE, SITE, STUDIO_CONTACT, true));

    expect(robots(doc)).toEqual(['noindex']);
  });

  it('con el modo apagado, las páginas públicas no llevan la indicación (spec 007, RF-38)', () => {
    for (const pagina of PUBLIC_PAGES) {
      expect(robots(parseHead(buildHead(pagina, SITE, STUDIO_CONTACT, false)))).toEqual([]);
    }
  });
});
