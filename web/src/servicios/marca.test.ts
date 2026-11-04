import { describe, expect, it } from 'vitest';
import { MARCA } from './marca';
import marcaSource from './marca.ts?raw';

/**
 * Spec 009, RF-1 a RF-4: el archivo de marca solo tiene datos, coherentes entre sí. Los tests no
 * escriben ningún dato de la marca: lo leen de MARCA (RF-14).
 */

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe('archivo de marca (spec 009, RF-1 a RF-4)', () => {
  it('no importa nada que se ejecute: solo tipos (principio 3; plan 009, D1)', () => {
    const imports = marcaSource.split(/\r?\n/).filter((line) => /^\s*import\b/.test(line));

    expect(imports.length).toBeGreaterThan(0);
    for (const line of imports) expect(line).toMatch(/^import type /);
  });

  it('no usa variables de entorno, que Tailwind y Vite no tienen al leerlo', () => {
    expect(marcaSource).not.toContain('import.meta');
    expect(marcaSource).not.toContain('process.env');
  });

  it('el nombre en dos líneas tiene las mismas palabras que el nombre completo', () => {
    const [first, second] = MARCA.nombreLineas;
    expect(MARCA.nombre).toContain(first);
    expect(MARCA.nombre).toContain(second);
  });

  it('cada integrante tiene una dirección válida y distinta', () => {
    const slugs = MARCA.integrantes.map((integrante) => integrante.slug);

    expect(MARCA.integrantes.length).toBeGreaterThan(0);
    for (const slug of slugs) expect(slug).toMatch(SLUG);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('la palabra de las direcciones del equipo es válida (spec 007, RF-8)', () => {
    expect(MARCA.equipo.ruta).toMatch(SLUG);
  });

  it('tiene al menos un WhatsApp, con el número del enlace igual al visible sin signos', () => {
    expect(MARCA.contacto.whatsapps.length).toBeGreaterThan(0);
    for (const whatsapp of MARCA.contacto.whatsapps) {
      expect(whatsapp.numero).toBe(whatsapp.visible.replace(/[^0-9]/g, ''));
    }
  });

  it('los colores tienen la forma #RRGGBB', () => {
    for (const color of Object.values(MARCA.colores)) expect(color).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('las imágenes y la tipografía están dentro del sitio, sin pedirlas a otros (spec 007, RF-40)', () => {
    const { logo, logoEncabezado, logoPng, favicon, compartir } = MARCA.archivos;
    const paths = [
      logo.ruta,
      logoEncabezado.ruta,
      logoPng,
      favicon,
      compartir,
      MARCA.tipografiaTitulos.precarga,
      ...MARCA.tipografiaTitulos.archivos.map((archivo) => archivo.ruta),
      ...MARCA.integrantes.flatMap((integrante) => (integrante.foto ? [integrante.foto] : [])),
    ];
    for (const path of paths) expect(path).toMatch(/^\/[^/]/);
  });

  it('la tipografía precarga uno de sus propios archivos', () => {
    const files = MARCA.tipografiaTitulos.archivos.map((archivo) => archivo.ruta);
    expect(files).toContain(MARCA.tipografiaTitulos.precarga);
  });

  it('la leyenda de derechos tiene el lugar del año', () => {
    expect(MARCA.textos.derechos).toContain('<año>');
  });
});
