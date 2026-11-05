# Plan 009 — Demo y marca configurable

Plan técnico de la spec 009. Cambia `web/` (la marca, los tests, el ingreso y el prerenderizado) y `api/` (la protección de las cuentas de prueba, el restablecimiento y una migración). No agrega dependencias [RNF de stack].

## Decisiones

### D1. El archivo de marca es `web/src/servicios/marca.ts` [RF-1 a RF-4]
- Hoy `servicios/marca.ts` solo tiene las rutas del logo. Pasa a ser el archivo de marca: exporta `MARCA`, un objeto de datos sin funciones, sin React y sin `import.meta.env`. Sus tipos van en `servicios/tipos-marca.ts`, nuevo, que solo declara interfaces. `marca.ts` los importa con `import type`, así no arrastra ningún otro módulo.
- Lo leen la aplicación, el prerenderizado (a través de los servicios), `tailwind.config.js` y `vite.config.ts`. Se verificó que Tailwind 3.4 carga un `.ts` importado desde `tailwind.config.js`: lo transpila con jiti.
- Va en `servicios/` y no en una carpeta propia porque es el lugar de lo que no es interfaz (principio 3) y porque ya existe con ese nombre.
- Alternativas descartadas:
  - Un JSON en la raíz. No admite comentarios ni tipos, y Tailwind y Vite leen igual un `.ts`.
  - Un paquete compartido del monorepo. La api no usa ningún dato de la marca (se verificó: "Pertusatti" y "Sabalette" solo aparecen en sus tests, como nombres de personas de prueba), así que un paquete nuevo no se justifica.

### D2. Una carpeta de imágenes: `web/public/marca/` [RF-3]
- Contiene:
  - `logo.svg`: el logo cuadrado, que se usa en el menú, en el ingreso y en el pie.
  - `logo-encabezado.svg`: el logo apaisado del encabezado del sitio, que hoy es `logo2.svg`.
  - `favicon.svg`, `logo.png` (512 × 512) y `compartir.png` (1200 × 630).
  - `fotos/` y `fuentes/`.
- Se mueven ahí `public/fuentes/` y `public/fotos/`.
- Se borran:
  - `public/favicon.svg`, el ícono por defecto de Vite, que no se usa.
  - Los archivos del estudio original: `logo2.svg`, `logo3.svg`, `SVG/`, el PDF del logo y las fotos de las abogadas.
- `bourder-web.svg` no es de la marca del estudio (spec 009, RF-10): pasa a `public/diseno/bourder-web.svg`.
- `public/decoracion/balanza.svg` no lleva colores de la marca y queda donde está.
- El logo de ejemplo (el monograma "LI" del anexo A) se dibuja en SVG. Los PNG se generan una sola vez con Chrome sin ventana (`--headless --screenshot`), que está instalado en la máquina. No se agrega ninguna dependencia, y las capturas no llevan datos EXIF (spec 007, RF-21; `fotos.test.ts`).

### D3. Forma del archivo de marca [RF-1, RF-5 a RF-8, RF-10]
```ts
export const MARCA: Marca = {
  nombre: 'Lucero | Ibarra - Abogados',
  nombreLineas: ['Lucero | Ibarra', 'Abogados'],
  colores: { oscuro: '#22303C', claro: '#3E5C76', blanco: '#FAFCFD' },
  tipografiaTitulos: {
    familia: 'Cormorant Garamond',
    reemplazo: ['Georgia', 'serif'],
    archivos: [{ peso: 500, ruta: '/marca/fuentes/…-500-normal.woff2' }, { peso: 600, ruta: '…' }],
    precarga: '/marca/fuentes/…-600-normal.woff2',
  },
  archivos: {
    logo: { ruta: '/marca/logo.svg', ancho: 512, alto: 512 },
    logoEncabezado: { ruta: '/marca/logo-encabezado.svg', ancho: …, alto: … },
    logoPng: '/marca/logo.png',
    favicon: '/marca/favicon.svg',
    compartir: '/marca/compartir.png',
  },
  equipo: { menu: 'Abogados', titulo: 'Equipo de abogados', volver: 'Volver a abogados', ruta: 'abogados' },
  integrantes: [
    { slug: 'sofia-lucero', nombre: 'Sofía Lucero', genero: 'femenino', titulo: '…', foto: null,
      resumen: '…', texto: ['…'] },
    …
  ],
  contacto: {
    whatsapps: [{ nombre: 'Lucero | Ibarra', numero: '5493454017104', visible: '+54 9 345 401-7104' }],
    emails: [{ nombre: 'Lucero | Ibarra', email: 'contacto@bourderweb.com.ar' }],
    direccion: 'Córdoba 1452, piso 3, Rosario',
    horarios: ['Lunes a viernes, de 9 a 13 h y de 16 a 19 h'],
    redes: [{ red: 'Instagram', usuario: '@luceroibarra.abogados', url: 'https://www.instagram.com/' }, …],
  },
  textos: {
    apertura: '…',             // T-1
    introServicios: '…',       // T-2
    servicios: { 'derecho-laboral': { nombre, titulo, frase }, accidentes: { nombre, titulo, frase, bloques }, … },
    pestanasLaboral: { empresas: { destacados, bloques, descripcion }, trabajadores: { … } },
    mensajesWhatsapp: { general, empresas, trabajadores, accidentes, danos, sucesiones },  // T-15
    derechos: '© <año> - Lucero | Ibarra - Abogados. Todos los derechos reservados.',      // T-18
  },
};
```
- La estructura del sitio queda fija en `contenido-sitio.ts` [RF-11]: las claves de los servicios, sus direcciones, el orden y las dos pestañas. El archivo de marca solo trae sus textos, en un `Record<ClaveServicio, …>`, así TypeScript exige los cuatro.
- Las descripciones de las pestañas de Derecho Laboral (T-16), que hoy están escritas en `rutas-sitio.ts`, pasan al archivo de marca.
- `genero: 'femenino' | 'masculino'` da el tratamiento y los artículos [RF-5].

