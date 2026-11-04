import { MARCA } from './marca';
import type { Bloque, ClavePestana, ClaveServicio, Integrante } from './tipos-marca';

/**
 * Contenido del sitio público (spec 007, RF-2): la estructura del sitio, que es fija (los cuatro
 * servicios, las dos pestañas de Derecho Laboral y sus direcciones, spec 009, RF-11), con los
 * textos del archivo de marca (spec 009, RF-1). Los textos de la interfaz que no son de la marca
 * (T-17 y T-22) siguen escritos acá, como en el anexo de la spec 007. Datos sin formato: los
 * componentes solo los muestran. No importa React (principio 3).
 */

export type { Bloque, ClavePestana, ClaveServicio };

/** T-1. */
export const APERTURA = MARCA.textos.apertura;

/** T-2. */
export const INTRO_SERVICIOS = MARCA.textos.introServicios;

export interface Servicio {
  clave: ClaveServicio;
  /** En la tarjeta y en los accesos (RF-13). */
  nombre: string;
  /** Título de su página (RF-13). */
  titulo: string;
  /** Frase de la tarjeta (T-3 a T-6). */
  frase: string;
  /** Dirección de su página (RF-8). La de Derecho Laboral es la de la pestaña Empresas. */
  ruta: string;
  /** Texto de su página (T-10 a T-12). Derecho Laboral lo tiene en sus pestañas. */
  bloques: readonly Bloque[];
}

export interface PestanaLaboral {
  clave: ClavePestana;
  etiqueta: string;
  ruta: string;
  /** T-7, solo en Empresas (RF-17). */
  destacados: readonly string[];
  bloques: readonly Bloque[];
}

const tab = (clave: ClavePestana, etiqueta: string, ruta: string): PestanaLaboral => {
  const { destacados, bloques } = MARCA.textos.pestanasLaboral[clave];
  return { clave, etiqueta, ruta, destacados, bloques };
};

/** Derecho Laboral, pestaña Empresas (T-7 y T-8) y pestaña Trabajadores (T-9). */
export const PESTANAS_LABORAL: readonly PestanaLaboral[] = [
  tab('empresas', 'Empresas', '/servicios/derecho-laboral/empresas'),
  tab('trabajadores', 'Trabajadores', '/servicios/derecho-laboral/trabajadores'),
];

/** Las direcciones de los servicios, que no dependen de la marca (RF-8; spec 009, RF-11). */
const SERVICE_PATHS: Readonly<Record<ClaveServicio, string>> = {
  'derecho-laboral': PESTANAS_LABORAL[0].ruta,
  accidentes: '/servicios/accidentes-de-trabajo',
  danos: '/servicios/derecho-de-danos',
  sucesiones: '/servicios/sucesiones',
};

const SERVICE_ORDER: readonly ClaveServicio[] = [
  'derecho-laboral',
  'accidentes',
  'danos',
  'sucesiones',
];

/** Los cuatro servicios, en el orden de las tarjetas (RF-12), con los textos de la marca. */
export const SERVICIOS: readonly Servicio[] = SERVICE_ORDER.map((clave) => {
  const { nombre, titulo, frase, bloques } = MARCA.textos.servicios[clave];
  return { clave, nombre, titulo, frase, ruta: SERVICE_PATHS[clave], bloques };
});

/**
 * Una integrante del estudio: abogada o abogado (spec 009, RF-5). El nombre del tipo y de las
 * funciones viene de la spec 007, cuando las integrantes eran todas abogadas (plan 009, D12).
 */
export type Abogada = Integrante;

/** Las integrantes de la marca, en su orden (RF-18). */
export const ABOGADAS: readonly Abogada[] = MARCA.integrantes;

/** Una integrante tiene tarjeta completa y página propia solo con resumen y texto (RF-20). */
export function hasOwnPage(abogada: Abogada): boolean {
  return abogada.resumen !== null && abogada.texto !== null;
}

const isFemale = (abogada: Abogada) => abogada.genero === 'femenino';

/**
 * El nombre de una integrante como se muestra: siempre con "Dra." o "Dr." adelante (RF-18, RF-19
 * y RF-46; spec 009, RF-5). Las iniciales y la dirección de su página salen del nombre sin el
 * tratamiento.
 */
export function lawyerName(abogada: Abogada): string {
  return `${isFemale(abogada) ? 'Dra.' : 'Dr.'} ${abogada.nombre}`;
}

/** Texto alternativo de la foto: "Foto de la Dra. …" o "Foto del Dr. …" (RF-21; spec 009, RF-5). */
export function photoAlt(abogada: Abogada): string {
  return `Foto ${isFemale(abogada) ? 'de la' : 'del'} ${lawyerName(abogada)}`;
}

/**
 * Lo que "Más información" suma para el lector de pantalla: "sobre la Dra. …" o "sobre el Dr. …"
 * (RF-46; spec 009, RF-5).
 */
export function moreInfoSuffix(abogada: Abogada): string {
  return `sobre ${isFemale(abogada) ? 'la' : 'el'} ${lawyerName(abogada)}`;
}

/** El id de la sección del equipo en el inicio, que es también la palabra de sus direcciones. */
export const TEAM_SECTION_ID = MARCA.equipo.ruta;

/** La sección del equipo en el inicio (RF-5 y RF-8; spec 009, RF-6). */
export function teamSectionPath(): string {
  return `/#${TEAM_SECTION_ID}`;
}

