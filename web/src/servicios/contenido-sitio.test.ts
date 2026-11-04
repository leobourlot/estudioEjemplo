import { describe, expect, it } from 'vitest';
import { annexSection, quotedStrings } from '../pruebas/anexo-spec-007';
import {
  ABOGADAS,
  APERTURA,
  type Abogada,
  type Bloque,
  CAUSA_EJEMPLO,
  copyrightNotice,
  hasOwnPage,
  INGRESO_EJEMPLO,
  INTRO_SERVICIOS,
  lawyerName,
  lawyerPath,
  MENSAJES_WHATSAPP,
  moreInfoSuffix,
  PESTANAS_LABORAL,
  photoAlt,
  SERVICIOS,
  TEAM_SECTION_ID,
  teamSectionPath,
  TEXTOS,
  type ClaveServicio,
} from './contenido-sitio';
import { MARCA } from './marca';

/**
 * Los textos que son de la marca (los de la apertura, los servicios, las integrantes, los
 * mensajes de WhatsApp, el equipo y la leyenda de derechos) se toman de MARCA (spec 009, RF-1 y
 * RF-14). Los de la interfaz, que no son de la marca, se siguen comparando con el anexo de la
 * spec 007 (RF-2).
 */

const service = (clave: ClaveServicio) => SERVICIOS.find((s) => s.clave === clave)!;

// Integrantes ficticias, para probar las reglas sin depender de la marca cargada.
const abogada: Abogada = {
  slug: 'ana-robledo',
  nombre: 'Ana Robledo',
  genero: 'femenino',
  titulo: 'Abogada',
  foto: null,
  resumen: 'Resumen.',
  texto: ['Texto.'],
};
const abogado: Abogada = {
  ...abogada,
  slug: 'luis-pena',
  nombre: 'Luis Peña',
  genero: 'masculino',
};

describe('textos de la marca (spec 009, RF-1 y RF-10)', () => {
  it('la apertura y el encabezado de Servicios son los de la marca', () => {
    expect(APERTURA).toBe(MARCA.textos.apertura);
    expect(INTRO_SERVICIOS).toBe(MARCA.textos.introServicios);
  });

  it('cada servicio tiene el nombre, el título, la frase y el texto de la marca', () => {
    for (const servicio of SERVICIOS) {
      const { nombre, titulo, frase, bloques } = MARCA.textos.servicios[servicio.clave];
      expect(servicio).toMatchObject({ nombre, titulo, frase, bloques });
    }
  });

  it('cada pestaña de Derecho Laboral tiene los destacados y el texto de la marca', () => {
    for (const pestana of PESTANAS_LABORAL) {
      const { destacados, bloques } = MARCA.textos.pestanasLaboral[pestana.clave];
      expect(pestana.destacados).toEqual(destacados);
      expect(pestana.bloques).toEqual(bloques);
    }
  });

  it('la comparación detecta una letra cambiada (caso de control)', () => {
    const altered: Bloque[] = structuredClone(service('accidentes').bloques) as Bloque[];
    const first = altered[0];
    if (first.tipo === 'parrafo') altered[0] = { ...first, texto: `${first.texto}x` };

    expect(altered).not.toEqual(MARCA.textos.servicios.accidentes.bloques);
  });

  it('los mensajes de WhatsApp son los de la marca, uno por página (T-15)', () => {
    expect(MENSAJES_WHATSAPP).toEqual(MARCA.textos.mensajesWhatsapp);
    expect(Object.keys(MENSAJES_WHATSAPP).sort()).toEqual(
      ['accidentes', 'danos', 'empresas', 'general', 'sucesiones', 'trabajadores'].sort(),
    );
  });
});

