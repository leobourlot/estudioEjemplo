# Validación 009 — Demo y marca configurable

Recorrido de `spec.md` requisito por requisito (tarea T24). Corrida de cierre del 03/11/2026: `pnpm test` completo, con código de salida 0.

| Paquete | Archivos | Tests | Resultado |
|---|---|---|---|
| web | 128 | 1919 | todos en verde |
| api, unitarios | 56 | 1357 | todos en verde |
| api, e2e | 81 | 895 | todos en verde |

`pnpm lint` pasa sin errores en los dos paquetes, y los tipos también: `tsc --noEmit` con `tsconfig.app.json` y `tsconfig.node.json` en web, y con `tsconfig.json` en api. Prettier no marca diferencias en el código, salvo `web/src/componentes/ContactoSitio.tsx`, que ya las tenía antes de esta spec (ver "Observaciones").

Rutas abreviadas:
- **W**: tests de `web/src/...`.
- **A**: tests unitarios de `api/src/...`.
- **E**: tests e2e de `api/test/...`.

## Requisitos funcionales

| RF | Qué se verifica | Tests | Resultado |
|---|---|---|---|
| RF-1 | Todo lo que identifica al estudio sale de `MARCA`: nombre, integrantes, equipo, contacto, colores, tipografía, imágenes y textos | W `servicios/marca.test.ts`, `datos-estudio.test.ts`, `contenido-sitio.test.ts`, `rutas-sitio.test.ts` | ✅ |
| RF-2 | El sitio, el ingreso, el cambio de contraseña, el portal, el panel, los títulos, la cabecera, la vista previa, los datos para buscadores y la página base usan la marca | W `cabecera-pagina.test.ts`, `archivos-sitio.test.ts`, `marca-construccion.test.ts`, `Disenos.test.tsx`, `SitioInicio.test.tsx`, `PaginaIngreso.test.tsx`, `PaginaCambiarContrasena.test.tsx`; build revisado (favicon, precarga, `@font-face`, colores) | ✅ |
| RF-3 | Imágenes y tipografía en `web/public/marca/`; cambiar de estudio es editar `marca.ts` y esa carpeta | W `fuentes.test.ts`, `fotos.test.ts`, `marca.test.ts`; prueba con una tercera marca (ver RF-14) | ✅ |
| RF-4 | `marca.ts` solo tiene datos: no importa nada que se ejecute ni usa variables de entorno; sin credenciales | W `marca.test.ts`; las cuentas de prueba están en `cuentas-demo.ts`, fuera de la marca | ✅ |
| RF-5 | "Dra." o "Dr.", "Foto de la/del", "Más información sobre la/el", iniciales y título de la página, según el género | W `contenido-sitio.test.ts`, `TarjetaAbogada.test.tsx`, `SitioAbogada.test.tsx`, `rutas-sitio.test.ts` | ✅ |
| RF-6 | Menú, título, "Volver a…" y direcciones del equipo con la palabra de la marca, también en `.htaccess` | W `contenido-sitio.test.ts`, `rutas-sitio.test.ts`, `RutasSitio.test.tsx`, `htaccess.test.ts`, `archivos-sitio.test.ts`; build con `dist/.htaccess` y `dist/abogados/*.html` | ✅ |
| RF-7 | Con un WhatsApp, enlace directo con el mensaje, aparte; con dos, el menú de siempre | W `BotonWhatsapp.test.tsx`, `Disenos.test.tsx`, `DisenoSitio.test.tsx` | ✅ |
| RF-8 | Colores y tipografía de los títulos desde la marca, con sus `@font-face` generadas por Tailwind; el blanco de los íconos de redes también | W `fuentes.test.ts` (CSS generado por Tailwind con la configuración real), `marca-construccion.test.ts`, `DisenoMarca.test.tsx` | ✅ (aspecto: demo manual) |
| RF-9 | Los tests fallan si el blanco no contrasta 4,5 a 1 con el oscuro o con el claro | W `contraste.test.ts` | ✅ (marca de ejemplo: 13,1 y 6,8 a 1) |
| RF-10 | Títulos con el nombre de la marca; leyenda de derechos de la marca con el año; "Diseñado por Bourder Web" sin cambios | W `presentacion-sitio.test.ts`, `rutas-sitio.test.ts`, `contenido-sitio.test.ts`, `PieSitio.test.tsx` | ✅ |
| RF-11 | Cuatro servicios, dos pestañas y sus direcciones fijas; la marca solo cambia los textos | W `contenido-sitio.test.ts`, `rutas-sitio.test.ts` | ✅ |
| RF-12 | Marca de ejemplo del anexo A; ningún dato del estudio original en el código, las imágenes, los datos de muestra ni los tests | Script de comparación con el anexo A (coinciden); búsqueda en todo el proyecto (ver "Criterios de finalización"); imágenes y fotos del estudio original borradas | ✅ |
| RF-13 | Un test falla si un dato de la marca aparece en otro archivo de `web/src`, `web/scripts`, `web/index.html` o `api/src` | W `marca-unica.test.ts`, con su caso de control; probado a mano con el nombre en un componente y un color en `api/src/main.ts` | ✅ |
| RF-14 | Los tests toman de la marca lo que es de la marca; otra marca no rompe ninguno | Con una tercera marca de prueba (otro nombre y otros colores, dos WhatsApp, sin emails, sin dirección ni redes, una abogada y un abogado sin textos, equipo `equipo`), los 124 archivos y 1870 tests de la web pasaron sin cambiar ningún test; después se restituyó la marca de ejemplo | ✅ |
| RF-15 | Modo demo apagado por defecto; solo `true` lo enciende (`VITE_MODO_DEMO`, `MODO_DEMO`); apagado, nada de la demo | W `modo-demo.test.ts`, `PaginaIngreso.test.tsx`, `archivos-sitio.test.ts`, `cabecera-pagina.test.ts`; A `validar-entorno.spec.ts`, `proteccion-demo.service.spec.ts`, `restablecimiento-demo.spec.ts`, `base-demo.spec.ts`; build sin el modo: "Muestra2026" no aparece en `dist/` | ✅ |
| RF-16 | Recuadro "Cuentas de prueba" debajo de T-3, con las tres cuentas en orden y los textos del anexo B | W `CuentasDemo.test.tsx`, `PaginaIngreso.demo.test.tsx`, `cuentas-demo.test.ts` | ✅ |
| RF-17 | "Usar esta cuenta" reemplaza lo escrito, borra el aviso, deja el foco en "Ingresar" y no ingresa solo | W `PaginaIngreso.demo.test.tsx` | ✅ |
| RF-18 | Las cuentas del recuadro son las que protege la api, están en el SQL con su rol, activas y sin cambio pendiente, y su contraseña es la del hash | W `cuentas-demo.test.ts`; A `cuentas-demo.spec.ts` (bcrypt); E `restablecimiento-demo.e2e-spec.ts` (ingresan) | ✅ |
| RF-19 | Con el modo demo, 403 con el mensaje del anexo B y sin cambios al editar, desactivar, reactivar, restablecer, liberar el email, transferir la principal (desde o hacia una cuenta de prueba) y cambiar la contraseña propia; las demás cuentas, como siempre | E `proteccion-demo.e2e-spec.ts` (15 casos); A `proteccion-demo.service.spec.ts`, `autenticacion.service.spec.ts` | ✅ |
| RF-20 | Vacía las tablas de datos, carga el SQL y no toca estructura ni migraciones; si algo falla, la base queda como estaba | E `restablecimiento-demo.e2e-spec.ts`; A `restablecimiento-demo.spec.ts`, `script-datos-de-muestra.spec.ts` | ✅ |
| RF-21 | Se niega con el modo apagado, en una base de tests o sin la marca de la demo; solo por consola; la base de tests nunca se marca | A `restablecimiento-demo.spec.ts`, `base-demo.spec.ts`; E `migracion-base-demo.e2e-spec.ts`, `restablecimiento-demo.e2e-spec.ts` (`base_demo` sigue vacía); comandos probados a mano: se niegan sin conectarse | ✅ |
| RF-22 | Fechas corridas los días que separan el 24/10/2026 del día del restablecimiento en Argentina, también en cambios de mes y de año; la fecha de los fallos no se corre | A `fechas-demo.spec.ts`; E `restablecimiento-demo.e2e-spec.ts` | ✅ |
| RF-23 | Las sesiones se cierran y las cuentas de prueba ingresan sin cambio pendiente | E `restablecimiento-demo.e2e-spec.ts` | ✅ |
| RF-24 | Una vez por día a las 4:00 de Argentina, con una tarea programada del servidor; el README lo explica | README, sección "Tarea programada en el VPS"; verificado en la demo publicada: el cron del VPS (`0 7 * * *` en UTC) corrió solo el 08/11/2026 a las 4:00 de Argentina y restableció los datos | ✅ |
| RF-25 | Con el modo demo: `noindex` en todas las páginas, conservando la vista previa; `robots.txt` con `Disallow: /`; sin `sitemap.xml`. Apagado, como la spec 007 | W `cabecera-pagina.test.ts`, `archivos-sitio.test.ts`; builds con y sin `VITE_MODO_DEMO` revisados | ✅ |

