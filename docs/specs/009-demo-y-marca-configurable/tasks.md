# Tareas 009 — Demo y marca configurable

Derivadas de `spec.md` y `plan.md` de esta carpeta. Cada tarea dura entre 20 y 30 minutos y se hace en orden.

Reglas para todas las tareas:
- Primero se escriben los tests, después el código.
- **Al terminar cada tarea** pasan, sin errores:
  - los tests de la tarea y los unitarios del paquete que toca (`pnpm --filter web test`, `pnpm --filter api test:unit`);
  - los tipos: en web, `npx tsc --noEmit -p tsconfig.app.json`; en api, `npx tsc --noEmit -p tsconfig.json`;
  - `pnpm lint` y Prettier (ver la regla de Prettier más abajo).
- **`pnpm test` completo** (unos 25 minutos, con los e2e) se corre en los puntos de control marcados con ⏱ y al final.
- **Antes del primer `pnpm test` completo**, se le pregunta al usuario si `api/.env.test` apunta a la base de tests de la demo: los tests vacían las tablas.
- **Mientras corren los e2e**, no se edita código de la api ni se corren otros e2e: comparten la base.
- Ninguna tarea toca `.env`, `.env.test` ni credenciales, ni se conecta a la base de producción ni a la de la demo.
- No se agregan dependencias (plan, "Decisiones").
- Con este `tasks.md` aprobado, se pueden modificar o borrar los archivos existentes que cada tarea indica con **(modifica existente)** o **(borra)**. Cualquier otro archivo existente se consulta antes.
- Autorizado por el usuario el 03/11/2026: en los tests que listan los módulos o archivos permitidos (por ejemplo, `aislamiento-sitio.test.ts`) se suman solo los módulos nuevos que define el plan, sin quitar ni cambiar ningún control. Cada tarea lo anota.
- Prettier se verifica sobre el código con `pnpm exec prettier --check --end-of-line auto "web/**/*.{ts,tsx,js,css,html,json}" "api/**/*.{ts,js,json}"`. Con `core.autocrlf=true`, los archivos existentes tienen CRLF en Windows y git los guarda con LF. El Markdown no se formatea con Prettier, como en las specs 001 a 008. `web/src/componentes/ContactoSitio.tsx` ya tenía un problema de formato antes de esta spec, y se corrige solo si una tarea lo toca.
- Los tests existentes no pierden casos: cambian de dónde toman el valor esperado (RF-14).
- No se hacen commits ni push.

**Orden en dos etapas.**
1. **T1 a T9:** todo pasa a leer del archivo de marca, cargado con los datos del estudio original, así nada cambia de comportamiento.
2. **T10:** se carga la marca de ejemplo. Si los tests siguen en verde sin tocarlos, queda probado RF-14.

## Marca en un único archivo (con los datos de hoy)

- [x] **T1 — Tipos, archivo de marca y contraste** [RF-1, RF-4, RF-8, RF-9] **(modifica existente: `web/src/servicios/marca.ts`)**
  - `servicios/tipos-marca.ts` (nuevo): las interfaces de D3, con `genero` en cada integrante.
  - `servicios/marca.ts` suma `MARCA` con los datos de hoy, copiados de `datos-estudio.ts`, `contenido-sitio.ts`, `rutas-sitio.ts` (descripciones de las pestañas), `tailwind.config.js` y las rutas actuales de las imágenes. Las dos integrantes van con `genero: 'femenino'` y `equipo` con los textos de hoy (`abogadas`). Las exportaciones viejas (`LOGO_PATH`, …) se conservan por ahora, armadas desde `MARCA.archivos`.
  - `servicios/contraste.ts` y su test.

  Hecho cuando:
  - `contraste.test.ts` verifica la fórmula con pares conocidos (negro y blanco, 21 a 1) y que el blanco de `MARCA` contrasta 4,5 a 1 o más con el oscuro y con el azul.
  - `marca.ts` no importa nada salvo `import type`.