### D4. El modo demo se enciende con variables de entorno [RF-15]
- Web: `VITE_MODO_DEMO=true` al construir. API: `MODO_DEMO=true` en el servicio de Easypanel. Cualquier otro valor, o la variable ausente, deja el modo apagado. En la api, un valor que no sea `true` ni `false` frena el arranque, como las demás variables de `validar-entorno.ts`.
- `servicios/modo-demo.ts` (nuevo) exporta `isDemoEnabled(valor)`, una función pura, y `DEMO_MODE = isDemoEnabled(import.meta.env.VITE_MODO_DEMO)`. Vite reemplaza la variable por su valor al construir, así que con el modo apagado el recuadro y las cuentas quedan fuera del código publicado [RNF de seguridad]. Se verifica en la validación, buscando "Muestra2026" en `dist/`.
- Alternativa descartada: un campo `modoDemo` en el archivo de marca. Mezclaría la identidad del estudio con cómo se publica: la misma marca se puede publicar como demo o como sitio real. Además, la api no lee el archivo de marca (D1) y necesita saberlo igual.

### D5. Las cuentas de prueba, en un archivo por paquete, verificados contra los datos de muestra [RF-16 a RF-19]
- `web/src/servicios/cuentas-demo.ts` (nuevo) tiene `CUENTAS_DEMO`, con el rol que se muestra, el nombre, el DNI y el nombre para el lector de pantalla (anexo B), y `CONTRASENA_DEMO`.
- `api/src/demo/cuentas-demo.ts` (nuevo) tiene `DNIS_CUENTAS_DEMO`, los tres documentos.
- Dos tests sostienen RF-18:
  - Uno de la api lee `datos-de-muestra.sql` y verifica que cada DNI protegido existe con su rol, activo y sin cambio de contraseña pendiente, y que el hash de la contraseña (`@hash`) corresponde a "Muestra2026", con bcrypt.
  - Uno de web lee como texto (`?raw`, como ya hace `anexo-spec-007.ts`) el archivo de la api y el SQL. Verifica que los DNI coinciden con los de `CUENTAS_DEMO`, que cada nombre está en su fila y que la contraseña es la que indica el encabezado del SQL.
- Alternativas descartadas:
  - Un endpoint que devuelva las cuentas. Sería una dirección nueva que entrega una contraseña, y el ingreso dependería de la api para mostrarse.
  - Un archivo compartido entre los paquetes. La imagen Docker de la api no lleva `web/`.

### D6. La base de la demo se identifica con una marca dentro de la base [RF-21]
- Migración nueva `CrearBaseDemo`: crea la tabla `base_demo` (`id` int PK, `marcadaEn` datetime(6)) y no inserta nada. Corre en todas las bases, así que en todas la tabla existe vacía.
- Comando nuevo `demo:marcar` (`node dist/demo/marcar-base-demo.js`): con `MODO_DEMO=true`, y si el nombre de la base no contiene "test", inserta la fila si no está. Se corre una sola vez en la base de la demo, a mano.
- El restablecimiento exige las tres cosas: `MODO_DEMO=true`, un nombre de base que no contenga "test" (la misma regla que ya usan los e2e en `loadTestEnvironment`) y la fila en `base_demo`.
- Los tests nunca insertan esa fila. Tampoco hace falta borrarla: `clearTables` no vacía `base_demo`, y en la base de tests nunca se corre `demo:marcar`, porque se niega por el nombre.
- Alternativa descartada: una variable con el nombre de la base de la demo. No distingue dos bases con el mismo nombre en servidores distintos, y una copia de variables entre servicios de Easypanel la arrastra. La marca, en cambio, vive en la base misma.

