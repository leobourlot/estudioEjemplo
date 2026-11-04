/**
 * Prerenderizado del sitio público (spec 007, RF-35; plan 007, "Cómo se publica el sitio"). Corre
 * después de `vite build` y `vite build --ssr`: con la versión del sitio para Node escribe en
 * dist/ un HTML completo por página pública, 404.html, app.html, sitemap.xml, robots.txt y el
 * .htaccess con la palabra del equipo de la marca, y borra dist-ssr/. Lo que se escribe lo arma buildSiteFiles (src/servicios/archivos-sitio.ts),
 * que tiene sus tests; este script solo lee y escribe archivos.
 *
 * Node 24 lo ejecuta sin compilar: solo usa sintaxis de TypeScript que se puede borrar.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';

interface ServerEntry {
  renderPublicPage: (ruta: string) => string;
  buildSiteFiles: (
    plantilla: string,
    urlSitio: string,
    render: (ruta: string) => string,
    opciones: { htaccess?: string; modoDemo?: boolean },
  ) => Map<string, string>;
  isDemoEnabled: (valor: string | undefined) => boolean;
}

const webDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(webDir, 'dist');
const ssrDir = join(webDir, 'dist-ssr');

// Como Vite: las variables del entorno y las de los archivos .env de web/.
const env = loadEnv('production', webDir, 'VITE_');
const urlSitio = env.VITE_URL_SITIO ?? '';
if (urlSitio === '') {
  console.error(
    'Falta VITE_URL_SITIO: la dirección pública del sitio, con https:// y sin barra final (ver web/.env.example).',
  );
  process.exit(1);
}

const entry = (await import(
  pathToFileURL(join(ssrDir, 'entrada-servidor.js')).href
)) as ServerEntry;
const plantilla = await readFile(join(distDir, 'index.html'), 'utf8');
// El .htaccess que copió Vite de public/, con la marca del equipo (spec 009, RF-6).
const htaccess = await readFile(join(distDir, '.htaccess'), 'utf8');
// En modo demo, ninguna página se lista y no hay lista de direcciones (spec 009, RF-25).
const modoDemo = entry.isDemoEnabled(env.VITE_MODO_DEMO);
const files = entry.buildSiteFiles(plantilla, urlSitio, entry.renderPublicPage, {
  htaccess,
  modoDemo,
});

for (const [archivo, contenido] of files) {
  const path = join(distDir, archivo);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contenido, 'utf8');
}
await rm(ssrDir, { recursive: true, force: true });

console.log(
  `Prerenderizado: ${files.size} archivos en dist/ para ${urlSitio}${modoDemo ? ' (modo demo)' : ''}`,
);
