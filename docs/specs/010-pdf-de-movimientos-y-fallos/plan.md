# Plan 010 — PDF de movimientos y fallos

> **Cambio del 12/11/2026 (spec 010, RF-15 a RF-18, RF-33):** el PDF de un movimiento dejó de tener visibilidad propia. La migración `QuitarVisibilidadDelPdf1794441600000` quita `movimientos.pdfVisible`; los DTO ya no aceptan `pdfVisible` (se rechaza como campo desconocido); el resumen del historial informa `tienePdf` en lugar de `pdf: { visible }`; el historial de cambios registra el PDF como `{ codigo, tamano }`; y `findVisiblePdf` y `tienePdf` del portal solo exigen que el cliente pueda ver el movimiento y que este tenga PDF. Lo que este plan dice de `pdfVisible` describe el diseño anterior.

Implementa `spec.md` de esta carpeta. Respeta `docs/constitution.md` y se apoya en lo construido en las specs anteriores: guards globales y roles (001), bloqueos y transacciones de movimientos (003), regla de visibilidad para el cliente (003 y 004), aviso de fallo repetido con `confirmarRepetido` (005), modo demo y restablecimiento (009). Cada sección indica entre corchetes los RF que cubre.

No se agregan dependencias ni variables de entorno (ver "Dependencias nuevas").

## Decisiones principales

### D1. Los PDF van en una tabla propia, `pdfs` [RF-1, RF-2, RNF de rendimiento]
El contenido se guarda en una tabla aparte y no en una columna de `movimientos` o `fallos`. Así ningún listado ni consulta existente puede cargar el contenido por accidente: `movimientos` y `fallos` solo suman la referencia (`pdfId`) y, en los movimientos, la marca `pdfVisible`. Además, la columna `contenido` de la entidad lleva `select: false`, así que TypeORM no la trae ni siquiera al unir la tabla: solo la lee la descarga, pidiéndola expresamente.

*Alternativa descartada:* una columna `MEDIUMBLOB` en `movimientos` y en `fallos`. Las consultas actuales (`find`, `findOne` con relaciones, el historial y el portal) traen la entidad completa, y cada listado de 20 movimientos podría arrastrar hasta 100 MB.

### D2. El archivo viaja en el mismo pedido que el formulario [RF-10 a RF-12]
Cuando el formulario lleva un archivo, el pedido es `multipart/form-data` con dos partes: `datos` (el mismo JSON de hoy) y `pdf` (el archivo). Sin archivo, el pedido sigue siendo JSON, como hoy, también para quitar el PDF o cambiar su visibilidad. Como todo llega en un solo pedido, el service guarda todo o nada en una sola transacción, y una subida interrumpida no llega nunca al service.

*Alternativa descartada:* subir el archivo antes, por separado, y referenciarlo después desde el formulario. Exige guardar archivos "huérfanos" mientras el formulario no se guarda, y limpiarlos después.

### D3. La recepción usa el `FileInterceptor` de `@nestjs/platform-express`, en memoria [RF-2, RF-3, RF-4]
`@nestjs/platform-express`, que ya es dependencia de la api, trae multer y su `FileInterceptor`. Sin `dest` ni `storage`, multer guarda el archivo en memoria: nunca escribe en el disco del servidor (RF-2). Los límites de multer cortan la recepción: `fileSize: 5.242.880`, `files: 1`, `fields: 1` (solo `datos`) y `fieldSize: 64 KB`. No se limita la cantidad de partes: multer controla las partes antes que los archivos, y un segundo PDF respondería "Los datos del formulario no son válidos" en lugar de "Podés adjuntar un solo PDF" (corregido el 11/11/2026, en T8; decía también `parts: 2`). Un interceptor propio, `FormularioConPdfInterceptor`, envuelve al de Nest. Nest ya convierte los errores de multer en excepciones con su texto en inglés; el interceptor los reconoce comparándolos con las constantes `multerExceptions` del mismo paquete, que se pueden importar porque el paquete exporta sus archivos (`"./*.js"`). Además:
- Antes de leer el cuerpo, rechaza con 413 un pedido cuyo `Content-Length` supera 5.242.880 bytes más 65.536 de margen para `datos` y los separadores.
- Traduce los errores de multer a los mensajes de la spec.
- Reemplaza `request.body` por el JSON de `datos`, así el `ValidationPipe` global valida los mismos DTO de siempre (los interceptores corren antes que los pipes).

En un 413 la respuesta lleva `Connection: close`: el servidor contesta sin esperar el resto del archivo y cierra la conexión (RF-4).

*Alternativa descartada:* usar `multer` directamente. Con pnpm, la api solo puede importar sus dependencias declaradas, así que habría que agregar `multer` y `@types/multer` (principio 1).

### D4. "Ver PDF" abre una página de la aplicación, que pide el PDF y lo muestra [RF-28, RF-36, RF-37, RNF de seguridad]
"Ver PDF" es un enlace `target="_blank" rel="noopener noreferrer"` a una ruta de la web, por ejemplo `/portal/causas/3/movimientos/8/pdf`. Esa página corre dentro de `RutaProtegida`, pide el PDF con el cliente HTTP de siempre (que renueva la sesión si el token de acceso venció), arma un `Blob` de tipo `application/pdf` y reemplaza la pestaña por su dirección `blob:` con `location.replace`. El navegador lo muestra con su visor de PDF.

La api siempre entrega el PDF como descarga (`Content-Disposition: attachment`), nunca para mostrarlo. Así, si alguien abre la dirección de la api a mano, el archivo se descarga y nunca se interpreta como página en el dominio de la api, donde viaja la cookie de sesión. El tipo del `Blob` lo fija la web, no el archivo: aunque el archivo esconda una página web, el navegador lo trata como PDF (RNF de seguridad, caso límite del archivo que es PDF y además página).

*Alternativa descartada:* que "Ver PDF" abra directamente la dirección de la api. El token de acceso dura 15 minutos y se renueva con un `POST` aparte (plan 001), así que, pasado ese tiempo, la pestaña nueva recibiría un 401 en formato JSON en lugar de la pantalla de ingreso (RF-37). Además, mostrar el PDF desde el dominio de la api expone la sesión si el archivo esconde una página.