### D7. El restablecimiento es un comando de consola disparado por un cron de Easypanel [RF-20 a RF-24]
- `node dist/demo/restablecer-demo.js` en el servicio de la api, programado en Easypanel con `0 4 * * *`. El servidor está en el huso de Buenos Aires (UTC-3, sin horario de verano), así que son las 4:00 de Argentina. Para desarrollo, `pnpm --filter api demo:restablecer`.
- Vacía con `DELETE`, dentro de una transacción, y no con `TRUNCATE`: en MySQL, `TRUNCATE` cierra la transacción en curso, y RF-20 pide que un error deje la base como estaba. Los id siguen creciendo de un día al otro; no se usan para nada visible, así que se acepta.
- Carga `datos-de-muestra.sql` dentro de esa misma transacción. El archivo trae su propio `START TRANSACTION;` y `COMMIT;`, que se le quitan antes de ejecutarlo, porque un `START TRANSACTION` dentro de otra transacción la confirma. El archivo queda igual, y se puede seguir cargando a mano como hasta ahora. Un test verifica que el SQL no tiene otras sentencias que cierren la transacción (`TRUNCATE`, `CREATE`, `ALTER`, `DROP`, `COMMIT` ni `START TRANSACTION` fuera de la primera y la última línea).
- Corre las fechas con un `UPDATE … = … + INTERVAL n DAY` por columna. Las columnas salen de `information_schema`: todas las `date`, `datetime` y `timestamp` de la base, salvo `fallos.fecha`, `migraciones` y `base_demo`. Así, una tabla nueva con fechas queda incluida sin tocar el comando.
- Todo eso va en una conexión propia con `multipleStatements: true`, que es una opción de `mysql2`, ya instalado. Solo la usa el comando; la api sigue sin sentencias múltiples.
- Alternativas descartadas:
  - `@nestjs/schedule` dentro de la api: una dependencia nueva (principio 1), correría en cada réplica, y la aplicación que atiende pedidos tendría el código que borra todo.
  - Un `EVENT` de MySQL: necesita el planificador de eventos y privilegios que el usuario de Easypanel puede no tener, y la lógica quedaría en SQL, sin tests de Vitest (principio 4).
- En el runtime de la imagen, el comando necesita el SQL: `api/Dockerfile` copia `api/datos-de-muestra/` a `/app/datos-de-muestra/`. El comando lo busca en `../../datos-de-muestra/datos-de-muestra.sql` desde `dist/demo/`, la misma ruta relativa en desarrollo y en la imagen.

### D8. El modo demo llega al prerenderizado como un parámetro [RF-25]
- `scripts/prerender.ts` lee `VITE_MODO_DEMO` con `loadEnv`, como ya lee `VITE_URL_SITIO`, y se lo pasa a `buildSiteFiles(plantilla, urlSitio, render, { modoDemo })`.
- `buildHead(pagina, urlSitio, contact, modoDemo)` suma `<meta name="robots" content="noindex">` a toda página cuando `modoDemo` está encendido. Las etiquetas de la vista previa al compartir se conservan (casos límite de buscadores).
- `robotsTxt(urlSitio, modoDemo)` devuelve `User-agent: *` y `Disallow: /`, sin la línea `Sitemap:`. `buildSiteFiles` no genera `sitemap.xml`.
- Son funciones puras, con sus tests, como hoy.

### D9. `.htaccess` con la palabra del equipo [RF-6]
`public/.htaccess` tiene hoy escrito `RewriteRule ^abogadas$ /#abogadas`. La regla pasa a tener la marca `EQUIPO_RUTA`, que `buildSiteFiles` reemplaza por `MARCA.equipo.ruta` al escribir `dist/.htaccess`. El prerenderizado ya reescribe archivos de `dist/`: suma este a su lista. `htaccess.test.ts` verifica la marca en la plantilla y el reemplazo.

### D10. La tipografía y la página base salen de la marca [RF-8]
- `tailwind.config.js` importa `MARCA`:
  - `colors.estudio` = `MARCA.colores`.
  - `fontFamily.titulos` = `[familia, ...reemplazo]`.
  - Un plugin con `addBase` declara un `@font-face` por archivo de `tipografiaTitulos.archivos`, con `font-display: swap` y el mismo `unicode-range` de hoy.
- Las dos `@font-face` escritas a mano salen de `index.css`.
- `index.html` cambia el favicon, el `apple-touch-icon` y la precarga de la tipografía por la marca `<!--marca-->`. Un plugin de `vite.config.ts` (`transformIndexHtml`) la reemplaza con `brandHeadTags(MARCA)`, una función pura nueva de `cabecera-pagina.ts`, en desarrollo y al construir.
- Alternativa descartada: dejar las `@font-face` en `index.css` con los nombres de archivo de hoy. Cambiar de tipografía obligaría a tocar el CSS, en contra de RF-3.
- Ajuste durante T6. `vite.config.ts` se verifica con `tsconfig.node.json` (`module: nodenext`), que exige la extensión `.ts` en los imports y no conoce `import.meta.env`. Por eso:
  - `brandHeadTags`, `fontFaceRules` y `titleFontStack` van en `servicios/marca-construccion.ts`, nuevo, y no en `cabecera-pagina.ts`, que importa `datos-estudio.ts`.
  - `escapeHtml` pasa a `servicios/escapar-html.ts`, y `cabecera-pagina.ts` lo reexporta.
  - `marca.ts`, `tipos-marca.ts`, `marca-construccion.ts` y `escapar-html.ts` importan con la extensión `.ts`, que `tsconfig.app.json` ya admite (`allowImportingTsExtensions`).