- [x] **T2 — Los servicios leen de la marca** [RF-1, RF-2, RF-5, RF-6, RF-10, RF-11, RF-14] **(modifica existente: `servicios/datos-estudio.ts`, `contenido-sitio.ts`, `rutas-sitio.ts`, `presentacion-sitio.ts`, `redes-de-muestra.ts`, sus tests `datos-estudio.test.ts`, `contenido-sitio.test.ts`, `rutas-sitio.test.ts`, `presentacion-sitio.test.ts`, `formulario-modelo.test.ts`, y `pruebas/anexo-spec-007.ts`)**
  - `STUDIO_CONTACT`, los textos y la lista de integrantes se arman desde `MARCA`. Se borra `TITULO_PROFESIONAL`.
  - `lawyerName` según `genero`, y las funciones nuevas `photoAlt`, `moreInfoSuffix` y `teamSectionPath`. `lawyerPath` y `REDIRECTS` usan `MARCA.equipo.ruta`.
  - Los tests de estos servicios toman lo esperado de `MARCA`. Las comparaciones con el anexo de la spec 007 quedan solo para los textos que no son de la marca.

  Hecho cuando:
  - Los tests verifican el tratamiento, `photoAlt` y `moreInfoSuffix` con una integrante de cada género, armadas en el test.
  - Las direcciones del equipo y `REDIRECTS` se arman con otra palabra de equipo.
  - Los cuatro servicios están en el orden y con las direcciones de RF-11, con los textos de `MARCA`.
  - El resto de la suite de web sigue en verde sin cambios.

- [x] **T3 — Los componentes leen de la marca** [RF-2, RF-5, RF-6, RF-8] **(modifica existente: `componentes/FotoAbogada.tsx`, `TarjetaAbogada.tsx`, `MenuSitio.tsx`, `PieSitio.tsx`, `VolverA.tsx`, `EncabezadoSitio.tsx`, `DisenoMarca.tsx`, `DisenoSeccion.tsx`, `MenuLateral.tsx`, `IconosRedes.tsx`, `NombreEstudio.tsx`, `paginas/SitioAbogada.tsx`, `paginas/SitioInicio.tsx`, `RutasSitio.tsx`)**
  - `photoAlt` y `moreInfoSuffix` en la foto y en la tarjeta.
  - El `id` de la sección del equipo, sus enlaces y la ruta `/<ruta>/:slug` salen de `MARCA.equipo.ruta`.
  - Los logos salen de `MARCA.archivos`, y el blanco de `IconosRedes`, de `MARCA.colores.blanco`.
  - Los comentarios dejan de nombrar al estudio original.
  - Se borran `LOGO_PATH2` y `LOGO_PATH3` de `marca.ts`.

  Hecho cuando:
  - Ningún componente tiene escrito un dato de la marca, una ruta de imagen de la marca ni "abogadas" como dirección. Se verifica con `rg`.
  - La suite de web sigue en verde sin cambiar los tests.

- [x] **T4 — Los tests de componentes leen de la marca** [RF-14] **(modifica existente: en `componentes/`, `BotonWhatsapp.test.tsx`, `ContactoSitio.test.tsx`, `DisenoMarca.test.tsx`, `DisenoSitio.test.tsx`, `Disenos.test.tsx`, `EditorAbogados.test.tsx`, `EncabezadoSitio.test.tsx`, `MenuLateral.test.tsx`, `NombreEstudio.test.tsx`, `PieSitio.test.tsx`, `SelectorIntegrantes.test.tsx`, `TarjetaAbogada.test.tsx`; y los ayudantes de `pruebas/` que tengan datos de la marca)**
  Cada valor de la marca escrito a mano se reemplaza por su valor en `MARCA` o en `STUDIO_CONTACT`. Si un test necesita una forma fija para probar una regla (por ejemplo, dos WhatsApp o una integrante sin foto), arma sus propios datos de prueba, ficticios, y se los pasa al componente. Donde "Pertusatti" o "Sabalette" eran solo nombres de personas de prueba, pasan a nombres ficticios.

  Hecho cuando: estos archivos no contienen "Pertusatti", "Sabalette", los números, los emails, la dirección, la cuenta de Instagram ni los colores del estudio original, y todos siguen en verde.

- [x] **T5 — Los tests de páginas y rutas leen de la marca** [RF-14] **(modifica existente: en `paginas/`, `PaginaCambiarContrasena.test.tsx`, `PaginaIngreso.test.tsx`, `PanelCausaDetalle.test.tsx`, `PanelCausas.test.tsx`, `PanelModeloDetalle.test.tsx`, `PanelUsuarioDetalle.test.tsx`, `SitioAbogada.test.tsx`, `SitioDerechoLaboral.test.tsx`, `SitioInicio.test.tsx`; y `RutasSitio.test.tsx`)**
  Igual que T4.

  Hecho cuando: lo mismo que en T4, para estos archivos.

  ⏱ **Punto de control:** antes de correrlo, preguntarle al usuario por `api/.env.test`. Después, `pnpm test` completo.