describe('T-22, maqueta del portal contra el anexo de la spec 007', () => {
  it('la causa de ejemplo', () => {
    const section = annexSection('T-22');
    const line = (prefix: string) => section.filter((l) => l.startsWith(`- ${prefix}:`));
    const pairs = quotedStrings(line('Datos')[0]);

    expect([CAUSA_EJEMPLO.caratula]).toEqual(quotedStrings(line('Carátula')[0]));
    expect(CAUSA_EJEMPLO.datos.flat()).toEqual(pairs);
    expect(CAUSA_EJEMPLO.movimientos.map((m) => [m.fecha, m.tipo, m.texto])).toEqual(
      line('Movimiento').map(quotedStrings),
    );
  });

  it('el ingreso de ejemplo', () => {
    const ingreso = annexSection('T-22').find((l) => l.startsWith('- Ingreso:'))!;
    const { titulo, etiquetaDocumento, documento, etiquetaContrasena, boton, largoContrasena } =
      INGRESO_EJEMPLO;

    expect([titulo, etiquetaDocumento, documento, etiquetaContrasena, boton]).toEqual(
      quotedStrings(ingreso),
    );
    expect(ingreso).toContain(`${largoContrasena} puntos`);
  });
});

describe('servicios (spec 007, RF-12 y RF-13; spec 009, RF-11)', () => {
  it('son cuatro, en el orden de las tarjetas', () => {
    expect(SERVICIOS.map((s) => s.clave)).toEqual([
      'derecho-laboral',
      'accidentes',
      'danos',
      'sucesiones',
    ]);
  });

  it('tienen sus direcciones fijas, que no dependen de la marca (spec 007, RF-8)', () => {
    expect(SERVICIOS.map((s) => s.ruta)).toEqual([
      '/servicios/derecho-laboral/empresas',
      '/servicios/accidentes-de-trabajo',
      '/servicios/derecho-de-danos',
      '/servicios/sucesiones',
    ]);
  });

  it('Derecho Laboral no tiene texto propio: lo tienen sus pestañas', () => {
    expect(service('derecho-laboral').bloques).toEqual([]);
  });

  it('las pestañas de Derecho Laboral van en orden, con su dirección', () => {
    expect(PESTANAS_LABORAL.map((p) => [p.clave, p.etiqueta, p.ruta])).toEqual([
      ['empresas', 'Empresas', '/servicios/derecho-laboral/empresas'],
      ['trabajadores', 'Trabajadores', '/servicios/derecho-laboral/trabajadores'],
    ]);
  });
});

describe('causa de ejemplo del portal (spec 007, RF-41 y RF-47)', () => {
  it('tiene los cuatro datos del portal, en su orden', () => {
    expect(CAUSA_EJEMPLO.datos.map(([etiqueta]) => etiqueta)).toEqual([
      'Expediente',
      'Juzgado',
      'Fuero',
      'Estado',
    ]);
  });

  it('los movimientos van del más reciente al más antiguo, como en el portal', () => {
    const fechas = CAUSA_EJEMPLO.movimientos.map((m) => m.fecha.split('/').reverse().join('-'));

    expect(fechas).toEqual([...fechas].sort().reverse());
  });
});

describe('integrantes (spec 007, RF-18 a RF-21 y RF-46; spec 009, RF-5)', () => {
  it('son las de la marca, en su orden', () => {
    expect(ABOGADAS).toEqual(MARCA.integrantes);
  });

  it('una abogada se muestra con "Dra." y un abogado con "Dr."', () => {
    expect(lawyerName(abogada)).toBe('Dra. Ana Robledo');
    expect(lawyerName(abogado)).toBe('Dr. Luis Peña');
  });

  it('el texto alternativo de la foto lleva el artículo de cada uno', () => {
    expect(photoAlt(abogada)).toBe('Foto de la Dra. Ana Robledo');
    expect(photoAlt(abogado)).toBe('Foto del Dr. Luis Peña');
  });

  it('"Más información" suma, para el lector de pantalla, el nombre con su artículo', () => {
    expect(moreInfoSuffix(abogada)).toBe('sobre la Dra. Ana Robledo');
    expect(moreInfoSuffix(abogado)).toBe('sobre el Dr. Luis Peña');
  });

  it('cada integrante de la marca se muestra con el tratamiento de su género', () => {
    for (const integrante of MARCA.integrantes) {
      const tratamiento = integrante.genero === 'femenino' ? 'Dra.' : 'Dr.';
      expect(lawyerName(integrante)).toBe(`${tratamiento} ${integrante.nombre}`);
    }
  });

  it('con resumen y texto tiene página; sin alguno de los dos, no (spec 007, RF-20)', () => {
    expect(hasOwnPage(abogada)).toBe(true);
    expect(hasOwnPage({ ...abogada, resumen: null })).toBe(false);
    expect(hasOwnPage({ ...abogada, texto: null })).toBe(false);
  });
});