### D11. Un solo WhatsApp abre la conversación directa [RF-7]
`BotonWhatsapp` muestra hoy un botón que abre un menú. Con `whatsapps.length === 1`, en su lugar va un enlace (`<a>`) con el mismo nombre para el lector de pantalla, el mismo aspecto, `target="_blank"` y `rel="noopener noreferrer"` (spec 007, RF-25). Apunta a `whatsappUrl(whatsapps[0], mensaje)`, sin mensaje en el ingreso y en el portal. Con dos o más, el menú queda como está.

### D12. Se conservan los nombres de los identificadores
`ABOGADAS`, `Abogada`, `lawyerName` y los demás se usan en unos 40 archivos. Renombrarlos a "integrantes" no cambia ningún comportamiento y agrandaría el cambio. Quedan como están, con un comentario que aclara que incluyen a abogados.

## Web

### Archivos nuevos
- `servicios/tipos-marca.ts`: `Marca`, `Integrante` (hoy `Abogada`, más `genero`), `WhatsappEstudio`, `EmailEstudio`, `RedSocial`, `Bloque` y los textos de los servicios [RF-1].
- `servicios/modo-demo.ts` y su test [RF-15].
- `servicios/cuentas-demo.ts` y su test contra el SQL y la api [RF-16, RF-18].
- `servicios/contraste.ts`, con `contrastRatio(hexA, hexB)` según WCAG, y su test. El test verifica la fórmula con pares conocidos y, después, el blanco de `MARCA` contra los otros dos colores [RF-9].
- `componentes/CuentasDemo.tsx` y su test: el recuadro del anexo B. Es una `<section aria-labelledby>` con una lista; cada cuenta lleva su rol, nombre, DNI, contraseña y un `<button type="button">` con `aria-label`. Recibe `onUse(cuenta)` [RF-16, RF-17].
- `marca-unica.test.ts` (en `web/src/`): el test de RF-13 (ver "Estrategia de tests").

### Archivos existentes que se modifican
- `servicios/marca.ts`: pasa a tener `MARCA` (D1, D3). Sus exportaciones de rutas (`LOGO_PATH`, `FULL_LOGO_PATH`, `SHARE_IMAGE_PATH`) se reemplazan por `MARCA.archivos`. `LOGO_PATH2` y `LOGO_PATH3` desaparecen.
- `servicios/datos-estudio.ts`:
  - `STUDIO_CONTACT` se arma con `MARCA.nombre`, `MARCA.nombreLineas` y `MARCA.contacto`. Las funciones (`whatsappUrl`, `mapsUrl`, `pickNetworks`, `networksToShow`) no cambian.
  - Las interfaces pasan a `tipos-marca.ts` y se reexportan, así los componentes no cambian sus `import`.
- `servicios/redes-de-muestra.ts`: sin cambios de datos (no son de la marca); solo cambia el `import type`.
- `servicios/contenido-sitio.ts`:
  - `APERTURA`, `INTRO_SERVICIOS`, los textos de `SERVICIOS` y de `PESTANAS_LABORAL`, y `MENSAJES_WHATSAPP` se toman de `MARCA.textos`. `ABOGADAS` = `MARCA.integrantes`.
  - `TEXTOS.menu.abogadas`, `TEXTOS.inicio.equipoAbogadas` y `TEXTOS.detalle.volverAAbogadas` se toman de `MARCA.equipo`, y `TEXTOS.pie.derechos`, de `MARCA.textos.derechos`.
  - Se borra `TITULO_PROFESIONAL`: cada integrante trae el suyo.
  - `lawyerName` antepone "Dra." o "Dr." según `genero`. Funciones nuevas:
    - `photoAlt(abogada)`: "Foto de la Dra. …" o "Foto del Dr. …".
    - `moreInfoSuffix(abogada)`: "sobre la Dra. …" o "sobre el Dr. …".
    - `teamSectionPath()`: `/#abogados`.
  - `lawyerPath` usa `MARCA.equipo.ruta` [RF-5, RF-6].
- `servicios/rutas-sitio.ts`:
  - Las descripciones de las pestañas salen de la marca.
  - `REDIRECTS` arma `/<ruta>` → `/#<ruta>` con la palabra de la marca [RF-6].
- `servicios/presentacion-sitio.ts`: solo comentarios; ya usa `STUDIO_CONTACT.nombre`.
- `servicios/cabecera-pagina.ts`:
  - Toma las imágenes de `MARCA.archivos`.
  - `buildHead` recibe `modoDemo` (D8).
  - Función nueva `brandHeadTags(marca)` (D10) [RF-2, RF-25].