## Requisitos no funcionales

| RNF | Verificación | Resultado |
|---|---|---|
| Seguridad: la protección la aplica el servidor | E `proteccion-demo.e2e-spec.ts` hace los pedidos directamente a la api | ✅ |
| Seguridad: el restablecimiento solo por consola y solo en la base marcada | No hay ninguna dirección nueva en la api; A `restablecimiento-demo.spec.ts`, `base-demo.spec.ts` | ✅ |
| Seguridad: los tests no tocan producción, la demo ni los `.env` | Los e2e siguen exigiendo una base con "test"; los comandos leen solo `.env`, nunca `.env.test` | ✅ |
| Seguridad: sin el modo demo, el código publicado no muestra las credenciales | Build sin el modo: "Muestra2026" no aparece en `dist/` | ✅ |
| Rendimiento: restablecimiento en menos de un minuto | El `beforeAll` del e2e, que restablece contra la base remota de tests, termina dentro de su límite | ✅ (en el servidor: al publicar) |
| Accesibilidad del recuadro | Botones con el rol y el nombre para el lector de pantalla; un solo título principal | W `CuentasDemo.test.tsx`, `PaginaIngreso.demo.test.tsx` (360 × 640: demo manual) |
| Persistencia: nada en el navegador | W `PaginaIngreso.demo.test.tsx` | ✅ |
| Stack: sin dependencias nuevas | `package.json` de web y api sin dependencias nuevas; los PNG se generaron con Chrome, una sola vez | ✅ |
| Idioma | Textos y mensajes en español | ✅ |