### D5. "Descargar PDF" no cambia de pantalla [RF-7, RF-28]
El botón pide el PDF con el cliente HTTP, toma el nombre de `Content-Disposition` (que CORS pasa a exponer) y lo guarda con un enlace `download` sobre un `Blob` temporal, que se libera enseguida.

### D6. El PDF se pide por su causa y su movimiento, o por su fallo [RF-29, RF-37]
No hay un identificador propio en ninguna dirección. Las tres direcciones de descarga cuelgan del recurso al que pertenecen. En los endpoints de PDF, todo caso sin permiso responde el mismo 404 "No existe ese PDF", sea cual fuere el motivo. Así un cliente no puede combinar un movimiento suyo con un PDF ajeno, ni distinguir por qué no lo obtiene.

## Arquitectura

### Módulos de NestJS (`api/src/`)

| Carpeta o archivo | Contenido | RF |
|---|---|---|
| `pdfs/` (nuevo) | Ver detalle debajo. | RF-1 a RF-9, RF-14, RF-41 |
| `migraciones/` | Migración `1794182400000-crear-pdfs`. | RF-1, RF-2, RF-6, RF-9, RF-17 |
| `movimientos/` | Carga y modificación con PDF, descarga del panel, historial con el campo `pdf`, visibilidad del PDF para el cliente. | RF-10 a RF-23, RF-29 a RF-31, RF-33 |
| `jurisprudencia/` | Carga y modificación con PDF, descarga del panel, leyenda del listado. | RF-24 a RF-27, RF-32 |
| `portal/` | Descarga del portal y `tienePdf` en los movimientos del cliente. | RF-33 a RF-35, RF-37 |
| `configurar-aplicacion.ts` | Expone `Content-Disposition` por CORS. | RF-7, D5 |
| `base-de-datos/esquema.ts` | Suma la entidad `Pdf` y la migración. | — |
| `app.module.ts` | Importa `PdfsModule`. | — |

Contenido de `pdfs/`:
- `pdf.entity.ts`: la entidad `Pdf`.
- `reglas-pdf.ts`: reglas puras, sin acceso a la base: validación del contenido, nombre del archivo, código, tipos sin tildes, tamaño máximo y mensajes.
- `pdfs.service.ts`: guardar un PDF nuevo (con el código y el tope de la demo), borrarlo y leer su contenido. Recibe el `EntityManager` de la transacción de quien lo llama.
- `formulario-con-pdf.interceptor.ts`: D3.
- `archivo-pdf.decorator.ts`: `@ArchivoPdf()`, el archivo recibido como `{ contenido: Buffer } | null`, con un tipo propio (sin `@types/multer`).
- `respuesta-pdf.ts`: `toPdfResponse(pdf, nombre)`, que arma el `StreamableFile` y sus encabezados (ver "Entrega del PDF").
- `pdfs.module.ts`: exporta `PdfsService`. Lo importan `MovimientosModule`, `JurisprudenciaModule` y `PortalModule`.

Los controllers solo validan con DTO, aplican el interceptor y delegan (principio 3). `respuesta-pdf.ts` solo arma la respuesta HTTP.

### Carpetas de `web/src/`

| Carpeta o archivo | Contenido | RF |
|---|---|---|
| `servicios/archivo-pdf.ts` (nuevo) | `validatePdfFile(file)`: vacío, tamaño y marca `%PDF-` en los primeros 1.024 bytes, con los mensajes de la api. `formatPdfSize(bytes)`. `isPdfFileError(mensaje)`. Constantes. | RF-3, RF-4, RF-9, RF-11 |
| `servicios/descarga-pdf.ts` (nuevo) | `saveFile(blob, nombre)` (enlace `download` y liberación del `Blob`) y `openPdfInPlace(blob)` (D4). Usan el DOM, no React, como `portapapeles.ts`. | RF-28 |
| `servicios/cliente-http.ts` | Suma `sendForm(method, path, formData)` y `getFile(path)`, con la misma renovación ante un 401 y el mismo aviso de actividad. | RF-10, RF-12, RF-28 |
| `servicios/movimientos.ts`, `jurisprudencia.ts` y `portal.ts` | Tipos nuevos (`PdfResumen`, `tienePdf`, campo `pdf` del historial). Carga y modificación con archivo. `getPdf(...)`. | RF-10, RF-28 a RF-35 |
| `servicios/formulario-movimiento.ts` y `formulario-fallo.ts` | Armado del pedido (JSON o `FormData`), estado del PDF en el formulario, avisos de RF-18, confirmaciones de RF-13 y RF-19. | RF-10, RF-13, RF-15, RF-16, RF-18, RF-19, RF-25 |
| `servicios/presentacion-movimientos.ts` | Etiqueta del campo `pdf` del historial y su valor. | RF-21 |
| `servicios/sesion.ts` | `canAccess` suma el aviso "No existe ese PDF" al llevar a un usuario desde una dirección de PDF de la otra sección. | RF-37 |
| `componentes/` | Nuevos: `CampoPdf.tsx` (elegir, quitar y visibilidad) y `AccionesPdf.tsx` ("Ver PDF" y "Descargar PDF"). Modificados: `FormularioMovimiento`, `FormularioFallo`, `FilaMovimiento`, `FilaFallo`, `HistorialCambios`, `TarjetaMovimientoPortal` y `RutaProtegida`. | RF-10 a RF-19, RF-28, RF-30, RF-32, RF-34 |
| `paginas/` | Nueva: `PaginaPdf` (D4), para las tres rutas de PDF. Modificadas: `PanelMovimientoDetalle`, `PanelFalloDetalle`, `PortalMovimientoDetalle`, `PanelInicio` y `PortalInicio` (muestran el aviso). | RF-19, RF-26, RF-31, RF-32, RF-34, RF-37 |
| `RutasAplicacion.tsx` | Tres rutas nuevas, dentro de `RutaProtegida` y fuera de `DisenoPanel` y `DisenoPortal`. | RF-28, RF-37 |