- `servicios/archivos-sitio.ts`: `robotsTxt`, `buildSiteFiles` con `modoDemo`, y la marca `EQUIPO_RUTA` del `.htaccess` (D8, D9) [RF-25, RF-6].
- `scripts/prerender.ts`: lee `VITE_MODO_DEMO` y procesa `.htaccess` (D8, D9).
- `index.html`: la marca `<!--marca-->` (D10). `index.css`: sin las `@font-face`. `tailwind.config.js`: lee `MARCA` (D10). `vite.config.ts`: el plugin de D10.
- `vite-env.d.ts`: declara `VITE_MODO_DEMO`.
- `public/.htaccess`: la marca `EQUIPO_RUTA` (D9).
- Componentes:
  - `FotoAbogada.tsx` (`photoAlt`) y `TarjetaAbogada.tsx` (`moreInfoSuffix`) [RF-5].
  - `MenuSitio.tsx`, `PieSitio.tsx`, `SitioAbogada.tsx` y `SitioInicio.tsx` (el `id` de la sección y sus enlaces salen de `MARCA.equipo.ruta`) [RF-6].
  - `RutasSitio.tsx` (la ruta `/${ruta}/:slug`).
  - `EncabezadoSitio.tsx`, `DisenoMarca.tsx`, `DisenoSeccion.tsx` y `MenuLateral.tsx` (logos de `MARCA.archivos`).
  - `PieSitio.tsx` (logo y Bourder Web en `/diseno/`).
  - `IconosRedes.tsx`: `#FCFFFF` → `MARCA.colores.blanco` [RF-8].
  - `NombreEstudio.tsx`: solo el comentario.
  - `BotonWhatsapp.tsx` (D11) [RF-7].
- `paginas/PaginaIngreso.tsx` [RF-16, RF-17]:
  - Recibe `modoDemo = DEMO_MODE`; los tests pasan `true` o `false`.
  - Con el modo encendido, muestra `CuentasDemo` dentro de la tarjeta, después de T-3.
  - `onUse` completa los campos, borra el aviso de error y lleva el foco a "Ingresar" (con una referencia al botón).
- Imágenes: D2.

### Carpetas y archivos que se borran
`public/fotos/` (las fotos del estudio original), `public/marca/logo2.svg`, `logo3.svg`, `SVG/`, `LOGO VECTORIZADO ( FONDO AZUL).pdf`, `public/favicon.svg`. `public/fuentes/` se mueve a `public/marca/fuentes/` [RF-3, RF-12].

## API

### Archivos nuevos (`api/src/demo/`)
- `cuentas-demo.ts`: `DNIS_CUENTAS_DEMO` y `CONTRASENA_DATOS_DE_MUESTRA` (solo para el test del hash) [RF-18].
- `proteccion-demo.service.ts`: `DemoProtectionService.assertModifiable(usuario)`. Con `MODO_DEMO` encendido, si el documento de la cuenta está en `DNIS_CUENTAS_DEMO`, lanza `ForbiddenException('Esta cuenta es de la demo y no se puede modificar.')`. El documento es `usuario.dni` (integrantes) o, si es cliente, `cliente.dni ?? cliente.cuit` [RF-19].
- `demo.module.ts`: exporta el servicio. Lo importan `UsuariosModule` y `AutenticacionModule`.
- `fechas-demo.ts`, funciones puras [RF-22]:
  - `FECHA_REFERENCIA = '2026-10-24'`.
  - `argentinaDate(ahora)`: el día en `America/Argentina/Buenos_Aires`, con `Intl`.
  - `daysToShift(referencia, hoy)`.
  - `shiftableColumns(columnas)`: filtra la lista de `information_schema` (D7).
- `script-datos-de-muestra.ts`, funciones puras [RF-20]:
  - `prepareSampleScript(sql)` quita la primera `START TRANSACTION;` y el último `COMMIT;`.
  - Falla si queda una sentencia que cierra la transacción (D7).
- `restablecimiento-demo.ts` [RF-20 a RF-23]:
  - `checkCanReset({ modoDemo, baseDeDatos, marcada })`, pura. Devuelve `null` o el mensaje del anexo B.
  - `resetSampleData(queryRunner, sql, dias)`: la transacción de D7.
- `restablecer-demo.ts`: la entrada de consola. Crea su `DataSource` con `multipleStatements`, verifica, ejecuta, imprime el mensaje y termina con código 0 o 1.
- `marcar-base-demo.ts`: la entrada de consola de D6.

