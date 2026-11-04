import { describe, expect, it } from 'vitest';
import { annexSection } from '../pruebas/anexo-spec-007';
import {
  ABOGADAS,
  APERTURA,
  hasOwnPage,
  lawyerName,
  MENSAJES_WHATSAPP,
  PESTANAS_LABORAL,
  SERVICIOS,
} from './contenido-sitio';
import { MARCA } from './marca';
import { pageTitle } from './presentacion-sitio';
import {
  APP_TITLES,
  decideEntry,
  isAppPath,
  normalizePublicPath,
  NOT_FOUND_PAGE,
  PUBLIC_PAGES,
  publicPageFor,
} from './rutas-sitio';

/**
 * Los títulos y las descripciones de las páginas de la marca (el inicio, los servicios, las
 * pestañas y las integrantes) se arman con los textos de MARCA (spec 009, RF-10). Los nombres de
 * las demás pantallas no son de la marca: se comparan con T-16 del anexo de la spec 007, con el
 * nombre del estudio de la marca en lugar del que figura en el anexo.
 */

const byRoute = (ruta: string) => publicPageFor(ruta)!;
const team = MARCA.equipo.ruta;
const lawyersWithPage = ABOGADAS.filter(hasOwnPage);

/** El título de T-16 del renglón que empieza con `start`, con el estudio de la marca. */
function annexTitle(start: string): string {
  const lines = annexSection('T-16');
  // El título del inicio de T-16 es el nombre del estudio del anexo.
  const annexStudio = /^ {2}- Título: (.+)$/.exec(lines[lines.indexOf('- Inicio') + 1])![1];
  const line = lines.find((l) => l.startsWith(start));
  if (!line) throw new Error(`No está "${start}" en T-16`);
  return line.slice(line.indexOf(': ') + 2).replace(annexStudio, MARCA.nombre);
}

describe('títulos y descripciones (spec 007, T-16 y RF-34; spec 009, RF-10)', () => {
  it('el inicio lleva el nombre del estudio y la apertura', () => {
    expect(byRoute('/')).toMatchObject({ titulo: MARCA.nombre, descripcion: APERTURA });
  });

  it('cada pestaña de Derecho Laboral lleva su título y su descripción de la marca', () => {
    for (const pestana of PESTANAS_LABORAL) {
      const { titulo, descripcion } = MARCA.textos.pestanasLaboral[pestana.clave];
      expect(byRoute(pestana.ruta)).toMatchObject({ titulo: pageTitle(titulo), descripcion });
    }
  });

  it('cada servicio con página lleva su título y su frase', () => {
    for (const servicio of SERVICIOS.filter((s) => s.clave !== 'derecho-laboral')) {
      expect(byRoute(servicio.ruta)).toMatchObject({
        titulo: pageTitle(servicio.titulo),
        descripcion: servicio.frase,
      });
    }
  });

  it('cada integrante con página lleva su nombre con el tratamiento y su resumen', () => {
    for (const integrante of lawyersWithPage) {
      expect(byRoute(`/${team}/${integrante.slug}`)).toMatchObject({
        titulo: pageTitle(lawyerName(integrante)),
        descripcion: integrante.resumen,
      });
    }
  });

  it('el título es " · " y el nombre del estudio después del nombre de la página', () => {
    expect(pageTitle('Sucesiones')).toBe(`Sucesiones · ${MARCA.nombre}`);
  });

  it('página de dirección inexistente, sin descripción', () => {
    expect(NOT_FOUND_PAGE.titulo).toBe(annexTitle('  - Título: Página no encontrada'));
    expect(NOT_FOUND_PAGE.descripcion).toBeNull();
  });

  it('pantallas fuera del sitio público', () => {
    expect(APP_TITLES).toEqual({
      ingreso: annexTitle('  - Ingreso: '),
      cambioContrasena: annexTitle('  - Cambio de contraseña: '),
      portal: annexTitle('  - Portal: '),
      panel: annexTitle('  - Panel: '),
    });
  });
});