- [x] **T6 — Tipografía, colores y página base desde la marca** [RF-2, RF-3, RF-8] **(modifica existente: `web/tailwind.config.js`, `web/src/index.css`, `web/index.html`, `web/vite.config.ts`, `servicios/cabecera-pagina.ts`, `servicios/cabecera-pagina.test.ts`, `web/src/fuentes.test.ts`, `servicios/marca.ts`; mueve `web/public/fuentes/` a `web/public/marca/fuentes/`)**
  - `tailwind.config.js` toma de `MARCA` los colores, la familia de los títulos y las `@font-face` (plugin con `addBase`). Salen las `@font-face` de `index.css`.
  - `brandHeadTags(MARCA)` en `cabecera-pagina.ts`: favicon, `apple-touch-icon` y precarga de la tipografía.
  - `index.html` lleva la marca `<!--marca-->`, que reemplaza el plugin de `vite.config.ts`.

  Hecho cuando:
  - `fuentes.test.ts` verifica que cada archivo de `MARCA.tipografiaTitulos.archivos` existe en `public/`, que la configuración de Tailwind genera una `@font-face` por archivo con `font-display: swap`, y que nada se pide a otros sitios.
  - `cabecera-pagina.test.ts` verifica `brandHeadTags`.
  - `pnpm --filter web build` (con `VITE_URL_SITIO` de prueba en la línea de comando, sin tocar `.env`) genera un CSS con las `@font-face` y los colores de la marca, y un `index.html` con el favicon y la precarga.

- [x] **T7 — Cabecera, archivos del sitio y `.htaccess` desde la marca** [RF-2, RF-6] **(modifica existente: `servicios/cabecera-pagina.ts`, `servicios/archivos-sitio.ts`, sus tests, `web/public/.htaccess`, `web/src/htaccess.test.ts`, `web/scripts/prerender.ts`, `web/src/fotos.test.ts`)**
  - `legalServiceData` y las etiquetas de la vista previa toman las imágenes de `MARCA.archivos`. Se borran `FULL_LOGO_PATH` y `SHARE_IMAGE_PATH` de `marca.ts`.
  - `.htaccess` usa la marca `EQUIPO_RUTA`, y `buildSiteFiles` la reemplaza. El prerenderizado lee `dist/.htaccess` y lo vuelve a escribir.
  - `fotos.test.ts` revisa las imágenes de `MARCA.archivos` y de las integrantes.

  Hecho cuando:
  - Los tests verifican el reemplazo de `EQUIPO_RUTA` con otra palabra de equipo, y que la plantilla de `.htaccess` lo tiene una sola vez.
  - Las imágenes de la cabecera y de los datos para buscadores son las de `MARCA`.
  - El build genera `dist/.htaccess` con `abogadas`.

- [x] **T8 — Test de marca única** [RF-13]
  `web/src/marca-unica.test.ts`, como lo describe el plan, con su caso de control.

  Hecho cuando:
  - El test pasa sobre el código actual.
  - Falla, con el archivo y el dato, si se escribe el nombre del estudio en un componente o un color de la marca en un archivo de `api/src`. Se prueba a mano y se deshace.

- [x] **T9 — WhatsApp con un solo número** [RF-7] **(modifica existente: `componentes/BotonWhatsapp.tsx`, `componentes/BotonWhatsapp.test.tsx`)**

  Hecho cuando los tests verifican que:
  - Con un número, el botón es un enlace directo con el nombre "Escribinos por WhatsApp", el mensaje de la página, `target="_blank"` y `rel="noopener noreferrer"`. En el ingreso y en el portal, sin mensaje.
  - Con dos, sigue el menú de hoy, con todos sus casos.

  ⏱ **Punto de control:** `pnpm test` completo.

## Marca de ejemplo