Nada en `src/servicios/` importa React (principio 3).

### Archivos existentes que se modifican
- api: `configurar-aplicacion.ts`, `app.module.ts`, `base-de-datos/esquema.ts`.
- api, movimientos: `movimiento.entity.ts`, `movimientos.controller.ts`, `movimientos.service.ts`, `movimientos.module.ts`, `movimiento-detalle.ts`, `reglas-movimientos.ts`, `visibilidad-cliente.service.ts`, `dto/crear-movimiento.dto.ts`, `dto/modificar-movimiento.dto.ts`, `dto/reglas-movimiento.ts`.
- api, jurisprudencia: `fallo.entity.ts`, `jurisprudencia.controller.ts`, `jurisprudencia.service.ts`, `jurisprudencia.module.ts`, `fallo-detalle.ts`, `dto/crear-fallo.dto.ts`, `dto/modificar-fallo.dto.ts`.
- api, portal: `portal.controller.ts`, `portal.service.ts`, `portal.module.ts`, `portal-detalle.ts`.
- api: `datos-de-muestra/datos-de-muestra.sql` y las utilidades de los e2e (`test/utilidades/`).
- web: los archivos de las tablas de arriba, con sus tests.
- `README.md`: sección "Modo demo" y requisito de `max_allowed_packet` (ver "Documentación").

Ninguna columna existente cambia. `movimientos` y `fallos` solo suman columnas nuevas.

## Entidades de TypeORM y migración [RF-1, RF-2, RF-6, RF-9, RF-17]

Mismas convenciones que en las specs anteriores: `DATETIME` en hora de Buenos Aires, tablas `utf8mb4_unicode_ci`, ids autoincrementales.

### `pdfs`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | int autoincremental | PK. Nunca sale de la api (D6). |
| `contenido` | mediumblob | Hasta 16 MB; el máximo es 5 MB (RF-3). `select: false` (D1). Se guarda tal como llegó (RF-5). |
| `tamano` | int | En bytes. RF-9 |
| `codigo` | char(6) | Único (`UQ_pdfs_codigo`). Letras mayúsculas sin tildes y números (RF-6). |
| `subidoPorId` | FK `usuarios` | RF-9, RF-40 |
| `subidoEn` | datetime(6) | RF-9. El restablecimiento de la demo lo corre como cualquier otra fecha (RF-43). |

Sin columna para el nombre original ni para el tipo informado por el navegador (RF-8).

### Columnas nuevas
- `movimientos.pdfId`: int, nullable, único (`UQ_movimientos_pdf`), FK `pdfs`.
- `movimientos.pdfVisible`: boolean, default `false`. Invariante: si `pdfId` es `NULL`, `pdfVisible` es `false` (RF-15).
- `fallos.pdfId`: int, nullable, único (`UQ_fallos_pdf`), FK `pdfs`.

Las FK son `ON DELETE NO ACTION`: el service primero desvincula el PDF y después lo borra, en la misma transacción (RF-14).

La migración `1794182400000-crear-pdfs` crea `pdfs` y agrega las tres columnas con sus índices y claves. Es reversible: `down` quita las columnas y después la tabla. `synchronize` sigue en `false`.

`movimiento_cambios` no cambia de estructura: su columna `cambios` es JSON y admite el campo nuevo `pdf` (ver "Historial").

## Contrato de la API

Errores con el formato de siempre (`statusCode`, `message`, en español). Ningún mensaje repite nada del archivo (RNF de registros).

### Formularios con archivo [RF-10, D2, D3]
Los `POST` y `PATCH` de movimientos y fallos aceptan dos formatos:
- `application/json`: como hoy.
- `multipart/form-data`: parte `datos` (el JSON del DTO) y parte `pdf` (el archivo). Cualquier otra parte, o `datos` ausente o con un JSON inválido, responde 400 "Los datos del formulario no son válidos".

Campos nuevos de los DTO (se pueden enviar en los dos formatos):

| DTO | Campo | Regla |
|---|---|---|
| `CreateMovimientoDto` | `pdfVisible?: boolean` | Solo con archivo; si no, 400 "El movimiento no tiene PDF" (RF-15, RF-16). |
| `UpdateMovimientoDto` | `pdfVisible?: boolean` | Con archivo: la visibilidad del nuevo; sin `pdfVisible`, el nuevo nace oculto (RF-16). Sin archivo: la del PDF guardado; si no hay, 409 "El movimiento no tiene PDF" (RF-15). |
| `UpdateMovimientoDto` | `quitarPdf?: true` | Quita el PDF (RF-14). Junto con un archivo: 400 "No se puede adjuntar y quitar el PDF a la vez". Sin PDF guardado, no cambia nada, como cualquier `PATCH` sin cambios (plan 003). |
| `UpdateFalloDto` | `quitarPdf?: true` | Igual que en el movimiento. |

### Mensajes del archivo [RF-3, RF-4]
| Caso | Código | Mensaje |
|---|---|---|
| No tiene `%PDF-` en los primeros 1.024 bytes | 400 | "El archivo debe ser un PDF" |
| 0 bytes | 400 | "El archivo está vacío" |
| Más de 5.242.880 bytes, por `Content-Length` o por el límite de multer | 413 | "El archivo no puede superar los 5 MB" |
| Más de un archivo | 400 | "Podés adjuntar un solo PDF" |
| Tope de la demo | 409 | "En la demo se pueden tener hasta 4 PDF. Quitá uno para subir otro" (RF-41) |

### Movimientos — `/api/panel/causas/:causaId/movimientos` (roles `admin` y `abogado`) [RF-38]
| Método y ruta | Cambio | RF |
|---|---|---|
| `POST /` | Acepta archivo y `pdfVisible`. | RF-10, RF-11, RF-16 |
| `PATCH /:movimientoId` | Acepta archivo, `pdfVisible` y `quitarPdf`. Un movimiento anulado o una causa desactivada responden 409 como hoy, aunque solo cambie el PDF (RF-22, RF-23). | RF-10, RF-13 a RF-17, RF-20 a RF-23 |
| `GET /:movimientoId/pdf` (nuevo) | 200 con el PDF (ver "Entrega del PDF"). Causa o movimiento inexistentes, movimiento de otra causa o sin PDF: 404 "No existe ese PDF". Funciona también con el movimiento anulado y la causa desactivada (RF-22, RF-23). | RF-28, RF-29, RF-37 |