### Archivos existentes que se modifican
- `configuracion/validar-entorno.ts`: `MODO_DEMO: boolean`, opcional, que solo acepta `true` o `false` [RF-15].
- `usuarios/usuarios.service.ts`: llama a `assertModifiable` sobre la cuenta afectada en `update`, `deactivate`, `reactivate`, `resetPassword` y `releaseEmail`. En `transferPrincipal`, sobre la cuenta destino y sobre la principal actual, porque la transferencia cambia las dos. La llamada va después de las comprobaciones de permisos que ya existen, así una cuenta ajena sigue respondiendo como hoy (404 o 403) [RF-19]. `usuarios.module.ts` importa `DemoModule`.
- `autenticacion/autenticacion.service.ts`: `changePassword` llama a `assertModifiable` sobre el propio usuario antes de verificar la contraseña actual. `autenticacion.module.ts` importa `DemoModule` [RF-19].
- `base-de-datos/esquema.ts`: suma la migración `CrearBaseDemo` al final de `MIGRATIONS`. No hay entidad: el comando consulta la tabla con SQL.
- `migraciones/<timestamp>-crear-base-demo.ts`, nuevo, con `up` y `down` (D6).
- `package.json` (scripts, sin dependencias): `demo:marcar` y `demo:restablecer`, con `nest build && node dist/demo/…`, como `admin:principal`.
- `Dockerfile`: `COPY --from=build /repo/api/datos-de-muestra ./datos-de-muestra` (D7).
- `.env.example`: `MODO_DEMO=false`, con su comentario.
- `datos-de-muestra/datos-de-muestra.sql`: el encabezado dice `estudioJuridicoSDD` en lugar de `estudioSabalette`. No cambia ningún dato.

### Contrato de la API
No hay direcciones nuevas. Con `MODO_DEMO=true`, estos pedidos devuelven **403** con `{ message: 'Esta cuenta es de la demo y no se puede modificar.' }` cuando la cuenta afectada es de prueba, después de validar el cuerpo y los permisos de hoy [RF-19]:

| Método | Ruta | Roles |
|---|---|---|
| PATCH | `/api/panel/usuarios/:id` | admin, abogado |
| POST | `/api/panel/usuarios/:id/desactivar` | admin, abogado |
| POST | `/api/panel/usuarios/:id/reactivar` | admin, abogado |
| POST | `/api/panel/usuarios/:id/restablecer-contrasena` | admin, abogado |
| POST | `/api/panel/usuarios/:id/liberar-email` | admin, abogado |
| POST | `/api/panel/usuarios/:id/transferir-principal` | admin (principal) |
| PUT | `/api/sesion/contrasena` | cualquiera con sesión |

La web ya muestra el primer mensaje de un `ApiError` (`cliente-http.ts`), así que no cambia nada para mostrarlo. La tarea correspondiente verifica que ningún componente trata el 403 de esas acciones con un texto propio.

### Restablecimiento, en pseudocódigo [RF-20 a RF-23]
```
main():
  env = validateEnvironment(.env o entorno del servicio)
  ds = new DataSource({ ...buildDataSourceOptions(env), multipleStatements: true })
  marcada = existe fila en base_demo                       // si la tabla no existe: false
  error = checkCanReset({ modoDemo: env.MODO_DEMO, baseDeDatos: env.DB_DATABASE, marcada })
  si error: imprimir error; salir con 1                   // no borró nada
  sql = prepareSampleScript(leer ../../datos-de-muestra/datos-de-muestra.sql)
  dias = daysToShift(FECHA_REFERENCIA, argentinaDate(ahora))
  intentar:
    resetSampleData(queryRunner, sql, dias); imprimir "Datos de muestra restablecidos. Fechas corridas <dias> días."; salir con 0
  si falla: imprimir "No se pudieron restablecer…"; salir con 1

resetSampleData(qr, sql, dias):
  qr.startTransaction()
  try:
    SET FOREIGN_KEY_CHECKS = 0
    para cada tabla de information_schema salvo migraciones y base_demo: DELETE FROM tabla
    SET FOREIGN_KEY_CHECKS = 1
    qr.query(sql)                                          // sentencias múltiples
    para cada (tabla, columna) de shiftableColumns(...): UPDATE tabla SET columna = columna + INTERVAL dias DAY
    qr.commitTransaction()
  catch: qr.rollbackTransaction(); relanzar
  finally: SET FOREIGN_KEY_CHECKS = 1
```
Vaciar `sesiones` cierra todas las sesiones [RF-23]. Los datos de muestra hacen principal a Carolina Ferreyra, porque la tabla queda sin principal.

### Easypanel [RF-24]
En el README:
- La variable `MODO_DEMO=true` del servicio de la api y `VITE_MODO_DEMO=true` en la construcción de la web.
- Correr una vez `node dist/demo/marcar-base-demo.js` desde la consola del servicio.
- Crear la tarea programada del servicio con `0 4 * * *` y el comando `node dist/demo/restablecer-demo.js`. El servidor de Easypanel está en el huso de Buenos Aires (UTC-3). Si alguna vez pasara a UTC, la expresión sería `0 7 * * *`.

## Estrategia de tests