- [x] **T10 — Imágenes y datos de la marca de ejemplo** [RF-3, RF-12, RF-14] **(modifica existente: `servicios/marca.ts`, `componentes/PieSitio.tsx`; borra: `web/public/fotos/`, `web/public/favicon.svg`, `web/public/marca/logo2.svg`, `logo3.svg`, `SVG/`, `LOGO VECTORIZADO ( FONDO AZUL).pdf`; reemplaza: `web/public/marca/logo.svg`, `logo.png`, `compartir.png`; mueve: `web/public/marca/bourder-web.svg` a `web/public/diseno/`)**
  - El monograma "LI" en `logo.svg`, `logo-encabezado.svg` y `favicon.svg`, con los colores del anexo A.
  - `logo.png` (512 × 512) y `compartir.png` (1200 × 630), generados con Chrome sin ventana desde un HTML del scratchpad.
  - `MARCA` pasa a tener los datos del anexo A: tres integrantes sin foto, un WhatsApp y un email, y equipo `abogados`.

  Hecho cuando:
  - Todos los tests de web pasan **sin modificar ningún test** (RF-14), incluidos `fotos.test.ts` (sin EXIF), `contraste.test.ts` y `marca-unica.test.ts`.
  - `MARCA` coincide con el anexo A, verificado con un script del scratchpad.
  - En `npm run dev` (sin conectarse a ninguna base) se ven el logo, los colores y las tres integrantes con sus iniciales.

- [x] **T11 — Nombres ficticios en los tests unitarios de la api** [RF-12] **(modifica existente: `api/src/causas/causa-detalle.spec.ts`, `api/src/consola/administrador-principal.service.spec.ts`, `api/src/modelos-escritos/completar-escrito.spec.ts`)**
  "Sabalette" pasa a un apellido ficticio que no es de la marca.

  Hecho cuando: `rg -i "pertusatti|sabalette|persaestudio|3454|3455|2c3256|415789|fcffff|pueyrred|concordia" web api/src` no encuentra nada, salvo lo que corrige T22.

## Modo demo en la web

- [x] **T12 — Modo demo y cuentas de prueba** [RF-15, RF-18] **(modifica existente: `web/src/vite-env.d.ts`, `web/.env.example`)**
  - `servicios/modo-demo.ts` y su test.
  - `servicios/cuentas-demo.ts` (web) y `api/src/demo/cuentas-demo.ts` (api, solo datos).
  - `servicios/cuentas-demo.test.ts`, que lee como texto el archivo de la api y el SQL.
  - `VITE_MODO_DEMO` en `vite-env.d.ts` y en `web/.env.example`.

  Hecho cuando:
  - `isDemoEnabled` solo acepta `'true'`.
  - El test verifica que los DNI de web y api son los mismos tres, que cada uno está en el SQL con su nombre y su rol, y que la contraseña es la del encabezado del SQL.

- [x] **T13 — Cuentas de prueba en el ingreso** [RF-16, RF-17] **(modifica existente: `paginas/PaginaIngreso.tsx`, `paginas/PaginaIngreso.test.tsx`)**
  `componentes/CuentasDemo.tsx` y su test. `PaginaIngreso` recibe `modoDemo` y muestra el recuadro después de T-3.

  Hecho cuando los tests verifican que:
  - Sin modo demo, no está el recuadro.
  - Con el modo encendido, están el título, el texto y las tres cuentas del anexo B, en orden, cada botón con su nombre para el lector de pantalla.
  - "Usar esta cuenta" reemplaza lo escrito, borra el aviso de error, deja el foco en "Ingresar" y no envía nada.
  - Nada se guarda en el navegador.

- [x] **T14 — Fuera de los buscadores en modo demo** [RF-25] **(modifica existente: `servicios/cabecera-pagina.ts`, `servicios/archivos-sitio.ts`, sus tests, `web/scripts/prerender.ts`)**
  `buildHead`, `robotsTxt` y `buildSiteFiles` reciben `modoDemo`. `prerender.ts` lo lee con `loadEnv`.

  Hecho cuando:
  - Los tests verifican, con el modo encendido, que cada página pública, la de dirección inexistente y `app.html` llevan `noindex`, que las páginas públicas conservan la vista previa, que `robots.txt` es `User-agent: *` y `Disallow: /` sin `Sitemap:`, y que no hay `sitemap.xml`.
  - Con el modo apagado, todo queda como en la spec 007.
  - Construyendo con `VITE_MODO_DEMO=true` y sin ella (variables en la línea de comando), `dist/` muestra cada caso, y "Muestra2026" solo aparece con el modo encendido.

  ⏱ **Punto de control:** `pnpm test` completo.

