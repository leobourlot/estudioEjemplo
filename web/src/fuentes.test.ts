/// <reference types="node" />
// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import loadConfig from 'tailwindcss/loadConfig.js';
import { describe, expect, it } from 'vitest';
import indexHtml from '../index.html?raw';
import { MARCA } from './servicios/marca';

// Vitest no procesa CSS: la hoja de estilos y la configuración de Tailwind se leen como archivos,
// desde web/, donde corre la suite.
const indexCss = readFileSync('src/index.css', 'utf8');
const tailwindConfig = readFileSync('tailwind.config.js', 'utf8');

/**
 * Spec 007, RF-3 y RF-40; spec 009, RF-3 y RF-8: los títulos usan la tipografía de la marca, con
 * sus archivos y su licencia dentro del sitio, declarada desde el archivo de marca. Ni la hoja de
 * estilos ni index.html piden tipografías a otros sitios.
 */

const { familia, archivos, precarga } = MARCA.tipografiaTitulos;

/** El CSS base que genera Tailwind con la configuración real del sitio. */
async function baseCss(): Promise<string> {
  const config = loadConfig(resolve('tailwind.config.js'));
  const result = await postcss([tailwindcss({ ...config, content: [{ raw: '' }] })]).process(
    '@tailwind base;',
    { from: undefined },
  );
  return result.css;
}

describe('tipografía de los títulos (spec 007, RF-3 y RF-40; spec 009, RF-8)', () => {
  it('cada archivo de la marca está en public/, junto a su licencia', () => {
    for (const { ruta } of archivos) expect(existsSync(`public${ruta}`), ruta).toBe(true);
    const folder = `public${dirname(archivos[0].ruta)}`;
    expect(readdirSync(folder).some((name) => name.endsWith('.txt'))).toBe(true);
  });

  it('Tailwind declara una @font-face por archivo, con font-display: swap', async () => {
    const css = await baseCss();

    expect(css.match(/@font-face/g)).toHaveLength(archivos.length);
    expect(css.match(/font-display: swap/g)).toHaveLength(archivos.length);
    for (const { ruta, peso } of archivos) {
      expect(css).toContain(`url('${ruta}') format('woff2')`);
      expect(css).toContain(`font-weight: ${peso}`);
    }
    expect(css).toContain(`font-family: '${familia}'`);
  });

  it('la configuración de Tailwind toma la tipografía y los colores de la marca', () => {
    expect(tailwindConfig).toContain('fontFaceRules(MARCA.tipografiaTitulos)');
    expect(tailwindConfig).toContain('titleFontStack(MARCA.tipografiaTitulos)');
    expect(tailwindConfig).toContain('estudio: { ...MARCA.colores }');
  });

  it('la hoja de estilos no declara tipografías a mano ni pide nada a otros sitios', () => {
    expect(indexCss).not.toContain('@font-face');
    expect(indexCss).not.toMatch(/url\(['"]?https?:|@import/);
  });

  it('index.html deja el lugar de la marca y no pide nada a otros sitios', () => {
    expect(indexHtml).toContain('<!--marca-->');
    expect(indexHtml).not.toMatch(/(href|src)="https?:/);
    expect(indexHtml).not.toContain(precarga);
  });
});
