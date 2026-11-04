/// <reference types="node" />
// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MARCA } from './servicios/marca';

/**
 * Spec 009, RF-13: el archivo de marca es la única fuente de los datos del estudio. Este test lee
 * el código del sitio (web/src), sus scripts (web/scripts), la página base (web/index.html) y el
 * código de la api (api/src), y falla si encuentra escrito en otro archivo el nombre del estudio,
 * la primera línea del nombre, un WhatsApp (como se muestra o como va en el enlace), un email o un
 * color de la marca, sin distinguir mayúsculas de minúsculas. La segunda línea del nombre no se
 * revisa sola: puede ser una palabra común de la interfaz (por ejemplo, "Abogados").
 */

// Vitest corre la suite desde web/.
const WEB = resolve('.');
const BRAND_FILE = join(WEB, 'src', 'servicios', 'marca.ts');
const ROOTS = [
  join(WEB, 'src'),
  join(WEB, 'scripts'),
  join(WEB, 'index.html'),
  join(WEB, '..', 'api', 'src'),
];
const TEXT_FILE = /\.(ts|tsx|js|cjs|mjs|css|html|json|sql|md|txt)$/;

/** Los datos de la marca que no pueden aparecer fuera del archivo de marca. */
function brandLiterals(): string[] {
  const { nombre, nombreLineas, colores, contacto } = MARCA;
  return [
    nombre,
    nombreLineas[0],
    ...contacto.whatsapps.flatMap((whatsapp) => [whatsapp.numero, whatsapp.visible]),
    ...contacto.emails.map((email) => email.email),
    colores.oscuro,
    colores.azul,
    colores.blanco,
  ];
}

/** Cada aparición de un dato en un archivo, como "archivo: dato". */
function findBrandLiterals(
  files: ReadonlyMap<string, string>,
  literals: readonly string[],
): string[] {
  const found: string[] = [];
  for (const [path, content] of files) {
    const text = content.toLowerCase();
    for (const literal of literals) {
      if (text.includes(literal.toLowerCase())) found.push(`${path}: ${literal}`);
    }
  }
  return found;
}

function collect(path: string, files: Map<string, string>): void {
  if (statSync(path).isDirectory()) {
    for (const name of readdirSync(path)) {
      if (name === 'node_modules' || name === 'dist') continue;
      collect(join(path, name), files);
    }
  } else if (TEXT_FILE.test(path) && path !== BRAND_FILE) {
    files.set(relative(join(WEB, '..'), path).replace(/\\/g, '/'), readFileSync(path, 'utf8'));
  }
}

describe('marca única (spec 009, RF-13)', () => {
  it('ningún archivo del código, salvo el de marca, tiene escrito un dato de la marca', () => {
    const files = new Map<string, string>();
    for (const root of ROOTS) collect(root, files);

    expect(files.size).toBeGreaterThan(100);
    expect([...files.keys()].some((path) => path.startsWith('api/src/'))).toBe(true);
    expect(findBrandLiterals(files, brandLiterals())).toEqual([]);
  });

  it('revisa el nombre, la primera línea, los WhatsApp, los emails y los colores', () => {
    const literals = brandLiterals();
    const { whatsapps, emails } = MARCA.contacto;

    expect(literals).toHaveLength(2 + 2 * whatsapps.length + emails.length + 3);
    expect(literals).not.toContain(MARCA.nombreLineas[1]);
  });

  it('detecta un dato de la marca escrito a mano, sin importar las mayúsculas (caso de control)', () => {
    const files = new Map([
      ['web/src/componentes/Ejemplo.tsx', `<p>${MARCA.nombre.toUpperCase()}</p>`],
      ['api/src/ejemplo.ts', `const color = '${MARCA.colores.azul.toLowerCase()}';`],
      ['web/src/componentes/Limpio.tsx', '<p>Sin datos de la marca</p>'],
    ]);

    expect(findBrandLiterals(files, brandLiterals())).toEqual([
      `web/src/componentes/Ejemplo.tsx: ${MARCA.nombre}`,
      `web/src/componentes/Ejemplo.tsx: ${MARCA.nombreLineas[0]}`,
      `api/src/ejemplo.ts: ${MARCA.colores.azul}`,
    ]);
  });
});