## API

- [x] **T15 — `MODO_DEMO` en el entorno** [RF-15] **(modifica existente: `api/src/configuracion/validar-entorno.ts`, `api/src/configuracion/validar-entorno.spec.ts`, `api/.env.example`)**

  Hecho cuando: los tests verifican `MODO_DEMO` ausente (`false`), `true`, `false` e inválido (la api no arranca, con su mensaje).

- [x] **T16 — Protección de las cuentas de prueba** [RF-19] **(modifica existente: `api/src/usuarios/usuarios.service.ts`, `usuarios.module.ts`, `api/src/autenticacion/autenticacion.service.ts`, `autenticacion.module.ts`, y los specs unitarios de esos servicios que construyen sus dependencias)**
  - `api/src/demo/proteccion-demo.service.ts`, su spec y `demo.module.ts`.
  - La llamada a `assertModifiable` en `update`, `deactivate`, `reactivate`, `resetPassword`, `releaseEmail`, `transferPrincipal` (destino y principal actual) y `changePassword`.
  - En web, comprobar que ninguna pantalla de cuentas reemplaza por un texto propio el mensaje de un 403 de esas acciones. Si alguna lo hace, se avisa antes de cambiarla.

  Hecho cuando:
  - Los specs verifican que, con el modo apagado, no hay rechazo.
  - Con el modo encendido, se rechaza con 403 y el mensaje del anexo B para un integrante y para un cliente de prueba, y no para otra cuenta.

- [x] **T17 — E2e de la protección** [RF-19]
  `api/test/proteccion-demo.e2e-spec.ts`, con `MODO_DEMO` encendido con `vi.hoisted`.

  Hecho cuando el e2e verifica, para cada pedido de la tabla del contrato:
  - El 403 con su mensaje sobre una cuenta de prueba, y que esa cuenta no cambió en la base.
  - El funcionamiento normal sobre una cuenta común.

  Se corre solo este archivo, sin otros e2e en paralelo.

- [x] **T18 — Migración de la base de la demo** [RF-21] **(modifica existente: `api/src/base-de-datos/esquema.ts`; y `api/test/migraciones.e2e-spec.ts` si lista las migraciones o las tablas)**
  `api/src/migraciones/<timestamp>-crear-base-demo.ts` y `api/test/migracion-base-demo.e2e-spec.ts`.

  Hecho cuando:
  - El e2e verifica que `base_demo` se crea vacía y que `down` la borra.
  - `migraciones.e2e-spec.ts` sigue sin cambios pendientes de esquema.

  ⏱ **Punto de control:** `pnpm test` completo.

- [x] **T19 — Fechas y script de los datos de muestra** [RF-18, RF-20, RF-22] **(modifica existente: `api/datos-de-muestra/datos-de-muestra.sql`, solo el nombre del proyecto en el encabezado)**
  `api/src/demo/fechas-demo.ts`, `script-datos-de-muestra.ts`, sus specs, y `cuentas-demo.spec.ts`.

  Hecho cuando los specs verifican:
  - `daysToShift` en un cambio de mes, en un cambio de año y con 0 días; `argentinaDate` alrededor de la medianoche; y `shiftableColumns`.
  - Que `FECHA_REFERENCIA` es la fecha más reciente de todo el SQL, sin contar la de los fallos (spec 009, RF-22, corregido el 03/11/2026).
  - Que `prepareSampleScript` quita la transacción del SQL real y rechaza los textos de control.
  - Que cada DNI de prueba está en el SQL con su rol, activo y sin cambio pendiente, y que el hash corresponde a "Muestra2026".

- [x] **T20 — Restablecimiento** [RF-20 a RF-23]
  `api/src/demo/restablecimiento-demo.ts` (`checkCanReset` y `resetSampleData`), su spec y `api/test/restablecimiento-demo.e2e-spec.ts`.

  Hecho cuando:
  - El spec verifica los cuatro casos de `checkCanReset`.
  - El e2e verifica sobre la base de tests: cantidades por tabla, fechas corridas salvo la de los fallos, `sesiones` vacía y las tres cuentas de prueba que ingresan con "Muestra2026".
  - Con un SQL roto, la base queda como estaba. Al terminar, quedan vacías todas las tablas.
  - Se corre solo este archivo.