### Unitarios de web (Vitest + jsdom)
- `marca-unica.test.ts` [RF-13]:
  - Recorre con `node:fs` `web/src`, `web/scripts`, `web/index.html` y `../api/src`, sin `servicios/marca.ts`.
  - Busca, sin distinguir mayúsculas, el nombre completo, la primera línea, cada `numero` y cada `visible` de WhatsApp, cada email y cada color de `MARCA`. Falla con la lista "archivo: dato".
  - La búsqueda es una función del propio test, con un caso de control: un texto con el nombre de la marca la hace fallar.
- `contraste.test.ts` [RF-9], `modo-demo.test.ts` [RF-15] y `cuentas-demo.test.ts` [RF-18].
- `contenido-sitio.test.ts` [RF-5, RF-6, RF-11, RF-14]:
  - Las comparaciones con el anexo de la spec 007 quedan solo para los textos que no son de la marca (T-17 sin los del equipo, T-22).
  - Los de la marca se verifican contra `MARCA`: los cuatro servicios en orden, con sus textos; el tratamiento, `photoAlt` y `moreInfoSuffix` con una integrante de cada género (datos de prueba armados en el test); y las direcciones con otra palabra de equipo.
  - `anexo-spec-007.ts` se conserva para esos textos.
- `cabecera-pagina.test.ts` y `archivos-sitio.test.ts` [RF-25, RF-6]:
  - Cada página con y sin `modoDemo`.
  - `robots.txt` en los dos modos, y sin `sitemap.xml` en el modo demo.
  - `.htaccess` con la palabra del equipo.
  - `brandHeadTags`.
- `BotonWhatsapp.test.tsx` [RF-7]: con un número es un enlace directo con el mensaje; con dos, el menú de hoy.
- `CuentasDemo.test.tsx` y `PaginaIngreso.test.tsx` [RF-16, RF-17]:
  - Sin modo demo, no hay recuadro.
  - Con el modo encendido, están las tres cuentas en orden; "Usar esta cuenta" reemplaza lo escrito, borra el error, enfoca "Ingresar" y no llama a `login`.
- `fuentes.test.ts` y `fotos.test.ts`: leen las rutas de `MARCA` y verifican que los archivos existen en `public/marca/`, que el plugin de Tailwind declara una `@font-face` por archivo y que nada se pide a otros sitios [RF-3, RF-8].
- Los tests existentes que escriben a mano un dato de la marca pasan a leerlo de `MARCA` o de `STUDIO_CONTACT` [RF-14]. Son unos 30 archivos de `web/src`, entre ellos:
  - Los de `componentes/`: `BotonWhatsapp`, `ContactoSitio`, `DisenoSitio`, `Disenos`, `EditorAbogados`, `EncabezadoSitio`, `MenuLateral`, `NombreEstudio`, `PieSitio`, `SelectorIntegrantes` y `TarjetaAbogada`.
  - Los de `paginas/`: `PaginaCambiarContrasena`, `PaginaIngreso`, `PanelCausaDetalle`, `PanelCausas`, `PanelModeloDetalle`, `PanelUsuarioDetalle`, `SitioAbogada`, `SitioDerechoLaboral` y `SitioInicio`.
  - Los de `servicios/`: `archivos-sitio`, `cabecera-pagina`, `contenido-sitio`, `datos-estudio`, `formulario-modelo`, `presentacion-sitio` y `rutas-sitio`.
  - Los ayudantes de `pruebas/`, como `whatsapp-de-prueba.ts`.

  Donde un test usa un apellido del estudio original solo como persona de prueba (por ejemplo, un abogado "Sabalette" en `PanelCausas`), pasa a un nombre ficticio que no es de la marca.

### Unitarios de la api (Vitest)
- `fechas-demo.spec.ts` [RF-22]:
  - `daysToShift` en el mismo mes, en un cambio de mes y en un cambio de año, y con 0 días.
  - `argentinaDate` a las 23:30 y a las 2:30 UTC.
  - `shiftableColumns` deja afuera `fallos.fecha`, `migraciones` y `base_demo`.
  - `FECHA_REFERENCIA` es la fecha más reciente de todo el SQL (el último ingreso de una cuenta, 24/10/2026), sin contar la de los fallos.
- `script-datos-de-muestra.spec.ts` [RF-20]:
  - Sobre el SQL real: quita la transacción y no deja sentencias que la cierren.
  - Con textos de control: rechaza un `TRUNCATE` o un `COMMIT` en el medio.
- `restablecimiento-demo.spec.ts` [RF-21]: `checkCanReset` con el modo apagado, con una base con "test", sin la marca, y con todo en regla.
- `cuentas-demo.spec.ts` [RF-18]: cada DNI en el SQL con su rol, activo y sin cambio pendiente, y el hash de "Muestra2026" (bcrypt).
- `proteccion-demo.service.spec.ts` [RF-19]: con el modo apagado no lanza; con el modo encendido lanza para un integrante y para un cliente de prueba, y no para otra cuenta.
- `validar-entorno.spec.ts`: `MODO_DEMO` ausente, `true`, `false` e inválido.
- `causa-detalle.spec.ts`, `administrador-principal.service.spec.ts` y `completar-escrito.spec.ts`: el apellido "Sabalette" pasa a uno ficticio [RF-12, RF-14].