Tipos:
- `MovimientoResumen` suma `pdf: { visible: boolean } | null` (RF-30).
- `MovimientoDetalle` suma `pdf: PdfDetalle | null`, con `PdfDetalle = { codigo, tamano, visible, subidoPor: AutorResumen, subidoEn }` (RF-31, RF-40).
- `CambioMovimiento.cambios[].campo` suma `pdf`, con valores `{ codigo, tamano, visible } | null` (RF-21).

### Jurisprudencia — `/api/panel/jurisprudencia` (roles `admin` y `abogado`) [RF-38]
| Método y ruta | Cambio | RF |
|---|---|---|
| `POST /` | Acepta archivo. Con la pregunta de repetido (409, plan 005) no se guarda nada; la web reenvía el mismo archivo con `confirmarRepetido`. | RF-24, RF-25 |
| `PATCH /:id` | Acepta archivo y `quitarPdf`. Fallo desactivado: 409 como hoy (RF-26). | RF-24 a RF-26 |
| `GET /:id/pdf` (nuevo) | 200 con el PDF. Fallo inexistente o sin PDF: 404 "No existe ese PDF". Funciona también con el fallo desactivado. | RF-26, RF-28, RF-37 |

`FalloResumen` suma `tienePdf: boolean` (RF-32). `FalloDetalle` suma `pdf: { codigo, tamano, subidoPor, subidoEn } | null`. El aviso de repetido no mira el PDF (RF-25).

### Portal — `/api/portal/causas` (rol `cliente`) [RF-33 a RF-35, RF-37]
| Método y ruta | Cambio |
|---|---|
| `GET /:causaId/movimientos` y `GET /:causaId/movimientos/:movimientoId` | Cada `MovimientoCliente` suma `tienePdf: boolean`, `true` solo si el cliente puede ver el PDF (RF-33). Nada más: ni tamaño, ni código, ni autor, ni fechas (RF-35). |
| `GET /:causaId/movimientos/:movimientoId/pdf` (nuevo) | 200 con el PDF si se cumple RF-33. Si no, por cualquier motivo (causa ajena, inexistente o desactivada, movimiento oculto, anulado, inexistente o de otra causa, sin PDF o con el PDF oculto, id mal formado): 404 "No existe ese PDF", siempre igual (RF-37). |

### Entrega del PDF [RNF de seguridad, RNF de copias en el camino, RF-7, RF-36]
`toPdfResponse` responde con el contenido tal como se guardó (RF-5) y estos encabezados:
- `Content-Type: application/pdf` y `X-Content-Type-Options: nosniff`: el navegador no adivina otro tipo.
- `Content-Disposition: attachment; filename="<nombre de RF-7>"`. El nombre es ASCII por construcción (fecha, tipo sin tildes, letras, números y espacios), así que no hace falta codificarlo.
- `Cache-Control: no-store, private`: ni el navegador ni un intermediario guardan copia. Reemplaza al `no-store` global.
- `Content-Security-Policy: default-src 'none'; sandbox` y `Cross-Origin-Resource-Policy: same-site`, como defensa adicional si la respuesta se abriera a mano.

`configurar-aplicacion.ts` suma `exposedHeaders: ['Content-Disposition']` a CORS, para que la web lea el nombre (D5).

## Reglas de negocio

### Reglas puras (`pdfs/reglas-pdf.ts`)
- `MAX_PDF_BYTES = 5_242_880`, `PDF_FORM_MARGIN_BYTES = 65_536`, `PDF_MARKER_WINDOW = 1024`, `DEMO_PDF_LIMIT = 4`.
- `validatePdfContent(buffer)`: vacío, tamaño, y `buffer.subarray(0, 1024).includes('%PDF-')`, en ese orden. Devuelve el mensaje o `null` [RF-3, RF-4].
- `generateCode(randomInt)`: 6 caracteres de `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`, con `crypto.randomInt` [RF-6].
- `TYPE_NAMES_WITHOUT_ACCENTS`: `escrito_presentado` → "Escrito presentado", `resolucion` → "Resolucion", `notificacion` → "Notificacion", y así cada tipo [RF-7].
- `movementPdfName({ fecha, tipo }, codigo)` → `"2026-10-24 Resolucion K7Q2MX.pdf"`; `rulingPdfName({ fecha }, codigo)` → `"Fallo 2019-05-12 P4N8RC.pdf"` [RF-7].

### `PdfsService`
- `create(manager, contenido, actor)`:
  1. Si el modo demo está encendido (`MODO_DEMO`), bloquea la tabla con `SELECT id FROM pdfs FOR UPDATE`. En REPEATABLE READ, esa lectura bloquea también el hueco final del índice, así que una segunda subida simultánea espera a que termine la primera. Si ya hay 4, lanza 409 [RF-41].
  2. Inserta con un código nuevo. Si choca con `UQ_pdfs_codigo` (`ER_DUP_ENTRY`), genera otro, hasta 5 intentos [RF-6].
- `remove(manager, pdfId)`: `DELETE` del registro [RF-14].
- `findContent(pdfId)`: la única consulta que pide `contenido` (`addSelect`) [D1].