describe('páginas públicas (RF-1, RF-8)', () => {
  it('hay una por servicio, por pestaña y solo por las integrantes con página', () => {
    expect(PUBLIC_PAGES.map((p) => p.ruta)).toEqual([
      '/',
      '/servicios/derecho-laboral/empresas',
      '/servicios/derecho-laboral/trabajadores',
      '/servicios/accidentes-de-trabajo',
      '/servicios/derecho-de-danos',
      '/servicios/sucesiones',
      ...lawyersWithPage.map((integrante) => `/${team}/${integrante.slug}`),
    ]);
  });

  it('cada una tiene su archivo y es indexable; la inexistente no', () => {
    expect(PUBLIC_PAGES.map((p) => p.archivo)).toEqual([
      'index.html',
      'servicios/derecho-laboral/empresas.html',
      'servicios/derecho-laboral/trabajadores.html',
      'servicios/accidentes-de-trabajo.html',
      'servicios/derecho-de-danos.html',
      'servicios/sucesiones.html',
      ...lawyersWithPage.map((integrante) => `${team}/${integrante.slug}.html`),
    ]);
    expect(PUBLIC_PAGES.every((p) => p.indexable)).toBe(true);
    expect(NOT_FOUND_PAGE).toMatchObject({ archivo: '404.html', indexable: false });
  });

  it('cada una tiene el mensaje de WhatsApp que le corresponde (RF-27)', () => {
    expect(PUBLIC_PAGES.map((p) => p.mensaje)).toEqual([
      MENSAJES_WHATSAPP.general,
      MENSAJES_WHATSAPP.empresas,
      MENSAJES_WHATSAPP.trabajadores,
      MENSAJES_WHATSAPP.accidentes,
      MENSAJES_WHATSAPP.danos,
      MENSAJES_WHATSAPP.sucesiones,
      ...lawyersWithPage.map(() => MENSAJES_WHATSAPP.general),
    ]);
    expect(NOT_FOUND_PAGE.mensaje).toBe(MENSAJES_WHATSAPP.general);
  });
});

describe('normalizePublicPath (RF-8)', () => {
  it.each([
    ['/', '/'],
    ['/servicios/sucesiones', '/servicios/sucesiones'],
    ['/Servicios/Sucesiones', '/servicios/sucesiones'],
    ['/servicios/sucesiones/', '/servicios/sucesiones'],
    ['/SERVICIOS/SUCESIONES//', '/servicios/sucesiones'],
    ['/servicios', '/#servicios'],
    [`/${team}/`, `/#${team}`],
    [`/${team.toUpperCase()}`, `/#${team}`],
    ['/servicios/derecho-laboral', '/servicios/derecho-laboral/empresas'],
    ['/Servicios/Derecho-Laboral/', '/servicios/derecho-laboral/empresas'],
    ['/ingresar', '/ingresar'],
    ['/PANEL/causas/5', '/panel/causas/5'],
    ['/portal/', '/portal'],
  ])('%s → %s', (ruta, esperada) => {
    expect(normalizePublicPath(ruta)).toBe(esperada);
  });

  it.each([
    '/no-existe',
    '/servicios/otro',
    '/servicios/derecho-laboral/otra',
    `/${team}/otra-persona`,
    '/ingresar/x',
    '/index.html',
  ])('%s no existe', (ruta) => {
    expect(normalizePublicPath(ruta)).toBeNull();
  });
});

describe('isAppPath (RF-10)', () => {
  it.each([
    '/ingresar',
    '/cambiar-contrasena',
    '/panel',
    '/panel/x',
    '/portal',
    '/portal/causas/3',
  ])('%s es de la aplicación', (ruta) => {
    expect(isAppPath(ruta)).toBe(true);
  });

  it.each(['/', '/ingresar/x', '/panelx', '/portales', '/servicios/sucesiones'])(
    '%s no es de la aplicación',
    (ruta) => {
      expect(isAppPath(ruta)).toBe(false);
    },
  );
});

describe('decideEntry (plan 007, "Entrada")', () => {
  it('muestra el sitio en una dirección pública normal', () => {
    expect(decideEntry('/servicios/sucesiones')).toEqual({ tipo: 'sitio' });
  });

  it('muestra el sitio, con la página inexistente, en una dirección que no existe', () => {
    expect(decideEntry('/no-existe')).toEqual({ tipo: 'sitio' });
    expect(decideEntry('/NO-EXISTE')).toEqual({ tipo: 'sitio' });
  });

  it('carga la aplicación en el ingreso, el panel y el portal', () => {
    expect(decideEntry('/ingresar')).toEqual({ tipo: 'aplicacion' });
    expect(decideEntry('/panel/causas/5')).toEqual({ tipo: 'aplicacion' });
  });

  it('lleva una dirección con mayúsculas a la principal, conservando el "#"', () => {
    expect(decideEntry('/Servicios/Sucesiones', '#contacto')).toEqual({
      tipo: 'redirigir',
      destino: '/servicios/sucesiones#contacto',
    });
  });

  it('una redirección que ya tiene "#" no suma otro', () => {
    expect(decideEntry('/servicios', '#contacto')).toEqual({
      tipo: 'redirigir',
      destino: '/#servicios',
    });
  });

  it('lleva una dirección de la aplicación con mayúsculas a la principal', () => {
    expect(decideEntry('/PANEL')).toEqual({ tipo: 'redirigir', destino: '/panel' });
  });
});
