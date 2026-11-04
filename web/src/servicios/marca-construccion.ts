import { escapeHtml } from './escapar-html.ts';
import type { Marca, TipografiaTitulos } from './tipos-marca.ts';

/**
 * Lo que la marca aporta al construir el sitio (spec 009, RF-2 y RF-8; plan 009, D10): las
 * @font-face y la familia de los títulos para Tailwind, y el favicon, el ícono de los teléfonos y
 * la precarga de la tipografía para la página base. Lo usan tailwind.config.js y vite.config.ts,
 * por eso importa con la extensión .ts y sin nada que dependa del navegador o de Vite. No importa
 * React (principio 3).
 */

/** Los caracteres de los archivos "latin" de las tipografías de licencia libre. */
const LATIN_UNICODE_RANGE =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

export interface FontFaceRule {
  '@font-face': {
    fontFamily: string;
    fontStyle: string;
    fontDisplay: string;
    fontWeight: string;
    src: string;
    unicodeRange: string;
  };
}

/**
 * Una @font-face por archivo de la tipografía, con sus propios archivos (spec 007, RF-40). Con
 * font-display: swap, el texto se ve enseguida con la de reemplazo y cambia cuando carga.
 */
export function fontFaceRules(tipografia: TipografiaTitulos): FontFaceRule[] {
  return tipografia.archivos.map((archivo) => ({
    '@font-face': {
      fontFamily: `'${tipografia.familia}'`,
      fontStyle: 'normal',
      fontDisplay: 'swap',
      fontWeight: String(archivo.peso),
      src: `url('${archivo.ruta}') format('woff2')`,
      unicodeRange: LATIN_UNICODE_RANGE,
    },
  }));
}

/** La familia de los títulos para Tailwind: la de la marca y, mientras carga, las de reemplazo. */
export function titleFontStack(tipografia: TipografiaTitulos): string[] {
  return [`"${tipografia.familia}"`, ...tipografia.reemplazo];
}

const ICON_TYPES: Readonly<Record<string, string>> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  ico: 'image/x-icon',
};

/**
 * Las etiquetas de la marca para la página base, en lugar de la marca <!--marca--> de index.html:
 * el favicon, el ícono de los teléfonos y la precarga de la tipografía de los títulos.
 */
export function brandHeadTags(marca: Marca): string {
  const { favicon, logoPng } = marca.archivos;
  const extension = favicon.slice(favicon.lastIndexOf('.') + 1).toLowerCase();
  const iconType = ICON_TYPES[extension] ?? 'image/png';
  return [
    `<link rel="icon" type="${iconType}" href="${escapeHtml(favicon)}">`,
    `<link rel="apple-touch-icon" href="${escapeHtml(logoPng)}">`,
    `<link rel="preload" href="${escapeHtml(marca.tipografiaTitulos.precarga)}" as="font" type="font/woff2" crossorigin>`,
  ].join('\n    ');
}
