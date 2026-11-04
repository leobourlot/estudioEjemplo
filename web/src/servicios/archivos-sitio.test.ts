import { describe, expect, it } from 'vitest';
import { renderPublicPage } from '../entrada-servidor';
import {
  buildSiteFiles,
  robotsTxt,
  SiteBuildError,
  sitemapXml,
  TEAM_MARK,
  teamHtaccess,
} from './archivos-sitio';
import { ABOGADAS, hasOwnPage, lawyerPath } from './contenido-sitio';
import { MARCA } from './marca';
import { PUBLIC_PAGES } from './rutas-sitio';

const SITE = 'https://ejemplo.test';
const TEMPLATE = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <!--cabecera-->
    <script type="module" src="/assets/index.js"></script>
  </head>
  <body>
    <div id="root"><!--app--></div>
  </body>
</html>`;

const HTACCESS = `RewriteEngine On\nRewriteRule ^${TEAM_MARK}$ /#${TEAM_MARK} [R=302,NE,L]\n`;

const files = buildSiteFiles(TEMPLATE, SITE, renderPublicPage, { htaccess: HTACCESS });

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('buildSiteFiles (spec 007, RF-35, RF-37 y RF-38)', () => {
  it('genera un archivo por página pública, más 404.html, app.html, sitemap.xml, robots.txt y .htaccess', () => {
    expect([...files.keys()]).toEqual([
      ...PUBLIC_PAGES.map((p) => p.archivo),
      '404.html',
      'app.html',
      'sitemap.xml',
      'robots.txt',
      '.htaccess',
    ]);
  });

  it('sin la plantilla de .htaccess no lo genera', () => {
    expect(buildSiteFiles(TEMPLATE, SITE, renderPublicPage).has('.htaccess')).toBe(false);
  });

  it('el .htaccess lleva la palabra del equipo de la marca (spec 009, RF-6)', () => {
    const team = MARCA.equipo.ruta;

    expect(files.get('.htaccess')).toBe(
      `RewriteEngine On\nRewriteRule ^${team}$ /#${team} [R=302,NE,L]\n`,
    );
  });

  it('teamHtaccess rechaza una plantilla sin la marca del equipo', () => {
    expect(() => teamHtaccess('RewriteEngine On')).toThrow(SiteBuildError);
  });

  it.each(PUBLIC_PAGES.map((p) => [p.archivo, p] as const))(
    '%s trae su contenido, su cabecera y "Ingresar", sin ejecutar código',
    (archivo, pagina) => {
      const doc = parse(files.get(archivo)!);
      const root = doc.getElementById('root')!;

      expect(doc.title).toBe(pagina.titulo);
      expect(root.querySelectorAll('h1')).toHaveLength(1);
      expect(root.querySelector('h1')!.textContent).not.toBe('No encontramos esa página');
      expect(root.querySelector('a[href="/ingresar"]')!.textContent).toBe('Ingresar');
      expect(root.textContent).not.toContain('Ir a mi portal');
      expect(root.textContent).not.toContain('Ir al panel');
      expect(doc.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(
        SITE + pagina.ruta,
      );
      // La plantilla se conserva: el código de la página sigue cargándose.
      expect(doc.querySelector('script[src="/assets/index.js"]')).not.toBeNull();
    },
  );

  it('el inicio trae los textos y los enlaces de sus secciones', () => {
    const root = parse(files.get('index.html')!).getElementById('root')!;

    expect(root.querySelector('#servicios')).not.toBeNull();
    expect(root.querySelector(`#${MARCA.equipo.ruta}`)).not.toBeNull();
    expect(root.querySelector('#contacto')).not.toBeNull();
    expect(root.querySelector('a[href="/servicios/sucesiones"]')).not.toBeNull();
    for (const abogada of ABOGADAS.filter(hasOwnPage)) {
      expect(root.querySelector(`a[href="${lawyerPath(abogada)}"]`)).not.toBeNull();
    }
  });

  it('cada pestaña de Derecho Laboral trae su contenido como página propia', () => {
    const empresas = parse(files.get('servicios/derecho-laboral/empresas.html')!);
    const trabajadores = parse(files.get('servicios/derecho-laboral/trabajadores.html')!);

    const tabs = MARCA.textos.pestanasLaboral;
    const firstParagraph = (bloques: typeof tabs.empresas.bloques) =>
      bloques.flatMap((bloque) => (bloque.tipo === 'parrafo' ? [bloque.texto] : []))[0];

    expect(empresas.body.textContent).toContain(firstParagraph(tabs.empresas.bloques));
    expect(trabajadores.body.textContent).toContain(firstParagraph(tabs.trabajadores.bloques));
    expect(trabajadores.body.textContent).not.toContain(firstParagraph(tabs.empresas.bloques));
  });

  it('404.html trae la página inexistente y no se lista', () => {
    const doc = parse(files.get('404.html')!);

    expect(doc.getElementById('root')!.querySelector('h1')!.textContent).toBe(
      'No encontramos esa página',
    );
    expect(doc.querySelector('meta[name="robots"]')!.getAttribute('content')).toBe('noindex');
  });

  it('app.html llega vacía y no se lista', () => {
    const doc = parse(files.get('app.html')!);

    expect(doc.getElementById('root')!.innerHTML).toBe('');
    expect(doc.querySelector('meta[name="robots"]')!.getAttribute('content')).toBe('noindex');
    expect(doc.title).toBe(MARCA.nombre);
  });

  it('rechaza una dirección del sitio que no sea https:// sin barra final', () => {
    for (const url of ['', 'http://ejemplo.test', 'https://ejemplo.test/', 'ejemplo.test']) {
      expect(() => buildSiteFiles(TEMPLATE, url, renderPublicPage)).toThrow(SiteBuildError);
    }
  });

  it('rechaza una plantilla sin las marcas', () => {
    expect(() => buildSiteFiles('<html></html>', SITE, renderPublicPage)).toThrow(
      'index.html debe tener la marca <!--cabecera--> una sola vez',
    );
  });

  it('un "$" del contenido no se interpreta como patrón de reemplazo', () => {
    const built = buildSiteFiles(TEMPLATE, SITE, () => '<p>Precio $& y $1</p>');

    expect(built.get('index.html')).toContain('<p>Precio $& y $1</p>');
  });
});

describe('sitemap.xml y robots.txt (RF-37 y RF-38)', () => {
  it('el mapa del sitio lista solo las páginas indexables, con la dirección del sitio', () => {
    const doc = new DOMParser().parseFromString(sitemapXml(SITE), 'application/xml');

    expect(Array.from(doc.getElementsByTagName('loc')).map((loc) => loc.textContent)).toEqual(
      PUBLIC_PAGES.map((p) => SITE + p.ruta),
    );
  });

  it('robots.txt pide no listar las pantallas privadas y apunta al mapa del sitio', () => {
    expect(robotsTxt(SITE)).toBe(
      [
        'User-agent: *',
        'Disallow: /ingresar',
        'Disallow: /cambiar-contrasena',
        'Disallow: /panel',
        'Disallow: /portal',
        'Disallow: /app.html',
        'Disallow: /404.html',
        '',
        'Sitemap: https://ejemplo.test/sitemap.xml',
        '',
      ].join('\n'),
    );
  });
});

describe('archivos del sitio en modo demo (spec 009, RF-25)', () => {
  const demo = buildSiteFiles(TEMPLATE, SITE, renderPublicPage, {
    htaccess: HTACCESS,
    modoDemo: true,
  });

  it('no genera la lista de direcciones para buscadores', () => {
    expect(demo.has('sitemap.xml')).toBe(false);
    expect([...demo.keys()]).toEqual([...files.keys()].filter((key) => key !== 'sitemap.xml'));
  });

  it('robots.txt pide no recorrer nada y no menciona la lista de direcciones', () => {
    expect(demo.get('robots.txt')).toBe('User-agent: *\nDisallow: /\n');
    expect(robotsTxt(SITE, true)).not.toContain('Sitemap');
  });

  it('cada página, la inexistente y la de la aplicación llevan la indicación de no listarlas', () => {
    const pages = [...PUBLIC_PAGES.map((p) => p.archivo), '404.html', 'app.html'];
    for (const archivo of pages) {
      const doc = parse(demo.get(archivo)!);
      const robots = Array.from(doc.querySelectorAll('meta[name="robots"]')).map((m) =>
        m.getAttribute('content'),
      );
      expect(robots, archivo).toEqual(['noindex']);
    }
  });

  it('con el modo apagado, todo queda como en la spec 007', () => {
    const off = buildSiteFiles(TEMPLATE, SITE, renderPublicPage, {
      htaccess: HTACCESS,
      modoDemo: false,
    });

    expect([...off.entries()]).toEqual([...files.entries()]);
  });
});