## Criterios de finalización

- [x] Todos los RF con al menos un test en verde, salvo RF-24 (tarea programada, verificada en la demo publicada el 08/11/2026) y lo que solo se puede ver.
- [x] `pnpm test` y `pnpm lint` sin errores.
- [x] Búsqueda en todo el proyecto, salvo las specs 001 a 008, de "Pertusatti", "Sabalette", "persaestudio", los dos WhatsApp, el email, la dirección y los colores del estudio original:
  - No queda nada en el código, las imágenes, los datos de muestra ni los tests.
  - Las únicas menciones están en la documentación de esta spec, que nombra al estudio original como contexto.
  - "Concordia" sigue en `api/src/causas/validadores/texto-causa.spec.ts` como ciudad de un juzgado de ejemplo, no como dato del estudio. Se acepta.
- [x] README actualizado: nombre del proyecto, spec 009 en la hoja de ruta, "Cambiar de marca", "Modo demo" y la tarea programada del VPS. El nombre del proyecto también está actualizado en AGENTS.md y en la constitución.
- [ ] Demo manual (ver la guía siguiente).

## Cambios a los documentos durante la implementación

- **Plan, D10 (T6):** `vite.config.ts` se verifica con `module: nodenext`, por eso:
  - `brandHeadTags`, `fontFaceRules` y `titleFontStack` van en `servicios/marca-construccion.ts`;
  - `escapeHtml` pasó a `servicios/escapar-html.ts`.
- **Spec, RF-22 (T19):** la fecha de referencia (24/10/2026) es la más reciente de los datos de muestra (el último ingreso de una cuenta), no "la del movimiento más reciente", que es el 20/10/2026. El valor era el correcto; se corrigió la frase en la spec, el plan y las tareas.
- **Tareas, T13:** el ingreso en modo demo se prueba con `vi.mock` del módulo `modo-demo` en `PaginaIngreso.demo.test.tsx`, en lugar de una prop `modoDemo`. Así se prueba la pantalla tal como la monta la aplicación.
- **Tareas, T21:** la lógica de la marca de la base va en `api/src/demo/base-demo.ts` y la carga del entorno de los comandos en `entorno-consola.ts`, los dos con sus tests.

## Observaciones

- **T10:** el "Hecho cuando" pedía que todo pasara sin modificar ningún test, y no se cumplió del todo. Al cargar la marca de ejemplo, cinco tests necesitaron ajustes:
  - cuatro todavía dependían de la forma de la marca anterior (dos WhatsApp, ocho páginas públicas, el `summary` del menú de WhatsApp y un color de ejemplo que resultó ser el de la marca nueva);
  - el quinto tenía escrita la ruta vieja del logo de Bourder Web.

  Después de corregirlos, la prueba con una tercera marca pasó sin tocar ningún test (RF-14).
- **Fuera de las tareas:** `api/test/partes-cliente-alta.e2e-spec.ts` esperaba un 400 cuando se rechaza la única parte del alta, en contra de la spec 002 (RF-7). Venía así del proyecto original. Se corrigió el test con autorización del usuario; el código no cambió.
- **Fuera de las tareas:** `opciones-base-de-datos.spec.ts` suma `MODO_DEMO: false` (T15), y el `package.json` de la raíz se llama `estudio-juridico-sdd` (T22, con autorización del usuario).
- **Intermitencia de los e2e:** los e2e cuyo `beforeAll` no tiene un límite propio usan el de vitest, de 10 segundos. En dos corridas anteriores, contra la base remota, alguno lo superó:
  - Cuando eso pasa, el archivo siguiente choca con la migración que quedó corriendo ("Table 'base_demo' already exists").
  - Corridos solos, esos archivos pasan, y en la corrida de cierre no ocurrió.
  - Por decisión del usuario no se cambiaron los tiempos de espera. Una línea `hookTimeout: 60_000` en `api/vitest.config.e2e.ts` lo resolvería.
