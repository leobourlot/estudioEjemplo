/**
 * Tipos del archivo de marca (spec 009, RF-1; plan 009, D3). Solo declaraciones: este archivo no
 * tiene código que se ejecute, así marca.ts lo importa sin arrastrar ningún otro módulo y lo
 * pueden leer Tailwind y Vite al construir.
 */

/** Un bloque de texto: un párrafo o una lista, uno por renglón (spec 007, RF-14). */
export type Bloque =
  { tipo: 'parrafo'; texto: string } | { tipo: 'lista'; items: readonly string[] };

export interface RedSocial {
  /** Nombre de la red, tal como se muestra (por ejemplo, "Instagram"). */
  red: string;
  /** La cuenta, como se muestra (por ejemplo, "@estudio"). Una red puede tener varias. */
  usuario: string;
  url: string;
}

/** Un WhatsApp del estudio (spec 007, RF-22; spec 009, RF-7). */
export interface WhatsappEstudio {
  /** Con qué nombre se muestra: el de una integrante, con su tratamiento, o el del estudio. */
  nombre: string;
  /** Número con código de país y de área, solo dígitos, como lo pide wa.me. */
  numero: string;
  /** El mismo número, como se muestra. */
  visible: string;
}

/** Un email del estudio (spec 007, RF-22; spec 009, RF-7). */
export interface EmailEstudio {
  /** Con qué nombre se muestra, como en su WhatsApp. */
  nombre: string;
  email: string;
}

/** Da el tratamiento ("Dra." o "Dr.") y los artículos de su nombre (spec 009, RF-5). */
export type GeneroIntegrante = 'femenino' | 'masculino';

/** Una integrante del estudio, abogada o abogado (spec 007, RF-18 a RF-21; spec 009, RF-5). */
export interface Integrante {
  /** La palabra de su dirección: en minúsculas, sin tildes y con guiones (spec 007, RF-8). */
  slug: string;
  /** El nombre completo, sin el tratamiento. */
  nombre: string;
  genero: GeneroIntegrante;
  /** Título profesional, debajo del nombre (spec 007, T-21). */
  titulo: string;
  /** Ruta de la foto dentro de public/, o null si no hay (spec 007, RF-21). */
  foto: string | null;
  /** Resumen de la tarjeta, o null mientras falte (spec 007, RF-20). */
  resumen: string | null;
  /** Párrafos del texto completo, o null mientras falte (spec 007, RF-20). */
  texto: readonly string[] | null;
}

/** Una imagen de la marca con su tamaño, para reservar su lugar antes de que cargue. */
export interface ImagenMarca {
  ruta: string;
  ancho: number;
  alto: number;
}

export interface ColoresMarca {
  /** Azul oscuro: menú, botones principales y comienzo del degradado. */
  oscuro: string;
  /** Azul: enlaces, foco y final del degradado. */
  azul: string;
  /** Blanco: el texto sobre los dos azules. */
  blanco: string;
}

export interface ArchivoTipografia {
  peso: number;
  /** Ruta del .woff2 dentro de public/. */
  ruta: string;
}

/** La tipografía de los títulos, con sus archivos dentro del sitio (spec 007, RF-3 y RF-40). */
export interface TipografiaTitulos {
  familia: string;
  /** Las familias que se usan mientras carga. */
  reemplazo: readonly string[];
  archivos: readonly ArchivoTipografia[];
  /** El archivo que la página base pide antes que nada. */
  precarga: string;
}

/** Rutas de las imágenes de la marca, todas dentro de public/marca/ (spec 009, RF-3). */
export interface ArchivosMarca {
  /** El logo cuadrado: menú, ingreso y pie de página. */
  logo: ImagenMarca;
  /** El logo del encabezado del sitio público. */
  logoEncabezado: ImagenMarca;
  /** El logo en PNG, para los datos que leen los buscadores y el ícono de los teléfonos. */
  logoPng: string;
  favicon: string;
  /** La vista previa al compartir, en 1200 × 630 (spec 007, RF-36). */
  compartir: string;
}

/** Los textos y la dirección de la sección del equipo (spec 009, RF-6). */
export interface EquipoMarca {
  /** En el menú y en el pie (por ejemplo, "Abogadas"). */
  menu: string;
  /** Título de la sección del inicio (por ejemplo, "Equipo de abogadas"). */
  titulo: string;
  /** Acceso desde la página de una integrante (por ejemplo, "Volver a abogadas"). */
  volver: string;
  /** La palabra de las direcciones: /#<ruta>, /<ruta> y /<ruta>/<integrante>. */
  ruta: string;
}

export interface ContactoMarca {
  /** Uno o más; con uno solo, el botón abre la conversación directamente (spec 009, RF-7). */
  whatsapps: readonly WhatsappEstudio[];
  /** Vacío mientras no se informen. */
  emails: readonly EmailEstudio[];
  /** Se muestra como texto. null mientras no se informe (spec 007, RF-24). */
  direccion: string | null;
  /** Días y horarios de atención, un renglón por elemento. Vacío mientras no se informen. */
  horarios: readonly string[];
  redes: readonly RedSocial[];
}

export type ClaveServicio = 'derecho-laboral' | 'accidentes' | 'danos' | 'sucesiones';

export type ClavePestana = 'empresas' | 'trabajadores';

/** Los textos de un servicio (spec 007, RF-13 y RF-14; T-3 a T-6 y T-10 a T-12). */
export interface TextosServicio {
  /** En la tarjeta y en los accesos. */
  nombre: string;
  /** Título de su página. */
  titulo: string;
  /** Frase de la tarjeta, que es también la descripción de su página. */
  frase: string;
  /** Texto de su página. Derecho Laboral lo tiene en sus pestañas. */
  bloques: readonly Bloque[];
}

/** Los textos de una pestaña de Derecho Laboral (spec 007, RF-17; T-7 a T-9 y T-16). */
export interface TextosPestana {
  /** Título de su página, antes de " · " y del nombre del estudio. */
  titulo: string;
  /** Descripción de su página. */
  descripcion: string;
  /** Los destacados antes del texto; vacío si no tiene. */
  destacados: readonly string[];
  bloques: readonly Bloque[];
}

/** El mensaje de WhatsApp de cada página pública (spec 007, T-15). */
export type ClaveMensaje =
  'general' | 'empresas' | 'trabajadores' | 'accidentes' | 'danos' | 'sucesiones';

export interface TextosMarca {
  /** Apertura del inicio (T-1), que es también la descripción del inicio. */
  apertura: string;
  /** Encabezado de la sección Servicios (T-2). */
  introServicios: string;
  servicios: Readonly<Record<ClaveServicio, TextosServicio>>;
  pestanasLaboral: Readonly<Record<ClavePestana, TextosPestana>>;
  mensajesWhatsapp: Readonly<Record<ClaveMensaje, string>>;
  /** Leyenda del pie de página (T-18). "<año>" se reemplaza por el año de publicación. */
  derechos: string;
}

/** Todo lo que identifica al estudio (spec 009, RF-1). */
export interface Marca {
  /** El nombre completo, en una línea: títulos, buscadores y vista previa. */
  nombre: string;
  /** El nombre en pantalla: la primera línea no se corta (spec 007, RF-3). */
  nombreLineas: readonly [string, string];
  colores: ColoresMarca;
  tipografiaTitulos: TipografiaTitulos;
  archivos: ArchivosMarca;
  equipo: EquipoMarca;
  /** En el orden en que se muestran. */
  integrantes: readonly Integrante[];
  contacto: ContactoMarca;
  textos: TextosMarca;
}