### Carga y modificación de un movimiento, en pseudocódigo [RF-10 a RF-23]
```
create(actor, causaId, dto, archivo):
  si dto.pdfVisible está y no hay archivo → 400 "El movimiento no tiene PDF"
  si hay archivo → validatePdfContent; si falla → 400 (antes de abrir la transacción)
  withActiveCausa(causaId):                       # bloqueo compartido de la causa (plan 003)
    pdf = archivo ? pdfs.create(manager, archivo, actor) : null
    guardar movimiento con pdfId = pdf?.id, pdfVisible = pdf ? (dto.pdfVisible ?? false) : false
    cambio de carga con todos los datos, incluido pdf = pdf ? {codigo, tamano, visible} : null

update(actor, causaId, movimientoId, dto, archivo):
  si archivo y dto.quitarPdf → 400
  si hay archivo → validatePdfContent; si falla → 400
  withMovement(causaId, movimientoId):            # bloqueo exclusivo del movimiento (plan 003)
    si anulado → 409 (RF-22)
    anterior = movimiento.pdfId
    si archivo:
      pdfs.remove(anterior) después de desvincularlo (si había)  # así un reemplazo no suma en la demo
      nuevo = pdfs.create(...); pdfVisible = dto.pdfVisible ?? false
    si no, si dto.quitarPdf y anterior: pdfId = null; pdfVisible = false; pdfs.remove(anterior)
    si no, si dto.pdfVisible está: si no hay PDF → 409 "El movimiento no tiene PDF"; si no, pdfVisible = dto.pdfVisible
    despues = datos con pdf = {codigo, tamano, visible} | null
    cambios = diffMovement(antes, despues)        # compara pdf por su valor
    si no hay cambios → no guarda nada
    guardar movimiento, modificadoPor/En y el cambio
```
Todo ocurre en una sola transacción: un error en cualquier paso deshace también el PDF nuevo y el borrado del anterior [RF-10, RF-11]. Si una anulación queda primero, `withMovement` la ve y la modificación responde 409 sin guardar nada (caso límite de concurrencia).

### Historial [RF-20, RF-21]
`MovementData` (`reglas-movimientos.ts`) suma `pdf: { codigo, tamano, visible } | null`. `diffMovement` lo compara por valor (los tres datos), así un reemplazo se registra por el cambio de código, y un cambio de visibilidad del PDF, por su `visible`. Los cambios de carga anteriores a esta spec no tienen el campo `pdf`, y la web los muestra como siempre.

### Fallos [RF-24 a RF-27]
`create` y `update` de `jurisprudencia.service.ts` siguen el mismo esquema, sin visibilidad. El control de repetido corre antes de guardar el PDF, dentro de la misma transacción: si responde la pregunta, la transacción se deshace y no queda nada [RF-25]. Adjuntar, reemplazar o quitar actualiza `modificadoPor/En` [RF-24].

### Cliente [RF-33 a RF-35]
- `ClientVisibilityService` suma `findVisiblePdf(clienteId, causaId, movimientoId)`: reutiliza `canSeeCausa` y la condición `visible = 1 AND anulado = 0`, exige `pdfVisible = 1` y `pdfId` no nulo, y lee el contenido. Ante cualquier falla devuelve `null`, y el controller responde el único 404 [RF-37].
- `toMovimientoCliente` suma `tienePdf = pdfId !== null && pdfVisible`.

### Registros del servidor [RF-8, RNF de registros]
- El interceptor nunca escribe ni repite `originalname`, `mimetype` ni el contenido: solo pasa `buffer` al decorador.
- El filtro global (`errores-sin-datos.filter.ts`) ya registra solo método, patrón de ruta y clase del error. Sin cambios.

## Frontend

### Rutas
| Ruta | Página | Quién |
|---|---|---|
| `/panel/causas/:id/movimientos/:movimientoId/pdf` | `PaginaPdf` | admin, abogado |
| `/panel/jurisprudencia/:id/pdf` | `PaginaPdf` | admin, abogado |
| `/portal/causas/:id/movimientos/:movimientoId/pdf` | `PaginaPdf` | cliente |

Las tres están dentro de `RutaProtegida` [RF-37]:
- Sin sesión, `canAccess` lleva a `/ingresar`, y después de ingresar `resolveLandingRoute` lleva al inicio de la sección: nunca vuelve al PDF.
- Con cambio de contraseña pendiente, lleva al cambio (spec 001, RF-11).
- Con sesión de la otra sección (un cliente en una ruta de PDF del panel, o al revés), `canAccess` devuelve `{ redirectTo, notice: 'No existe ese PDF' }` y `RutaProtegida` lo pasa en el `state` de la navegación. `PanelInicio` y `PortalInicio` muestran el aviso.

### `PaginaPdf` [RF-28, RF-37, D4]
1. Muestra "Abriendo el PDF…".
2. Pide el PDF con el servicio de su sección.
3. Si llega, `openPdfInPlace(blob)` reemplaza la pestaña por el PDF.
4. Ante un 404 o un 403, navega al inicio de su sección con el aviso "No existe ese PDF".
5. Ante un 401 sin renovación posible, el cliente HTTP avisa que la sesión se cerró y `RutaProtegida` lleva a `/ingresar`.

### Comportamiento de la interfaz
- **`CampoPdf`** [RF-10 a RF-16]: muestra el PDF guardado (tamaño, quién lo subió y cuándo) o "Sin PDF", y permite "Elegir PDF" (un `input type="file" accept="application/pdf"`, sin `multiple`) y "Quitar PDF". Al elegir un archivo, `validatePdfFile` lo revisa antes de enviarlo: si falla, muestra el mensaje y lo descarta. La casilla "Visible para el cliente" (solo en movimientos) aparece solo con un PDF guardado y no quitado, o con un archivo elegido válido. Al elegir un archivo que reemplaza a otro, la casilla vuelve a quedar desmarcada.
- **Guardar** [RF-12, RF-13]: si se reemplaza o se quita un PDF guardado, primero la confirmación (`PreguntaConfirmacion`, que ya existe) con el mensaje de RF-13. Mientras se envía, el botón queda deshabilitado y se lee "Guardando…" (`role="status"`). Ante un error de red con un archivo en el pedido: "No se pudo guardar. Probá de nuevo", y el formulario conserva todo.
- **Después de un rechazo** [RF-11]: si algún mensaje es de archivo (`isPdfFileError`), se descarta el archivo elegido; si no, se conserva junto con lo escrito.
- **Avisos** [RF-18]: `pdfVisibilityNotice(antes, despues)` en `formulario-movimiento.ts` elige el aviso de RF-18. Se muestra después del de la spec 003 (RF-13) si corresponden los dos. `needsVisibleChangeWarning` (plan 003) no cuenta los cambios del PDF.
- **Restaurar** [RF-19]: en `PanelMovimientoDetalle`, si el movimiento es visible y su PDF también, "Restaurar" pide confirmación con el aviso de RF-19.
- **Listados** [RF-30, RF-32, RF-34]: `FilaMovimiento` muestra "PDF" y "visible para el cliente" u "oculto para el cliente". `FilaFallo` y `TarjetaMovimientoPortal` muestran "PDF".
- **`AccionesPdf`** [RF-28]: el enlace "Ver PDF" (`target="_blank" rel="noopener noreferrer"`) y el botón "Descargar PDF". Sus nombres accesibles llevan el dato que los identifica: "Ver el PDF del movimiento del 24/10/2026 (se abre en una pestaña nueva)", "Descargar el PDF del fallo del 12/05/2019". En el portal nunca se muestra el tamaño (RF-35).
- **Fallo repetido** [RF-25]: `PreguntaFalloRepetido` reenvía el mismo `FormData`, con el mismo `File`, más `confirmarRepetido`.
- **Persistencia** [RNF]: el `File` vive solo en el estado del formulario. Nada se escribe en `localStorage` ni en `sessionStorage`.

