// Con la extensión .ts: lo leen también tailwind.config.js y vite.config.ts (plan 009, D10).
import type { Bloque, Marca } from './tipos-marca.ts';

/**
 * Archivo de marca (spec 009, RF-1 a RF-4; plan 009, D1 y D3): todo lo que identifica al estudio
 * sale de acá. Cambiar de estudio es editar este archivo y reemplazar las imágenes de
 * public/marca/ (RF-3). Son datos públicos y fijos (constitución, principio 5): nunca contraseñas,
 * claves ni datos de causas, clientes o cuentas.
 *
 * Solo datos: no importa React ni nada que se ejecute (principio 3), porque también lo leen
 * tailwind.config.js y vite.config.ts al construir. Ningún otro archivo repite estos datos: lo
 * verifica marca-unica.test.ts (RF-13).
 */

const p = (texto: string): Bloque => ({ tipo: 'parrafo', texto });
const list = (...items: string[]): Bloque => ({ tipo: 'lista', items });

export const MARCA: Marca = {
  // Marca de ejemplo de la demo, ficticia (spec 009, anexo A).
  nombre: 'Lucero | Ibarra - Abogados',
  nombreLineas: ['Lucero | Ibarra', 'Abogados'],

  colores: {
    oscuro: '#022c22',
    claro: '#047857',
    blanco: '#FAFCFD',
  },

  // Licencia SIL Open Font License; los archivos y la licencia están en el propio sitio.
  tipografiaTitulos: {
    familia: 'Cormorant Garamond',
    reemplazo: ['Georgia', 'serif'],
    archivos: [
      { peso: 500, ruta: '/marca/fuentes/cormorant-garamond-latin-500-normal.woff2' },
      { peso: 600, ruta: '/marca/fuentes/cormorant-garamond-latin-600-normal.woff2' },
    ],
    precarga: '/marca/fuentes/cormorant-garamond-latin-600-normal.woff2',
  },

  // El monograma "LI", sin texto ni imágenes de terceros.
  archivos: {
    logo: { ruta: '/marca/logo.svg', ancho: 512, alto: 512 },
    logoEncabezado: { ruta: '/marca/logo-encabezado.svg', ancho: 512, alto: 512 },
    logoPng: '/marca/logo.png',
    favicon: '/marca/favicon.svg',
    compartir: '/marca/compartir.png',
  },

  equipo: {
    menu: 'Abogados',
    titulo: 'Equipo de abogados',
    volver: 'Volver a abogados',
    ruta: 'abogados',
  },

  // Personas inventadas: las mismas de los datos de muestra, sin fotos.
  integrantes: [
    {
      slug: 'sofia-lucero',
      nombre: 'Sofía Lucero',
      genero: 'femenino',
      titulo: 'Abogada | Especialista en Derecho Laboral',
      foto: null,
      resumen:
        'Me dedico al Derecho Laboral desde que me recibí. Escucho primero, explico con claridad y busco, con cada persona, la salida más conveniente para su caso.',
      texto: [
        'Me recibí de abogada en la Universidad Nacional de Rosario y desde el comienzo orienté mi práctica al Derecho Laboral, tanto del lado de los trabajadores como del de las empresas.',
        'Me especialicé en relaciones laborales y sigo formándome, porque las normas y los criterios de los tribunales cambian todo el tiempo.',
        'Creo que la mayoría de los conflictos laborales se resuelven mejor si se encaran a tiempo. Por eso le doy mucha importancia a la consulta preventiva y a un intercambio telegráfico bien hecho.',
        'Me dedico al Derecho Laboral desde que me recibí. Escucho primero, explico con claridad y busco, con cada persona, la salida más conveniente para su caso.',
      ],
    },
    {
      slug: 'julian-ibarra',
      nombre: 'Julián Ibarra',
      genero: 'masculino',
      titulo: 'Abogado | Mediador | Especialista en Derecho de Daños',
      foto: null,
      resumen:
        'Acompaño a quienes sufrieron un accidente o un daño para que obtengan una reparación completa. Prefiero un buen acuerdo a un juicio largo, pero cuando hace falta litigar, lo hago a fondo.',
      texto: [
        'Soy abogado y mediador. Desde hace más de diez años me dedico a los reclamos por accidentes de tránsito, accidentes de trabajo y daños personales y patrimoniales.',
        'Acompaño a quienes sufrieron un accidente o un daño para que obtengan una reparación completa, frente a la persona responsable o frente a su compañía de seguros.',
        'Mi formación como mediador me enseñó que muchas veces la mejor solución se alcanza en una negociación. Prefiero un buen acuerdo a un juicio largo, pero cuando hace falta litigar, lo hago a fondo.',
      ],
    },
    {
      slug: 'carolina-ferreyra',
      nombre: 'Carolina Ferreyra',
      genero: 'femenino',
      titulo: 'Abogada | Especialista en Sucesiones',
      foto: null,
      resumen:
        'Ayudo a las familias a resolver una sucesión con el menor desgaste posible. Quiero que cada heredero entienda el trámite y que los acuerdos lleguen antes que los conflictos.',
      texto: [
        'Me recibí de abogada en la Universidad Nacional de Rosario y me especialicé en Derecho de Familia y Sucesiones.',
        'Una sucesión llega casi siempre en un momento difícil. Ayudo a las familias a resolverla con el menor desgaste posible, desde la declaratoria de herederos hasta la inscripción de los bienes.',
        'Quiero que cada heredero entienda el trámite y que los acuerdos lleguen antes que los conflictos. Cuando hay diferencias, busco primero el diálogo; si no alcanza, defiendo los derechos de mis clientes en el juzgado.',
      ],
    },
  ],

  // Un único WhatsApp y un único email, los de Bourder Web: quien prueba la demo y escribe le
  // llega a quien la mostró. Las redes son ficticias: los enlaces van a la página principal de
  // cada red, como las redes de muestra (spec 007, RF-24).
  contacto: {
    whatsapps: [
      { nombre: 'Lucero | Ibarra', numero: '5493454017104', visible: '+54 9 345 401-7104' },
    ],
    emails: [{ nombre: 'Lucero | Ibarra', email: 'contacto@bourderweb.com.ar' }],
    direccion: 'Córdoba 1452, piso 3, Rosario',
    horarios: ['Lunes a viernes, de 9 a 13 h y de 16 a 19 h'],
    redes: [
      { red: 'Instagram', usuario: '@luceroibarra.abogados', url: 'https://www.instagram.com/' },
      { red: 'LinkedIn', usuario: 'Lucero | Ibarra Abogados', url: 'https://www.linkedin.com/' },
    ],
  },

  textos: {
    apertura: 'Asesoramiento legal estratégico, con especial dedicación al Derecho Laboral.',
    introServicios:
      'Nuestro trabajo parte del análisis particular de cada situación, priorizando soluciones estratégicas.',

    servicios: {
      'derecho-laboral': {
        nombre: 'Derecho Laboral',
        titulo: 'Derecho Laboral',
        frase:
          'Acompañamos tanto a empresas como a trabajadores en la prevención, gestión y resolución de conflictos.',
        bloques: [],
      },
      accidentes: {
        nombre: 'Accidentes y Enfermedades Laborales',
        titulo: 'Accidentes de trabajo y enfermedades profesionales',
        frase:
          'Brindamos asesoramiento y representación integral frente a accidentes de trabajo y enfermedades vinculadas con la actividad laboral.',
        bloques: [
          p(
            'Brindamos asesoramiento y representación integral frente a accidentes de trabajo y enfermedades vinculadas con la actividad laboral, acompañando al trabajador durante las distintas etapas del reclamo.',
          ),
          p(
            'Intervenimos en trámites ante ART y Comisiones Médicas, rechazo de contingencias, determinación y revisión de incapacidades, divergencias en las prestaciones y reclamos indemnizatorios, tanto en instancia administrativa como judicial.',
          ),
        ],
      },
      danos: {
        nombre: 'Derecho de Daños',
        titulo: 'Derecho de Daños',
        frase:
          'Intervenimos en reclamos destinados a obtener la reparación integral de los daños sufridos.',
        bloques: [
          p(
            'Intervenimos en reclamos destinados a obtener la reparación integral de los daños sufridos como consecuencia de hechos que generan responsabilidad.',
          ),
          p('Asesoramos y representamos en casos de:'),
          list(
            'Accidentes de tránsito.',
            'Daños personales y patrimoniales.',
            'Responsabilidad civil.',
            'Reclamos frente a compañías aseguradoras.',
            'Negociaciones extrajudiciales y acciones indemnizatorias.',
          ),
        ],
      },
      sucesiones: {
        nombre: 'Sucesiones',
        titulo: 'Sucesiones',
        frase:
          'Acompañamos a nuestros clientes durante todo el proceso sucesorio, procurando simplificar el trámite.',
        bloques: [
          p(
            'Acompañamos a nuestros clientes durante todo el proceso sucesorio, procurando simplificar el trámite y facilitar los acuerdos necesarios entre los interesados.',
          ),
          p('Nuestro asesoramiento comprende:'),
          list(
            'Sucesiones testamentarias y ab intestato.',
            'Declaratoria de herederos.',
            'Denuncia y administración de bienes.',
            'Acuerdos entre herederos.',
            'Cesiones de derechos hereditarios.',
            'Partición y adjudicación de bienes.',
            'Inscripción de inmuebles y demás bienes registrables.',
          ),
        ],
      },
    },

    pestanasLaboral: {
      empresas: {
        titulo: 'Derecho Laboral para empresas',
        descripcion:
          'Asesoramos a empresas y empleadores en la gestión cotidiana de las relaciones laborales.',
        destacados: [
          'Asesoramiento laboral preventivo',
          'Gestión de contingencias',
          'Acompañamiento permanente',
        ],
        bloques: [
          p(
            'Asesoramos a empresas y empleadores en la gestión cotidiana de las relaciones laborales, procurando anticipar contingencias y brindar respuestas claras frente a situaciones que requieren decisiones rápidas y jurídicamente seguras.',
          ),
          p('Nuestro asesoramiento comprende, entre otros aspectos:'),
          list(
            'Contratación, registración y modalidades de trabajo.',
            'Remuneraciones, jornada, licencias y condiciones laborales.',
            'Aplicación e interpretación de convenios colectivos de trabajo.',
            'Sanciones disciplinarias y conflictos durante la relación laboral.',
            'Desvinculaciones y estrategias de negociación.',
            'Intercambios telegráficos.',
            'Conciliaciones y acuerdos laborales.',
            'Prevención de contingencias y planificación de estrategias.',
            'Representación y defensa en procesos judiciales laborales.',
          ),
        ],
      },
      trabajadores: {
        titulo: 'Derecho Laboral para trabajadores',
        descripcion:
          'Asesoramos y representamos a trabajadores frente a conflictos individuales derivados de la relación laboral.',
        destacados: [],
        bloques: [
          p(
            'Asesoramos y representamos a trabajadores frente a conflictos individuales derivados de la relación laboral, desde la primera consulta y el intercambio telegráfico hasta la negociación o eventual instancia judicial.',
          ),
          p('Intervenimos especialmente en:'),
          list(
            'Despidos y diferencias indemnizatorias.',
            'Trabajo no registrado o deficientemente registrado.',
            'Diferencias salariales y de categoría.',
            'Modificaciones de las condiciones de trabajo.',
            'Licencias y enfermedades inculpables.',
            'Situaciones de discriminación y conflictos laborales.',
            'Intercambios telegráficos.',
            'Negociaciones y acuerdos.',
            'Reclamos y procesos judiciales laborales.',
          ),
        ],
      },
    },

    mensajesWhatsapp: {
      general: 'Hola, me contacto desde el sitio web del estudio.',
      empresas:
        'Hola, me contacto desde el sitio web por una consulta de Derecho Laboral para empresas.',
      trabajadores:
        'Hola, me contacto desde el sitio web por una consulta de Derecho Laboral para trabajadores.',
      accidentes:
        'Hola, me contacto desde el sitio web por una consulta sobre accidentes de trabajo y enfermedades profesionales.',
      danos: 'Hola, me contacto desde el sitio web por una consulta sobre Derecho de Daños.',
      sucesiones: 'Hola, me contacto desde el sitio web por una consulta sobre sucesiones.',
    },

    derechos: '© <año> - Lucero | Ibarra - Abogados. Todos los derechos reservados.',
  },
};
