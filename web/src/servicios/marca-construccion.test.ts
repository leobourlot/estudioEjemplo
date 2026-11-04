import { describe, expect, it } from 'vitest';
import { MARCA } from './marca';
import { brandHeadTags, fontFaceRules, titleFontStack } from './marca-construccion';
import type { Marca } from './tipos-marca';

describe('fontFaceRules (spec 007, RF-3 y RF-40; spec 009, RF-8)', () => {
  it('declara una @font-face por archivo de la tipografía de la marca, con sus propios archivos', () => {
    const { familia, archivos } = MARCA.tipografiaTitulos;
    const rules = fontFaceRules(MARCA.tipografiaTitulos);

    expect(rules).toHaveLength(archivos.length);
    rules.forEach((rule, index) => {
      expect(rule['@font-face']).toMatchObject({
        fontFamily: `'${familia}'`,
        fontStyle: 'normal',
        fontDisplay: 'swap',
        fontWeight: String(archivos[index].peso),
        src: `url('${archivos[index].ruta}') format('woff2')`,
      });
      expect(rule['@font-face'].unicodeRange).toContain('U+0000-00FF');
    });
  });
});

describe('titleFontStack (spec 009, RF-8)', () => {
  it('es la familia de la marca, entre comillas, y después las de reemplazo', () => {
    const { familia, reemplazo } = MARCA.tipografiaTitulos;

    expect(titleFontStack(MARCA.tipografiaTitulos)).toEqual([`"${familia}"`, ...reemplazo]);
  });
});

describe('brandHeadTags (spec 009, RF-2)', () => {
  it('el favicon, el ícono de los teléfonos y la precarga de la tipografía de la marca', () => {
    const html = brandHeadTags(MARCA);

    expect(html).toContain(`<link rel="apple-touch-icon" href="${MARCA.archivos.logoPng}">`);
    expect(html).toContain(
      `<link rel="preload" href="${MARCA.tipografiaTitulos.precarga}" as="font" type="font/woff2" crossorigin>`,
    );
    expect(html).toMatch(
      new RegExp(`<link rel="icon" type="[^"]+" href="${MARCA.archivos.favicon}">`),
    );
  });

  it.each([
    ['/marca/favicon.svg', 'image/svg+xml'],
    ['/marca/favicon.png', 'image/png'],
    ['/marca/favicon.ico', 'image/x-icon'],
  ])('el tipo del favicon %s es %s', (favicon, type) => {
    const marca: Marca = { ...MARCA, archivos: { ...MARCA.archivos, favicon } };

    expect(brandHeadTags(marca)).toContain(`<link rel="icon" type="${type}" href="${favicon}">`);
  });

  it('escapa las rutas', () => {
    const marca: Marca = {
      ...MARCA,
      archivos: { ...MARCA.archivos, logoPng: '/marca/a"b.png' },
    };

    expect(brandHeadTags(marca)).toContain('href="/marca/a&quot;b.png"');
  });
});