## Modo demo [RF-41 a RF-43]
- El tope es parte de `PdfsService.create` (ver arriba) y solo corre con `MODO_DEMO=true`.
- `datos-de-muestra.sql` suma dos `INSERT INTO pdfs`, con el contenido como literal hexadecimal (`X'…'`) y los códigos fijos `MUES01` y `MUES02`, y dos `UPDATE`: uno pone el primer PDF, visible, en un movimiento visible de una causa de la cliente de prueba; el otro pone el segundo en un fallo. Son PDF de una página, armados a mano, que dicen "Documento de muestra de la demo. Datos ficticios.", de menos de 2 KB cada uno.
- El restablecimiento no cambia: vacía todas las tablas salvo las de control, así que borra también `pdfs`, y corre todas las columnas de fecha, incluida `pdfs.subidoEn` [RF-43].
- Con a lo sumo 4 PDF de 5 MB, el restablecimiento borra a lo sumo 20 MB y sigue en menos de un minuto.

## Dependencias nuevas
Ninguna.
- La recepción del archivo usa el `FileInterceptor` de `@nestjs/platform-express` (D3).
- El código aleatorio usa `node:crypto`.
- La web usa `File`, `Blob`, `FormData` y `URL.createObjectURL` del navegador.

## Otras decisiones técnicas
- **`mediumblob` y no `longblob`:** alcanza para 16 MB, tres veces el máximo. *Descartada:* `longblob`, que no aporta nada con un máximo de 5 MB.
- **Contenido con `select: false` además de la tabla aparte:** doble barrera para que ninguna consulta futura arrastre el contenido (D1). *Descartada:* confiar solo en la tabla aparte, porque una relación cargada con `relations` traería el contenido.
- **El tope de la demo con `SELECT … FOR UPDATE` sobre `pdfs`:** no necesita tablas ni columnas nuevas, y funciona aunque la base no esté marcada como de la demo. *Descartada:* `GET_LOCK`, que no se libera con la transacción y queda atado a la conexión.
- **El código como `UNIQUE` con reintentos:** con 36⁶ (unos 2.200 millones) combinaciones, un choque es muy improbable, pero el índice lo garantiza. *Descartada:* derivar el código del id, porque revelaría cuántos PDF hay.
- **Visibilidad del PDF como columna de `movimientos` y no de `pdfs`:** la visibilidad es una decisión sobre el movimiento, y así la regla del cliente filtra en la misma fila (RF-33). *Descartada:* guardarla en `pdfs`, que obligaría a unir las tablas en cada consulta del portal.
- **Un solo 404 en los endpoints de PDF:** responde igual en todos los casos de RF-37, sin distinguir entre causa, movimiento o PDF. Los endpoints existentes del portal no cambian sus mensajes (spec 004, RF-28 y RF-29).

## Estrategia de tests

### api — unitarios (Vitest)
- `reglas-pdf.ts` [RF-3 a RF-7]: vacío, 5.242.880 y 5.242.881 bytes, marca en el byte 0, en el 1.019 (última posición posible dentro de 1.024) y en el 1.025; `generateCode` con un `randomInt` simulado; nombres con cada tipo, sin tildes.
- `FormularioConPdfInterceptor` [RF-2, RF-4, RF-8, D3]: las opciones de multer no tienen `dest` ni `storage`, y tienen los límites; el `Content-Length` excesivo responde 413 sin leer el cuerpo y con `Connection: close`; cada error de multer se traduce a su mensaje; `datos` ausente o mal formado; el decorador expone solo el `buffer`.
- `respuesta-pdf.ts` [RNF de seguridad, RF-36]: cada encabezado.
- `diffMovement` con el campo `pdf` [RF-21]: alta, reemplazo con el mismo tamaño, quitado y cambio de visibilidad.
- `toMovimientoCliente` y `toMovimientoDetalle` [RF-31, RF-35]: el cliente solo recibe `tienePdf`.
- Entidad `Pdf`: `contenido` con `select: false`.