describe('sección del equipo (spec 009, RF-6)', () => {
  it('sus direcciones usan la palabra de la marca', () => {
    expect(TEAM_SECTION_ID).toBe(MARCA.equipo.ruta);
    expect(teamSectionPath()).toBe(`/#${MARCA.equipo.ruta}`);
    expect(lawyerPath(abogado)).toBe(`/${MARCA.equipo.ruta}/luis-pena`);
  });

  it('sus textos son los de la marca', () => {
    expect(TEXTOS.menu.abogadas).toBe(MARCA.equipo.menu);
    expect(TEXTOS.inicio.equipoAbogadas).toBe(MARCA.equipo.titulo);
    expect(TEXTOS.detalle.volverAAbogadas).toBe(MARCA.equipo.volver);
  });
});

describe('textos de la interfaz contra el anexo de la spec 007 (T-17)', () => {
  const lineFor = (prefix: string) => {
    const line = annexSection('T-17').find((l) => l.startsWith(`- ${prefix}:`));
    if (!line) throw new Error(`No está "${prefix}" en T-17`);
    return quotedStrings(line);
  };

  // Los textos del equipo son de la marca (spec 009, RF-6): se comparan arriba, con MARCA. Acá
  // se compara el resto, en el mismo orden, quitando de los dos lados el lugar del equipo.
  const withoutTeam = (values: readonly string[], index: number) =>
    values.filter((_value, i) => i !== index);

  it('menú y encabezado', () => {
    const keys = Object.keys(TEXTOS.menu);
    const team = keys.indexOf('abogadas');

    expect(withoutTeam(Object.values(TEXTOS.menu), team)).toEqual(
      withoutTeam(lineFor('Menú y encabezado'), team),
    );
  });

  it('inicio', () => {
    const team = Object.keys(TEXTOS.inicio).indexOf('equipoAbogadas');

    expect(withoutTeam(Object.values(TEXTOS.inicio), team)).toEqual(
      withoutTeam(lineFor('Inicio'), team),
    );
  });

  it('portal de clientes', () => {
    expect(Object.values(TEXTOS.portal)).toEqual(lineFor('Portal de clientes'));
  });

  it('páginas de detalle, con las etiquetas de las pestañas', () => {
    const team = Object.keys(TEXTOS.detalle).indexOf('volverAAbogadas');

    expect(withoutTeam(Object.values(TEXTOS.detalle), team)).toEqual(
      withoutTeam(lineFor('Páginas de detalle'), team),
    );
    expect(PESTANAS_LABORAL.map((p) => p.etiqueta)).toEqual([
      TEXTOS.detalle.empresas,
      TEXTOS.detalle.trabajadores,
    ]);
  });

  it('contacto', () => {
    expect(Object.values(TEXTOS.contacto)).toEqual(lineFor('Contacto'));
  });

  it('botón de WhatsApp', () => {
    expect([TEXTOS.botonWhatsapp]).toEqual(lineFor('Botón de WhatsApp'));
  });

  it('dirección inexistente', () => {
    expect(Object.values(TEXTOS.noEncontrada)).toEqual(lineFor('Dirección inexistente'));
  });
});

describe('pie de página (spec 007, T-18 y RF-44; spec 009, RF-10)', () => {
  const section = annexSection('T-18');
  const line = (prefix: string) => section.find((l) => l.startsWith(`- ${prefix}:`))!;

  it('la leyenda de derechos es la de la marca, con el año', () => {
    expect(TEXTOS.pie.derechos).toBe(MARCA.textos.derechos);
    expect(copyrightNotice(2026)).toBe(MARCA.textos.derechos.replace('<año>', '2026'));
    expect(copyrightNotice(2026)).not.toContain('<año>');
  });

  it('"Diseñado por" y Bourder Web, con su dirección, no son de la marca', () => {
    expect([TEXTOS.pie.disenadoPor, TEXTOS.pie.bourderWeb]).toEqual(quotedStrings(line('Diseño')));
    expect(line('Diseño')).toContain(TEXTOS.pie.bourderWebUrl);
  });
});