/** Dirección de la página de una integrante (RF-8; spec 009, RF-6). */
export function lawyerPath(abogada: Abogada): string {
  return `/${MARCA.equipo.ruta}/${abogada.slug}`;
}

export interface MovimientoEjemplo {
  /** Ya escrita como la muestra el portal (dd/mm/aaaa). */
  fecha: string;
  /** El nombre del tipo, como lo muestra el portal. */
  tipo: string;
  texto: string;
}

export interface CausaEjemplo {
  caratula: string;
  /** Etiqueta y valor de cada dato, en el orden del portal. */
  datos: readonly (readonly [string, string])[];
  /** Del más reciente al más antiguo, como los ordena el portal. */
  movimientos: readonly MovimientoEjemplo[];
}

/**
 * T-22: la causa de ejemplo de la maqueta del portal del inicio (RF-47). Es inventada y fija: no
 * es de ningún cliente ni sale de la API (RF-41). Va con los nombres ya escritos, porque el sitio
 * no usa los módulos de causas y movimientos de la aplicación.
 */
export const CAUSA_EJEMPLO: CausaEjemplo = {
  caratula: 'Gómez, Ana c/ Empresa Ejemplo S.A. s/ despido',
  datos: [
    ['Expediente', '1234/2026'],
    ['Juzgado', 'Juzgado Laboral N.º 1'],
    ['Fuero', 'Laboral'],
    ['Estado', 'En trámite'],
  ],
  movimientos: [
    {
      fecha: '20/10/2026',
      tipo: 'Audiencia',
      texto:
        'Se fijó la audiencia de conciliación para el 12 de noviembre a las 9 h. Te vamos a avisar antes para prepararla.',
    },
    {
      fecha: '06/10/2026',
      tipo: 'Escrito presentado',
      texto: 'Presentamos la demanda en el juzgado.',
    },
    {
      fecha: '18/09/2026',
      tipo: 'Notificación',
      texto: 'La empresa recibió el telegrama con el reclamo.',
    },
  ],
};

/**
 * T-22: el ingreso de ejemplo con el que empieza la maqueta (RF-47), con las etiquetas de la
 * pantalla de ingreso. La contraseña no se escribe: se muestran sus puntos.
 */
export const INGRESO_EJEMPLO = {
  titulo: 'Ingresar',
  etiquetaDocumento: 'DNI o CUIT',
  documento: '30.123.456',
  etiquetaContrasena: 'Contraseña',
  boton: 'Ingresar',
  /** Cuántos puntos tiene la contraseña. */
  largoContrasena: 8,
} as const;

/** T-15: el mensaje de WhatsApp de cada página pública (RF-27), de la marca. */
export const MENSAJES_WHATSAPP = MARCA.textos.mensajesWhatsapp;

/**
 * T-17 y T-18: los textos de la interfaz del sitio público. Los del equipo y la leyenda de
 * derechos son de la marca (spec 009, RF-6 y RF-10).
 */
export const TEXTOS = {
  menu: {
    servicios: 'Servicios',
    abogadas: MARCA.equipo.menu,
    contacto: 'Contacto',
    menu: 'Menú',
    ingresar: 'Ingresar',
    irAlPortal: 'Ir a mi portal',
    irAlPanel: 'Ir al panel',
    saltarAlContenido: 'Saltar al contenido',
  },
  inicio: {
    nuestrosServicios: 'Nuestros servicios',
    conocerMas: 'Conocer más',
    equipoAbogadas: MARCA.equipo.titulo,
    masInformacion: 'Más información',
  },
  portal: {
    leyenda: 'Portal de clientes',
    titulo: 'Seguí tus casos desde donde estés',
    irAlPortal: 'Ir al portal de clientes',
    ejemplo: 'Ejemplo',
    movimientos: 'Movimientos',
    descripcionMaqueta:
      'Ejemplo del portal de clientes: el ingreso con DNI y contraseña, y una causa con sus datos y sus últimos movimientos.',
  },
  detalle: {
    volverAServicios: 'Volver a servicios',
    otrosServicios: 'Otros servicios',
    volverAAbogadas: MARCA.equipo.volver,
    empresas: 'Empresas',
    trabajadores: 'Trabajadores',
  },
  contacto: {
    titulo: 'Contactate con nosotros',
    texto:
      'Estamos disponibles para escucharte. La primera consulta es el primer paso para resolver tu problema legal.',
    ubicacion: 'Ubicación',
    comoLlegar: 'Cómo llegar',
    telefono: 'Teléfono / WhatsApp',
    disponibilidad: 'Disponibilidad',
    email: 'Email',
  },
  botonWhatsapp: 'Escribinos por WhatsApp',
  noEncontrada: {
    titulo: 'No encontramos esa página',
    texto: 'Puede que la dirección esté mal escrita o que la página ya no exista.',
    irAlInicio: 'Ir al inicio',
  },
  pie: {
    derechos: MARCA.textos.derechos,
    disenadoPor: 'Diseñado por',
    bourderWeb: 'Bourder Web',
    bourderWebUrl: 'https://bourderweb.com.ar',
  },
} as const;

/** T-18: la leyenda de derechos con el año en que se publicó el sitio (RF-44). */
export function copyrightNotice(anio: number): string {
  return TEXTOS.pie.derechos.replace('<año>', String(anio));
}