### api — e2e (Vitest + Supertest, base de tests)
Utilidad nueva `test/utilidades/pdfs-de-prueba.ts`: PDF mínimo válido, PDF con bytes antes de la marca, archivo sin marca, buffer de N bytes y un PDF firmado digitalmente (`test/archivos/firmado.pdf`, ver Riesgos).
- **Formato** [RF-3, RF-4, RF-11]: cada rechazo de la tabla de mensajes, y que después de cada uno no hay filas nuevas en `pdfs` ni en `movimientos`. Dos archivos. Un JPG renombrado.
- **Corte por tamaño** [RF-4]: un `Content-Length` de 6 MB responde 413 antes de enviar el cuerpo.
- **Identidad** [RF-5, RF-7]: lo que se descarga es idéntico a lo subido, también el firmado; `Content-Disposition` con el nombre esperado; el código es nuevo en cada reemplazo.
- **Todo o nada** [RF-10 a RF-12]: un PDF válido con una descripción con `<` no guarda nada; un pedido cortado a mitad del cuerpo (socket destruido) no guarda nada.
- **Sesión** [RF-12]: una subida que empieza con la sesión a punto de vencer termina bien (el guard extiende la sesión al empezar y el handler no la vuelve a mirar).
- **Movimientos** [RF-14 a RF-17, RF-20 a RF-23]: nace oculto, también al reemplazar uno visible; reemplazar y quitar borran la fila de `pdfs`; `pdfVisible` sin PDF responde 400 o 409; anulado y causa desactivada responden 409, pero la descarga funciona; cada cambio queda en `movimiento_cambios` con `{ codigo, tamano, visible }`, sin el contenido; `modificadoPor/En` cambia y la causa no.
- **Fallos** [RF-24 a RF-27]: carga y modificación con PDF; la pregunta de repetido no deja nada guardado y, al confirmar, se guarda con el archivo; dos fallos con el mismo PDF no disparan la pregunta; fallo desactivado responde 409, pero la descarga funciona.
- **Portal** [RF-33 a RF-35, RF-37]: la regla de RF-33 con PDF oculto, movimiento oculto, anulado, restaurado, cliente desvinculado, causa desactivada y reactivada; cada caso sin permiso responde exactamente el mismo cuerpo y el mismo código; ninguna respuesta del portal tiene tamaño, código, autor ni fechas del PDF, ni indicio de un PDF oculto.
- **Acceso** [RF-38]: cliente en los endpoints del panel (403), visitante en todos (401), integrante con cambio pendiente (403).
- **Encabezados** [RF-36, RNF]: los de "Entrega del PDF" en los tres endpoints, y `Access-Control-Expose-Headers: Content-Disposition`.
- **Registros** [RF-8, RNF]: subir un archivo con nombre `escrito <final> {v2}.pdf`, con éxito y con error, y verificar que el nombre, el tipo informado y el contenido no aparecen en los registros (espía sobre `Logger`, como en el plan 003) ni en la base.
- **Demo** [RF-41, RF-43]: con `MODO_DEMO=true`, el quinto PDF responde 409; un reemplazo con 4 se permite; dos subidas simultáneas con 3 dejan 4; con el modo demo apagado no hay tope. El restablecimiento borra los PDF de los visitantes, deja los dos de muestra con `subidoEn` corrido y, si falla, deja la base como estaba.
- **Datos de muestra** [RF-42]: los dos PDF del SQL empiezan con `%PDF-`, uno está en un movimiento visible de una causa de la cliente de prueba y es visible, y el otro está en un fallo.
- **Rendimiento** [RNF]: el historial de 5.000 movimientos (plan 003) y el listado de fallos (plan 005), ahora con PDF en parte de las filas, siguen por debajo de 2 segundos; un registro de consultas de TypeORM, solo en el test, verifica que ningún listado menciona `contenido`. Cinco descargas simultáneas de 5 MB empiezan a llegar en menos de 2 segundos, y guardar un formulario con 5 MB tarda menos de 3 una vez recibido.
- **Migración**: `up` sobre la base con las migraciones anteriores y `down` sin errores.

### web — Vitest
- `archivo-pdf.ts` [RF-3, RF-4, RF-9, RF-11]: `validatePdfFile` con `File` simulados (vacío, grande, sin marca, con marca después de bytes); `formatPdfSize` con 300 bytes ("1 KB"), 850.000, 1.048.000 ("1023 KB"), 1.048.500 ("1 MB") y 5.242.880 ("5 MB"); `isPdfFileError`.
- `cliente-http.ts` [RF-10, RF-28]: `sendForm` no fija `Content-Type`, renueva ante un 401 y reenvía el mismo `FormData`; `getFile` devuelve el `Blob` y el nombre de `Content-Disposition`.
- `formulario-movimiento.ts` y `formulario-fallo.ts` [RF-13, RF-15, RF-16, RF-18, RF-19]: JSON sin archivo y `FormData` con archivo; cada combinación de avisos y su orden; confirmaciones de reemplazo, quitado y restauración.
- `sesion.ts` [RF-37]: `canAccess` en las tres rutas de PDF, para cada rol, sin sesión y con cambio pendiente.
- `CampoPdf` [RF-11, RF-15, RF-16]: la casilla solo aparece con PDF; vuelve a quedar desmarcada al elegir otro archivo; un archivo inválido se descarta con su mensaje.
- `FormularioMovimiento` y `FormularioFallo` [RF-11 a RF-13, RF-25]: "Guardando…" y botón deshabilitado; un error de red conserva todo; un rechazo de archivo lo descarta y otro rechazo lo conserva; la confirmación sin aceptar no envía nada; el reenvío por repetido lleva el mismo archivo.
- `PanelMovimientoDetalle`, `PanelFalloDetalle` y `PortalMovimientoDetalle` [RF-19, RF-31, RF-32, RF-34, RF-35]: datos del PDF en el panel; ninguno de ellos ni el tamaño en el portal; confirmación al restaurar.
- `AccionesPdf` [RF-28]: `target="_blank"`, `rel="noopener noreferrer"` y los nombres accesibles.
- `PaginaPdf` [RF-37]: con el servicio simulado, abre el PDF; ante un 404 lleva al inicio con el aviso.
- `FilaMovimiento`, `FilaFallo`, `TarjetaMovimientoPortal` y `HistorialCambios` [RF-21, RF-30, RF-32, RF-34].
- Ninguna escritura en `localStorage` ni `sessionStorage` en los flujos con PDF [RNF de persistencia].

### Lo que se verifica a mano (validación)
Solo lo que no puede verificar un test, como pide la spec: que el visor del navegador muestra el PDF en la pestaña nueva (Chrome, Firefox, Edge y Safari) y el comportamiento en un celular real (Chrome en Android y Safari en iOS), además de la demo manual de la spec. También que la firma del PDF firmado sigue válida en un lector de PDF.

