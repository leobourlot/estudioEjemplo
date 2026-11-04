import { buildHead, escapeHtml, type PaginaConCabecera } from './cabecera-pagina';
import { STUDIO_CONTACT } from './datos-estudio';
import { MARCA } from './marca';
import { NOT_FOUND_PAGE, PUBLIC_PAGES } from './rutas-sitio';

/**
 * Los archivos que genera el prerenderizado (spec 007, RF-35, RF-37 y RF-38; plan 007,
 * "Prerenderizado y cabecera de cada página"): un HTML completo por página pública, la página de
 * dirección inexistente, la aplicación vacía, el mapa del sitio y las indicaciones para los
 * buscadores. Función pura: el script scripts/prerender.ts solo escribe lo que devuelve. No
 * importa React (principio 3): el render llega como función.
 */

/** Marcas de index.html que el prerenderizado reemplaza. */
export const HEAD_MARK = '<!--cabecera-->';
export const APP_MARK = '<!--app-->';

/** La aplicación (ingreso, cambio de contraseña, panel y portal): sin contenido ni índice. */
export const APP_SHELL_PAGE: PaginaConCabecera = {
  ruta: '/app',
  titulo: STUDIO_CONTACT.nombre,
  descripcion: null,
  indexable: false,
};

/** Lo que los buscadores no deben listar (RF-38). */
export const PRIVATE_PATHS = [
  '/ingresar',
  '/cambiar-contrasena',
  '/panel',
  '/portal',
  '/app.html',
  '/404.html',
] as const;

/** Dirección pública del sitio: con https:// y sin barra final. */
const SITE_URL = /^https:\/\/[^/\s?#]+$/;

export class SiteBuildError extends Error {}

/**
 * Marca de public/.htaccess que se reemplaza por la palabra de las direcciones del equipo de la
 * marca (spec 009, RF-6; plan 009, D9).
 */
export const TEAM_MARK = 'EQUIPO_RUTA';

/** El .htaccess publicado: la plantilla con la palabra del equipo de la marca. */
export function teamHtaccess(plantilla: string): string {
  if (!plantilla.includes(TEAM_MARK)) {
    throw new SiteBuildError(`.htaccess debe tener la marca ${TEAM_MARK}`);
  }
  return plantilla.split(TEAM_MARK).join(MARCA.equipo.ruta);
}

/**
 * Lo que el prerenderizado suma: la plantilla de .htaccess, si la hay, y si el sitio se publica en
 * modo demo (spec 009, RF-25).
 */
export interface OpcionesSitio {
  htaccess?: string;
  modoDemo?: boolean;
}

function fill(plantilla: string, head: string, app: string): string {
  // Con funciones, un "$" del contenido no se interpreta como patrón de reemplazo.
  return plantilla.replace(HEAD_MARK, () => head).replace(APP_MARK, () => app);
}

export function sitemapXml(urlSitio: string): string {
  const urls = PUBLIC_PAGES.filter((pagina) => pagina.indexable).map(
    (pagina) => `  <url><loc>${escapeHtml(urlSitio + pagina.ruta)}</loc></url>`,
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

/**
 * Las indicaciones para los buscadores (spec 007, RF-37 y RF-38). En modo demo, que no recorran
 * nada, sin mencionar la lista de direcciones (spec 009, RF-25).
 */
export function robotsTxt(urlSitio: string, modoDemo = false): string {
  if (modoDemo) return ['User-agent: *', 'Disallow: /', ''].join('\n');
  return [
    'User-agent: *',
    ...PRIVATE_PATHS.map((path) => `Disallow: ${path}`),
    '',
    `Sitemap: ${urlSitio}/sitemap.xml`,
    '',
  ].join('\n');
}

/**
 * El contenido de cada archivo de dist/, por su ruta relativa. `plantilla` es el index.html que
 * deja Vite, con las marcas de cabecera y contenido; `render` devuelve el HTML de una dirección;
 * `opciones.htaccess`, el .htaccess que copió Vite de public/, con la marca del equipo.
 */
export function buildSiteFiles(
  plantilla: string,
  urlSitio: string,
  render: (ruta: string) => string,
  opciones: OpcionesSitio = {},
): Map<string, string> {
  const modoDemo = opciones.modoDemo ?? false;
  if (!SITE_URL.test(urlSitio)) {
    throw new SiteBuildError(
      `VITE_URL_SITIO debe ser la dirección del sitio con https:// y sin barra final (recibida: "${urlSitio}")`,
    );
  }
  for (const mark of [HEAD_MARK, APP_MARK]) {
    if (plantilla.split(mark).length !== 2) {
      throw new SiteBuildError(`index.html debe tener la marca ${mark} una sola vez`);
    }
  }

  const files = new Map<string, string>();
  for (const pagina of PUBLIC_PAGES) {
    files.set(
      pagina.archivo,
      fill(plantilla, buildHead(pagina, urlSitio, STUDIO_CONTACT, modoDemo), render(pagina.ruta)),
    );
  }
  files.set(
    NOT_FOUND_PAGE.archivo,
    fill(
      plantilla,
      buildHead(NOT_FOUND_PAGE, urlSitio, STUDIO_CONTACT, modoDemo),
      render('/__no-existe__'),
    ),
  );
  files.set(
    'app.html',
    fill(plantilla, buildHead(APP_SHELL_PAGE, urlSitio, STUDIO_CONTACT, modoDemo), ''),
  );
  if (!modoDemo) files.set('sitemap.xml', sitemapXml(urlSitio));
  files.set('robots.txt', robotsTxt(urlSitio, modoDemo));
  if (opciones.htaccess !== undefined) files.set('.htaccess', teamHtaccess(opciones.htaccess));
  return files;
}