- **Intermitencia en la web:** `PanelJurisprudencia.test.tsx` falla de vez en cuando con la máquina muy cargada y pasa al correrlo solo. Ya era así antes de esta spec.
- **Prettier:** `web/src/componentes/ContactoSitio.tsx` tiene diferencias de formato desde antes de esta spec, y ninguna tarea lo tocó.
- **Fines de línea:** con `core.autocrlf=true`, los archivos existentes tienen CRLF en Windows, y Prettier se verifica con `--end-of-line auto`. Los archivos formateados en esta spec quedaron con LF; git guarda LF en los dos casos.
- **`.env` de desarrollo:** el de la api no tiene `JWT_SECRET`, según avisaron los comandos al validar el entorno. No se tocó.
- **Captura a 360 px:** Chrome sin ventana no baja de unos 500 px de ancho, así que el celular queda para la demo manual.
- **Maqueta del portal:** en las capturas sin ventana no apareció la maqueta de la sección "Portal de clientes" del inicio, que se anima al entrar en la pantalla. No es de esta spec; conviene mirarla en la demo manual.
- **"Lucero | Ibarra:+54…":** en el bloque de contacto del sitio, en la captura, el nombre y el número del WhatsApp se ven pegados, sin espacio después de los dos puntos. Viene del diseño del bloque, no de esta spec; conviene mirarlo en la demo manual.

## Veredicto

**La spec 009 está cumplida en todo lo que se puede verificar antes de publicar.**
- Los 25 RF tienen sus tests en verde, salvo RF-24, la tarea programada, que se verificó en la demo publicada (08/11/2026).
- `pnpm test` y `pnpm lint` pasan sin errores.
- No queda en el código ningún dato del estudio original.

Queda pendiente la demo manual.

## Publicación (hecha)

1. ✅ Base de la demo creada en Easypanel, migraciones aplicadas a mano (`npx typeorm migration:run -d dist/base-de-datos/data-source.js`) y `MODO_DEMO=true` en el servicio de la api, tomado al volver a desplegar. Web construida con `VITE_MODO_DEMO=true`, `VITE_API_URL` y `VITE_URL_SITIO` en `web/.env.production`.
2. ✅ `node dist/demo/marcar-base-demo.js` y `node dist/demo/restablecer-demo.js` desde la consola del servicio: "Datos de muestra restablecidos. Fechas corridas 12 días." (06/11/2026).
3. ✅ Easypanel no programa tareas: el restablecimiento diario lo corre el cron del VPS con `docker exec` sobre el contenedor de la api. El VPS está en UTC, así que la expresión es `0 7 * * *`. El 08/11/2026 corrió solo a las 7:00 UTC (4:00 de Argentina) y el log muestra "Datos de muestra restablecidos".

## Guía de la demo manual

### Preparación
1. Una base de desarrollo con las migraciones aplicadas, y `MODO_DEMO=true` en `api/.env` (no se versiona).
2. `pnpm --filter api demo:marcar` y `pnpm --filter api demo:restablecer`.
3. `VITE_MODO_DEMO=true` para la web y `pnpm dev`.

### Pasos
1. Con el modo demo apagado, recorrer el sitio, el ingreso, el portal y el panel:
   - el nombre en dos líneas, el monograma "LI", el gris pizarra y el azul acero, y Cormorant Garamond en los títulos;
   - las tres integrantes con sus iniciales, "Dra." y "Dr.";
   - el WhatsApp y el email de Bourder Web;
   - el ingreso sin cuentas de prueba.
2. Con el modo encendido, en el ingreso, elegir "Usar esta cuenta" en cada cuenta e ingresar.
3. Como administradora de prueba, intentar cambiar la contraseña propia y desactivar al abogado de prueba, y ver el mensaje. Crear una cuenta nueva y desactivarla.
4. Correr el restablecimiento: la cuenta creada desaparece, la sesión se cierra y las fechas de los movimientos quedan al día.
5. Correr el restablecimiento con el modo demo apagado: no hace nada.
6. En el sitio construido con el modo encendido, verificar `noindex` en cada página, `robots.txt` y que no hay `sitemap.xml`.
7. Ver el sitio y el ingreso en un celular de 360 px: el encabezado en una línea, y el formulario sin desplazarse con el recuadro debajo.