## Documentación
- `README.md`, "Modo demo": el tope de 4 PDF y que el restablecimiento borra los PDF de los visitantes.
- `README.md`, "Desarrollo": la base debe aceptar paquetes de al menos 16 MB (`max_allowed_packet`, que en MySQL 8 es de 64 MB por defecto), porque un PDF de 5 MB viaja como un literal hexadecimal de unos 10,5 MB. Cómo verificarlo: `SHOW VARIABLES LIKE 'max_allowed_packet'`.

## Cobertura de RF

| RF | Dónde se implementa | Test |
|---|---|---|
| RF-1, RF-2 | Tabla `pdfs`, `pdfId` único, multer en memoria | Unitario del interceptor, e2e de migración |
| RF-3, RF-4 | `validatePdfContent`, interceptor, `validatePdfFile` | Unitarios de api y web, e2e de formato y corte |
| RF-5 | Contenido sin transformar, `toPdfResponse` | e2e de identidad |
| RF-6, RF-7 | `generateCode`, `UQ_pdfs_codigo`, `movementPdfName`, `rulingPdfName` | Unitarios, e2e de identidad |
| RF-8 | Sin columnas de nombre ni tipo, interceptor | e2e de registros |
| RF-9 | `tamano`, `formatPdfSize` | Vitest |
| RF-10, RF-11 | D2, transacción única, `CampoPdf` | e2e de todo o nada, Vitest |
| RF-12 | Botón deshabilitado, guard al empezar, pedido completo antes del handler | e2e de sesión e interrupción, Vitest |
| RF-13, RF-14 | `PreguntaConfirmacion`, `PdfsService.remove` | Vitest, e2e de movimientos |
| RF-15, RF-16, RF-17 | DTO, `update`, `CampoPdf` | e2e de movimientos, Vitest |
| RF-18, RF-19 | `pdfVisibilityNotice`, `PanelMovimientoDetalle` | Vitest |
| RF-20, RF-21 | `MovementData.pdf`, `diffMovement` | Unitario, e2e de movimientos |
| RF-22, RF-23 | `withMovement` y `withActiveCausa` (plan 003) | e2e de movimientos y portal |
| RF-24 a RF-27 | `jurisprudencia.service.ts`, `FalloResumen.tienePdf` | e2e de fallos y acceso |
| RF-28 | `AccionesPdf`, `PaginaPdf`, `getFile`, `saveFile`, `openPdfInPlace` | Vitest, validación manual |
| RF-29 | Rutas de descarga anidadas, sin id de PDF | e2e de portal |
| RF-30 a RF-32 | Tipos de respuesta, `FilaMovimiento`, `FilaFallo`, páginas de detalle | e2e, Vitest |
| RF-33 a RF-35 | `findVisiblePdf`, `toMovimientoCliente` | e2e de portal, unitario |
| RF-36 | `toPdfResponse` | e2e de encabezados |
| RF-37 | 404 único, `canAccess`, `RutaProtegida`, `PaginaPdf` | e2e de portal, Vitest |
| RF-38 | `@Roles` y guards de la spec 001 | e2e de acceso |
| RF-39 | Mensajes existentes (planes 003 y 005) | e2e de movimientos y fallos |
| RF-40 | `AutorResumen.activo` en `subidoPor` | e2e de movimientos |
| RF-41 | `PdfsService.create` con `FOR UPDATE` | e2e de demo y concurrencia |
| RF-42, RF-43 | `datos-de-muestra.sql`, restablecimiento sin cambios | e2e de datos de muestra y de restablecimiento |
| RNF de seguridad y copias | D4, `toPdfResponse`, CORS | e2e de encabezados, Vitest de `AccionesPdf` |
| RNF de registros | Interceptor, filtro global | e2e de registros |
| RNF de persistencia | `File` solo en memoria | Vitest |
| RNF de rendimiento | D1, `select: false` | e2e de rendimiento |

## Riesgos
1. **Abrir el PDF desde una dirección `blob:`** (D4): Chrome, Firefox y Edge lo muestran con su visor; Safari y los navegadores de celular pueden descargarlo en su lugar, lo que la spec acepta. Es lo primero que se prueba a mano, antes de construir las pantallas. Si algún navegador de escritorio no lo mostrara, la alternativa es mostrarlo dentro de la propia `PaginaPdf`, en un `iframe` con la dirección `blob:`, con el mismo pedido a la api.
2. **La pestaña del PDF sobrevive a la sesión:** una vez abierta, la pestaña muestra el PDF aunque la sesión se cierre después, porque ya no es parte de la aplicación. Es equivalente a una copia descargada, que la spec acepta (RF-36), pero conviene que lo confirmes.
3. **Corte del 413:** al cerrar la conexión sin leer todo el archivo, algunos navegadores informan un error de red en lugar del 413. La web ya rechaza esos archivos antes de enviarlos, así que solo pasa con pedidos armados a mano; en ese caso la web muestra "No se pudo guardar. Probá de nuevo".
4. **Mensajes de multer:** el interceptor traduce los errores que arma `@nestjs/platform-express` por su clase y su texto en inglés. Si una versión futura los cambia, los unitarios del interceptor fallan y lo avisan.
5. **`max_allowed_packet`:** si la base de producción tuviera un valor menor a 16 MB, los PDF grandes fallarían con un error 500. Los e2e con 5 MB lo detectan en la base de tests; la de producción se verifica al publicar (ver "Documentación").
6. **Tests de rendimiento contra la base remota:** como los e2e corren en la computadora de desarrollo contra la base de tests de Easypanel, los tiempos de 5 MB incluyen esa conexión. Si fallan por la red y no por el código, se corren desde el VPS.
7. **PDF firmado de prueba:** hace falta un PDF firmado con un certificado de prueba, sin datos reales, para `test/archivos/firmado.pdf`. Se genera una vez (por ejemplo, exportando a PDF con firma desde LibreOffice con un certificado autofirmado) y se versiona.
8. **Crecimiento de la base:** cada PDF suma hasta 5 MB a la base y a sus copias de seguridad. La spec deja fuera de alcance un tope fuera de la demo.