### E2e de la api (Vitest, en serie, contra la base de tests)
- `migracion-base-demo.e2e-spec.ts`: la migración crea `base_demo` vacía, y el `down` la borra [D6]. `migraciones.e2e-spec.ts` suma la migración nueva, si lista las migraciones.
- `proteccion-demo.e2e-spec.ts` [RF-19]:
  - Enciende `MODO_DEMO` con `vi.hoisted`, antes de importar `AppModule`, porque `ConfigModule` lee el entorno al importarse.
  - Crea cuentas con los DNI de prueba y otras comunes.
  - Verifica el 403 y el mensaje en cada pedido de la tabla del contrato, que la cuenta no cambió en la base, y que sobre una cuenta común todos funcionan.
- `restablecimiento-demo.e2e-spec.ts` [RF-20, RF-22, RF-23]:
  - Llama a `resetSampleData` sobre la base de tests, sin pasar por `checkCanReset` y sin marcar la base.
  - Verifica las cantidades de filas de cada tabla, que las fechas se corrieron `n` días y la fecha de los fallos no, que `sesiones` quedó vacía y que las tres cuentas ingresan con "Muestra2026".
  - Con un SQL roto al final, verifica que la base quedó como estaba.
  - Al terminar, vacía todas las tablas, para no dejar datos a los siguientes tests.
- Los e2e que usan "Sabalette" como apellido de prueba pasan a uno ficticio [RF-12]. Son unos 20 archivos de `api/test/`.

### Lo que se verifica a mano (validación)
- Los colores, el logo y la tipografía.
- `dist/` construido con y sin `VITE_MODO_DEMO`: "Muestra2026" solo aparece con el modo encendido; con el modo encendido, cada HTML tiene `noindex`, `robots.txt` dice `Disallow: /` y no hay `sitemap.xml`.
- Una búsqueda en todo el proyecto, salvo `docs/specs/001` a `008`, de "Pertusatti", "Sabalette", "persaestudio", los teléfonos y los colores viejos [RF-12].
- `MARCA` contra el anexo A de la spec 009, una sola vez, con un script.

## Documentación
- `README.md`:
  - El nombre `estudioJuridicoSDD` y la spec 009 en la hoja de ruta.
  - "Cambiar de marca": editar `web/src/servicios/marca.ts`, reemplazar `web/public/marca/` y correr los tests.
  - "Modo demo": las variables, `demo:marcar`, `demo:restablecer` y la tarea programada de Easypanel.
- `AGENTS.md` y `docs/constitution.md`: el nombre del proyecto.
- `web/.env.example` (`VITE_MODO_DEMO`) y `api/.env.example` (`MODO_DEMO`).

## Cobertura de la spec
| RF | Dónde |
|---|---|
| RF-1 a RF-4 | D1 a D3, `marca.ts`, `tipos-marca.ts`, carpeta `public/marca/` |
| RF-5, RF-6 | `contenido-sitio.ts`, `rutas-sitio.ts`, componentes del sitio, `.htaccess` (D9) |
| RF-7 | D11, `BotonWhatsapp.tsx` |
| RF-8, RF-9 | D10, `tailwind.config.js`, `IconosRedes.tsx`, `contraste.ts` |
| RF-10, RF-11 | `contenido-sitio.ts`, `presentacion-sitio.ts` |
| RF-12 | Marca de ejemplo, imágenes borradas, tests y SQL sin datos del estudio original |
| RF-13, RF-14 | `marca-unica.test.ts` y tests ajustados |
| RF-15 | D4, `modo-demo.ts`, `validar-entorno.ts` |
| RF-16 a RF-18 | D5, `CuentasDemo.tsx`, `PaginaIngreso.tsx`, `cuentas-demo.ts` (web y api) |
| RF-19 | `proteccion-demo.service.ts`, `usuarios.service.ts`, `autenticacion.service.ts` |
| RF-20 a RF-24 | D6, D7, `api/src/demo/`, migración, `Dockerfile`, README |
| RF-25 | D8, `cabecera-pagina.ts`, `archivos-sitio.ts`, `prerender.ts` |

## Riesgos
- **Unos 50 archivos de tests cambian.** Se hacen por grupos, con los unitarios de cada grupo antes de seguir.
- **Los e2e comparten la base.** Ningún e2e corre mientras se edita la api. El de restablecimiento vacía todo al terminar.
- **El huso del cron de Easypanel.** El servidor está en el huso de Buenos Aires (UTC-3), así que el cron usa `0 4 * * *`. Al publicar se verifica que el primer restablecimiento corra a las 4:00.
- **El plugin de `@font-face` en Tailwind.** Si no generara las reglas con `unicode-range`, la alternativa es generarlas en `index.html` con el mismo plugin de Vite de D10. La tarea lo verifica con un test.