- [x] **T21 — Comandos de consola y Docker** [RF-20, RF-21, RF-24] **(modifica existente: `api/package.json` (solo scripts), `api/Dockerfile`)**
  `api/src/demo/restablecer-demo.ts` y `marcar-base-demo.ts`; los scripts `demo:marcar` y `demo:restablecer`; `COPY` de `datos-de-muestra/` en el `Dockerfile`.

  Hecho cuando:
  - `pnpm --filter api build` compila los dos comandos.
  - Corridos sin `MODO_DEMO` (el `.env` de desarrollo no lo tiene), los dos se niegan con su mensaje, terminan con código 1 y no tocan la base.
  - La ruta al SQL se resuelve desde `dist/demo/`.

- [x] **T22 — Nombres ficticios en los e2e de la api** [RF-12] **(modifica existente: en `api/test/`, `abogados-causas`, `alta-causas`, `alta-usuarios`, `consulta-fallos`, `consulta-modelos`, `desactivacion-causas`, `desactivacion-fallos`, `desactivacion-modelos`, `edicion-causas`, `escrito-completado`, `historial-cambios-movimientos`, `integrantes-causas`, `listado-usuarios`, `migracion-causas`, `migracion-fuero-opcional`, `migracion-jurisprudencia`, `migracion-modelos-escritos`, `migracion-movimientos`, `modificacion-fallos`, `modificacion-modelos` y `modificacion-usuarios`, todos `.e2e-spec.ts`)**
  "Pertusatti" y "Sabalette" pasan a apellidos ficticios que no son de la marca.

  Hecho cuando:
  - `rg -i "pertusatti|sabalette" --glob '!docs/specs/00[1-8]*/**'` no encuentra nada en el proyecto.
  - Los tipos de la api pasan.

  ⏱ **Punto de control:** `pnpm test` completo.

## Cierre

- [x] **T23 — Documentación** [criterios de finalización] **(modifica existente: `README.md`, `AGENTS.md`, `docs/constitution.md`)**
  - README:
    - El nombre `estudioJuridicoSDD` y la estructura.
    - La spec 009 en la hoja de ruta. Se corrige el estado de la 007 y se suma la 008, que figuraba como pendiente.
    - "Cambiar de marca".
    - "Modo demo": las variables, `demo:marcar` y `demo:restablecer`.
    - La tarea programada de Easypanel, con `0 4 * * *` en el huso de Buenos Aires.
  - AGENTS.md y la constitución: solo el nombre del proyecto.

  Hecho cuando: las secciones están, y ninguna menciona el nombre ni los datos del estudio original.

- [x] **T24 — Validación** [todos]
  - Búsqueda final de los datos del estudio original.
  - Builds con y sin `VITE_MODO_DEMO`, para revisar `dist/`.
  - `pnpm test` y `pnpm lint` completos.
  - `validacion.md`, con cada RF, su test y su resultado, los criterios de finalización y el veredicto.
  - Las tareas marcadas en este archivo.

  Hecho cuando: `validacion.md` existe y `pnpm test` y `pnpm lint` pasan sin errores. Se le muestra el resultado al usuario.

## Ajustes fuera de las tareas
- 03/11/2026, autorizado por el usuario: `api/test/partes-cliente-alta.e2e-spec.ts` esperaba un 400 cuando se rechaza la única parte del alta, pero la spec 002 (RF-7 y casos límite) y el código crean la causa sin partes y responden 201 con el rechazo. Venía así del proyecto original. Los dos casos pasan a esperar lo que dice la spec 002; el código no cambia.
- T15: `api/src/base-de-datos/opciones-base-de-datos.spec.ts` suma `MODO_DEMO: false` a su entorno de prueba, porque el tipo `Environment` tiene la variable nueva.
- Punto de control de T18, decisión del usuario del 03/11/2026: los e2e cuyo `beforeAll` no tiene un límite propio usan el de vitest (10 s). Contra la base remota, preparar la base a veces tarda más, y con la migración de `base_demo` pasa más seguido. Cuando uno se corta, el archivo siguiente choca con la migración que quedó corriendo ("Table 'base_demo' already exists"). No se cambian los tiempos de espera: queda anotado en `validacion.md`.
- T22, autorizado por el usuario el 03/11/2026: el `name` del `package.json` de la raíz pasa de `estudio-sabalette` a `estudio-juridico-sdd` (RF-12).
