# Tareas 010 — PDF de movimientos y fallos

Derivadas de `spec.md` y `plan.md` de esta carpeta. Cada tarea dura entre 20 y 30 minutos y se hace en orden.

Reglas para todas las tareas:
- Primero se escriben los tests, después el código.
- Una tarea está terminada solo si, además de su "Hecho cuando", `pnpm test` y `pnpm lint` pasan sin errores.
- Ninguna tarea crea ni modifica archivos `.env`, `.env.test` ni ningún otro con credenciales, y ninguna se conecta a la base de producción. Los e2e usan la base de tests de la spec 001.
- No se agregan dependencias: el plan no prevé ninguna.
- Antes de modificar un archivo existente se pide aprobación (AGENTS.md). Las tareas que lo hacen lo indican con **(modifica existente)**.
- No se hacen commits sin pedido explícito.

## Preparación

- [x] **T1 — Prueba de "Ver PDF" en los navegadores** [RF-28, plan D4, riesgo 1]
  Prueba manual, sin código en el repositorio: desde la consola del navegador, en una página del sitio en `pnpm dev`, armar un `Blob` de tipo `application/pdf` con un PDF de prueba, abrir una pestaña nueva y reemplazarla con `location.replace` por la dirección `blob:`.
  Hecho cuando: `validacion.md` anota el resultado en Chrome, Firefox y Edge de escritorio, y en Chrome de Android y Safari de iOS si hay un dispositivo a mano. Si algún navegador de escritorio no muestra el PDF, se detiene la spec y se avisa, para pasar al `iframe` de la alternativa del plan antes de seguir.

- [x] **T2 — Archivos de prueba** [RF-3, RF-5]
  `api/test/utilidades/pdfs-de-prueba.ts`: `minimalPdf(texto?)` (un PDF válido de una página armado a mano), `pdfWithPrefix(bytes)` (con bytes antes de `%PDF-`), `pdfWithMarkerAt(posicion)`, `notAPdf()` (los primeros bytes de un JPG) y `bufferOfSize(n)` (un PDF válido completado hasta `n` bytes). `api/test/archivos/firmado.pdf`: un PDF firmado con un certificado autofirmado de prueba, sin datos reales (plan, riesgo 7). Si no hay en el equipo una herramienta para generarlo, se le pide al usuario.
  Hecho cuando: un test unitario verifica que `minimalPdf()` empieza con `%PDF-` y termina con `%%EOF`, que `bufferOfSize(5_242_880)` mide exactamente eso, que `pdfWithMarkerAt(1019)` y `pdfWithMarkerAt(1020)` tienen la marca en esa posición, y que `firmado.pdf` empieza con `%PDF-` y contiene `/ByteRange` y `/Sig`.

## api

- [x] **T3 — Reglas puras** [RF-3, RF-4, RF-6, RF-7]
  `pdfs/reglas-pdf.ts`: las constantes del plan, `PDF_MESSAGES`, `validatePdfContent`, `generateCode`, `TYPE_NAMES_WITHOUT_ACCENTS`, `movementPdfName` y `rulingPdfName`.
  Hecho cuando: los tests unitarios verifican:
  - Vacío, 5.242.880 bytes (válido) y 5.242.881 (rechazado), en ese orden de prioridad.
  - La marca en el byte 0 y en el 1.019 (aceptado), en el 1.020 (rechazado) y un JPG (rechazado).
  - Que `generateCode` con un `randomInt` simulado arma 6 caracteres del alfabeto, y que con `crypto.randomInt` nunca sale de él (1.000 códigos).
  - Que `TYPE_NAMES_WITHOUT_ACCENTS` tiene exactamente las claves de `MOVEMENT_TYPES` y ningún valor con tildes.
  - Los nombres "2026-10-24 Resolucion K7Q2MX.pdf", "2026-10-24 Escrito presentado K7Q2MX.pdf" y "Fallo 2019-05-12 P4N8RC.pdf", y que todos son ASCII.

- [x] **T4 — Entidad `Pdf` y columnas nuevas** [RF-1, RF-2, RF-9, RF-17] **(modifica existente: `movimiento.entity.ts`, `fallo.entity.ts`)**
  `pdfs/pdf.entity.ts` con los campos del plan, `contenido` como `mediumblob` con `select: false` y `UQ_pdfs_codigo`. `Movimiento` suma `pdfId` (único), su relación y `pdfVisible`; `Fallo` suma `pdfId` (único) y su relación.
  Hecho cuando: la api compila y un test unitario lee los metadatos de TypeORM y verifica que `contenido` tiene `select: false` y tipo `mediumblob`, y que la entidad no tiene columnas para el nombre original ni para el tipo informado (RF-8).

- [x] **T5 — Migración** [RF-1, RF-2, RF-6, RF-17] **(modifica existente: `esquema.ts`)**
  Migración `1794182400000-crear-pdfs`. Se agregan la entidad y la migración al final de las listas de `esquema.ts`.
  Hecho cuando: un e2e corre `up` sobre la base de tests con las migraciones anteriores, guarda un PDF de 5.242.880 bytes y lo lee idéntico, verifica que un segundo código igual y un segundo movimiento con el mismo `pdfId` son rechazados por sus índices únicos, que `pdfVisible` nace en `false`, y corre `down` sin errores.

- [x] **T6 — `PdfsService`** [RF-5, RF-6, RF-9, RF-14] **(modifica existente: `app.module.ts`)**
  `pdfs/pdfs.service.ts` con `create` (sin el tope de la demo todavía), `remove` y `findContent`, y `pdfs/pdfs.module.ts`.
  Hecho cuando: los e2e verifican que `create` guarda el contenido sin cambios, el tamaño, el autor y la fecha; que ante un choque de código (`randomInt` simulado que repite un código existente) reintenta con otro y que después de 5 choques falla; que `remove` borra la fila; que `findContent` devuelve el contenido idéntico, y que un `find` común de `Pdf` no lo trae.

- [x] **T7 — Tope de la demo** [RF-41]
  `PdfsService.create` con el `SELECT id FROM pdfs FOR UPDATE` y el tope de 4 cuando `MODO_DEMO` es `true`.
  Hecho cuando: los e2e verifican que con `MODO_DEMO=true` y 4 PDF el quinto responde 409 con el mensaje del plan; que con 3 PDF y dos `create` simultáneos en transacciones distintas, uno guarda y el otro responde 409; y que con `MODO_DEMO=false` se guarda un quinto.

- [x] **T8 — Interceptor del formulario** [RF-2, RF-4, RF-10, plan D3]
  `pdfs/formulario-con-pdf.interceptor.ts` y `pdfs/archivo-pdf.decorator.ts`: pedidos JSON sin cambios; `multipart/form-data` con `FileInterceptor('pdf')` en memoria y los límites del plan; control previo del `Content-Length`; `datos` como `request.body`; el decorador devuelve `{ contenido }` o `null`.
  Hecho cuando: los tests verifican, con un controller de prueba (`test/utilidades/controlador-de-prueba.ts`):
  - Que las opciones no tienen `dest` ni `storage`.
  - Que un JSON llega igual que hoy y con el archivo en `null`.
  - Que un multipart con `datos` y `pdf` llega validado por el `ValidationPipe` global, con el contenido idéntico.
  - Que `datos` ausente, con un JSON inválido o con una parte extra responde 400 "Los datos del formulario no son válidos".
  - Que un `Content-Length` de 6 MB responde 413 "El archivo no puede superar los 5 MB" con `Connection: close`, sin que el handler corra.

- [x] **T9 — Errores del archivo y registros** [RF-4, RF-8]
  Traducción de los errores de multer en el interceptor: tamaño (413), más de un archivo y partes de más.
  Hecho cuando: los tests verifican:
  - Que un archivo de 5.242.881 bytes enviado sin `Content-Length` (por partes) responde 413 con el mensaje de la spec, y uno de 5.242.880 llega.
  - Que dos archivos responden 400 "Podés adjuntar un solo PDF".
  - Que con un archivo llamado `escrito <final> {v2}.pdf` y tipo `text/html`, con éxito y con cada error, ni el nombre ni el tipo aparecen en la respuesta ni en los registros (espía sobre `Logger`).

- [x] **T10 — Respuesta del PDF y CORS** [RF-7, RF-36, RNF de seguridad y de copias] **(modifica existente: `configurar-aplicacion.ts`)**
  `pdfs/respuesta-pdf.ts` con `toPdfResponse`. CORS suma `exposedHeaders: ['Content-Disposition']`.
  Hecho cuando: los tests verifican, con un controller de prueba, `Content-Type`, `X-Content-Type-Options`, `Content-Disposition` con el nombre, `Cache-Control: no-store, private`, `Content-Security-Policy` y `Cross-Origin-Resource-Policy`; que el cuerpo es idéntico al guardado, y que una petición CORS de un origen permitido recibe `Access-Control-Expose-Headers: Content-Disposition`.

- [x] **T11 — DTO de movimientos** [RF-15, RF-16] **(modifica existente: `dto/crear-movimiento.dto.ts`, `dto/modificar-movimiento.dto.ts`, `dto/reglas-movimiento.ts`)**
  `pdfVisible` en los dos DTO y `quitarPdf` en el de modificación.
  Hecho cuando: los tests unitarios verifican que `pdfVisible` que no es booleano y `quitarPdf` distinto de `true` se rechazan, que siguen rechazándose `causaId`, `anulado` y otros campos desconocidos, y que los mensajes no repiten el valor recibido.

- [x] **T12 — Historial con el PDF** [RF-20, RF-21] **(modifica existente: `reglas-movimientos.ts`)**
  `MovementData` suma `pdf: { codigo, tamano, visible } | null`; `diffMovement` y `loadChanges` lo incluyen.
  Hecho cuando: los tests unitarios verifican el cambio por adjuntar, por quitar, por cambiar la visibilidad y por reemplazar con el mismo tamaño y la misma visibilidad (cambia el código); que sin cambios del PDF no hay entrada `pdf`, y que un cambio de carga anterior a esta spec, sin `pdf`, se sigue leyendo.

- [x] **T13 — Carga de un movimiento con PDF** [RF-10, RF-11, RF-16, RF-20] **(modifica existente: `movimientos.controller.ts`, `movimientos.service.ts`, `movimientos.module.ts`)**
  `POST` con el interceptor y `@ArchivoPdf()`; `create` según el pseudocódigo del plan.
  Hecho cuando: los e2e verifican:
  - Que un movimiento con PDF nace con el PDF oculto y, con `pdfVisible: true`, visible.
  - Que `pdfVisible` sin archivo responde 400 "El movimiento no tiene PDF".
  - Que un archivo inválido (vacío, sin marca) responde 400 y no deja filas en `movimientos` ni en `pdfs`.
  - Que una descripción con `<` junto con un PDF válido responde 400 y tampoco deja filas.
  - Que el cambio de carga registra `pdf` con su código, tamaño y visibilidad.
  - Que la carga JSON sin PDF sigue igual que hoy.

- [x] **T14 — Modificación con PDF** [RF-13 a RF-17, RF-20, RF-21]
  `PATCH` con el interceptor; `update` según el pseudocódigo del plan.
  Hecho cuando: los e2e verifican:
  - Adjuntar a un movimiento sin PDF.
  - Reemplazar uno visible: el nuevo nace oculto, el anterior ya no está en `pdfs` y el código cambió.
  - Reemplazar con `pdfVisible: true`.
  - Quitar: borra la fila y deja `pdfVisible` en `false`.
  - Cambiar la visibilidad del PDF en los dos sentidos, con JSON.
  - `pdfVisible` sin PDF responde 409 "El movimiento no tiene PDF"; archivo con `quitarPdf` responde 400.
  - `quitarPdf` sin PDF no cambia nada ni deja cambio en el historial.
  - Cada operación actualiza `modificadoPor/En` del movimiento y no los de la causa, y deja su cambio en `movimiento_cambios` sin el contenido.

- [x] **T15 — Anulación, causa desactivada y concurrencia** [RF-19, RF-22, RF-23]
  Sin código nuevo si T13 y T14 están bien: se verifica el comportamiento de `withMovement` y `withActiveCausa` con el PDF.
  Hecho cuando: los e2e verifican:
  - Que en un movimiento anulado adjuntar, reemplazar, quitar y cambiar la visibilidad responden 409 "El movimiento está anulado. Restauralo para modificarlo", y que al restaurarlo el PDF conserva su visibilidad.
  - Que en una causa desactivada responden 409 "La causa está desactivada".
  - Que una anulación y un `PATCH` con archivo simultáneos se resuelven de a una y, si la anulación queda primero, no queda ningún PDF nuevo en `pdfs`.
  - Que dos reemplazos simultáneos dejan un solo PDF, con los dos cambios en el historial.

- [x] **T16 — Respuestas y descarga del panel** [RF-28 a RF-31, RF-37, RF-40] **(modifica existente: `movimiento-detalle.ts`, `movimientos.controller.ts`, `movimientos.service.ts`)**
  `MovimientoResumen.pdf`, `MovimientoDetalle.pdf` y `GET /:movimientoId/pdf`.
  Hecho cuando: los e2e verifican:
  - Los campos del resumen y del detalle, con el autor del PDF marcado si está desactivado.
  - Que la descarga devuelve el PDF idéntico, también el firmado, con el nombre de RF-7 y con los datos vigentes después de cambiar la fecha del movimiento.
  - Que funciona con el movimiento anulado y con la causa desactivada.
  - Que causa inexistente, movimiento inexistente, movimiento de otra causa, id no numérico y movimiento sin PDF responden el mismo 404 "No existe ese PDF".

- [x] **T17 — Fallos: carga, modificación y repetido** [RF-24, RF-25] **(modifica existente: `jurisprudencia.controller.ts`, `jurisprudencia.service.ts`, `jurisprudencia.module.ts`, `dto/modificar-fallo.dto.ts`)**
  `POST` y `PATCH` con el interceptor; `quitarPdf` en el DTO de modificación.
  Hecho cuando: los e2e verifican:
  - Carga con PDF; adjuntar, reemplazar y quitar en la modificación, con `modificadoPor/En`.
  - Que la pregunta de repetido no deja filas en `pdfs`, y que al reenviar con `confirmarRepetido` y el mismo archivo se guarda.
  - Que dos fallos con el mismo PDF no disparan la pregunta y que adjuntar un PDF tampoco.
  - Que un archivo inválido no deja el fallo guardado.

- [x] **T18 — Fallos: desactivado, respuestas y descarga** [RF-26, RF-27, RF-32] **(modifica existente: `fallo-detalle.ts`)**
  `FalloResumen.tienePdf`, `FalloDetalle.pdf` y `GET /:id/pdf`.
  Hecho cuando: los e2e verifican que un fallo desactivado responde 409 al adjuntar, reemplazar o quitar, pero se descarga; los campos del resumen y del detalle; la descarga con el nombre de RF-7; el 404 único para un fallo inexistente o sin PDF, y que un cliente recibe 403 en la descarga.

- [x] **T19 — Portal** [RF-33 a RF-35, RF-37] **(modifica existente: `visibilidad-cliente.service.ts`, `portal.controller.ts`, `portal.service.ts`, `portal-detalle.ts`, `portal.module.ts`, `movimiento-detalle.ts`)**
  `findVisiblePdf`, `tienePdf` en `MovimientoCliente` y `GET /:causaId/movimientos/:movimientoId/pdf`.
  Hecho cuando: los e2e verifican:
  - Que el cliente descarga el PDF visible de un movimiento visible de su causa.
  - Que PDF oculto, movimiento oculto, anulado, inexistente o de otra causa, causa ajena, inexistente o desactivada, cliente desvinculado, movimiento sin PDF e ids no numéricos responden el mismo código y el mismo cuerpo, byte a byte.
  - Que un movimiento restaurado y una causa reactivada vuelven a dar el PDF.
  - Que `tienePdf` es `false` con el PDF oculto y que ninguna respuesta del portal contiene tamaño, código, autor ni fechas del PDF.

- [x] **T20 — Todo o nada e interrupción** [RF-10 a RF-12]
  Hecho cuando: los e2e verifican que un pedido multipart cortado a mitad del archivo (socket destruido) no deja filas en ninguna tabla, y que una subida que empieza con la sesión a un segundo de vencer termina bien y guarda.

- [x] **T21 — Acceso y encabezados en todos los endpoints** [RF-36, RF-38]
  Hecho cuando: los e2e verifican, en los tres endpoints de descarga y en los `POST` y `PATCH` con archivo: visitante (401), cliente en el panel e integrante en el portal (403), integrante con cambio de contraseña pendiente (403); y los encabezados de T10 en las tres descargas.

- [x] **T22 — Datos de muestra y restablecimiento** [RF-42, RF-43] **(modifica existente: `datos-de-muestra/datos-de-muestra.sql`)**
  Dos PDF de muestra como literales hexadecimales, con los códigos `MUES01` y `MUES02`, y los `UPDATE` que los asignan.
  Hecho cuando: los e2e verifican, después de un restablecimiento sobre una base de prueba marcada como de la demo (como en la spec 009):
  - Que hay exactamente dos PDF, que empiezan con `%PDF-` y dicen "Documento de muestra de la demo".
  - Que uno está, visible, en un movimiento visible de una causa de la cliente de prueba, y que ella lo descarga por el portal; que el otro está en un fallo.
  - Que un PDF subido antes del restablecimiento ya no está y que `subidoEn` se corrió.
  - Que un restablecimiento que falla deja los PDF como estaban, y que sigue terminando en menos de un minuto con 4 PDF de 5 MB.

- [x] **T23 — Rendimiento** [RNF de rendimiento]
  Hecho cuando: los e2e verifican:
  - Que el historial de 5.000 movimientos y el listado de jurisprudencia, con PDF en parte de las filas, siguen por debajo de 2 segundos.
  - Que el registro de consultas de TypeORM, activado solo en el test, no muestra `contenido` en ningún listado ni detalle.
  - Que cinco descargas simultáneas de 5 MB empiezan a llegar en menos de 2 segundos.
  - Que guardar un formulario con 5 MB tarda menos de 3 segundos desde que termina de llegar.

  Si falla por la conexión con la base remota y no por el código, se anota en `validacion.md` y se corre desde el VPS (plan, riesgo 6).

## web

- [x] **T24 — Validación y tamaño del archivo** [RF-3, RF-4, RF-9, RF-11]
  `servicios/archivo-pdf.ts`.
  Hecho cuando: los tests verifican `validatePdfFile` con `File` simulados (vacío, 5.242.880 y 5.242.881 bytes, sin marca, con la marca después de bytes y en el 1.020), con los mismos mensajes que la api; `formatPdfSize` con 300 bytes ("1 KB"), 850.000 ("830 KB"), 1.048.000 ("1023 KB"), 1.048.500 ("1 MB"), 2.300.000 ("2 MB") y 5.242.880 ("5 MB"); e `isPdfFileError` con cada mensaje de archivo y con uno que no lo es.

- [x] **T25 — Cliente HTTP con formularios y archivos** [RF-10, RF-12, RF-28] **(modifica existente: `servicios/cliente-http.ts`)**
  `sendForm(method, path, formData)` y `getFile(path)`.
  Hecho cuando: los tests con `fetch` simulado verifican que `sendForm` no fija `Content-Type` y envía el `FormData`; que ante un 401 renueva una vez y reenvía el mismo `FormData`; que un error de red da el `ApiError` de estado 0; que `getFile` devuelve el `Blob` y el nombre leído de `Content-Disposition`, y que los dos avisan actividad.

- [x] **T26 — Guardar y abrir el PDF** [RF-28]
  `servicios/descarga-pdf.ts` con `saveFile` y `openPdfInPlace`.
  Hecho cuando: los tests con el DOM de jsdom verifican que `saveFile` crea un enlace con `download` y el nombre, lo usa y libera la dirección; y que `openPdfInPlace` crea un `Blob` de tipo `application/pdf` aunque reciba otro tipo, y llama a `location.replace` con su dirección.

- [x] **T27 — Servicios de movimientos, jurisprudencia y portal** [RF-10, RF-28 a RF-35] **(modifica existente: `servicios/movimientos.ts`, `servicios/jurisprudencia.ts`, `servicios/portal.ts`)**
  Tipos nuevos, carga y modificación con archivo (`sendForm`) y sin él (como hoy), y `getPdf` en los tres.
  Hecho cuando: los tests con el cliente simulado verifican rutas y métodos, que sin archivo se envía JSON y con archivo `FormData` con `datos` y `pdf`, y las tres rutas de descarga.

- [x] **T28 — Reglas de los formularios** [RF-13, RF-15, RF-16, RF-18, RF-19, RF-25] **(modifica existente: `servicios/formulario-movimiento.ts`, `servicios/formulario-fallo.ts`)**
  Estado del PDF en el formulario, armado del pedido, `pdfVisibilityNotice`, mensajes de confirmación y `needsRestoreConfirmation`.
  Hecho cuando: los tests verifican:
  - Cuándo se muestra la casilla de visibilidad, y que vuelve a desmarcada al elegir un archivo que reemplaza a otro.
  - El pedido para adjuntar, reemplazar, quitar y cambiar la visibilidad.
  - Cada aviso de RF-18 y su orden con el de la spec 003, que `needsVisibleChangeWarning` no cuenta los cambios del PDF, cuándo se pide confirmación de reemplazo o de quitado, y `needsRestoreConfirmation` en las cuatro combinaciones de movimiento y PDF visibles.

- [x] **T29 — Aviso al llevar al inicio** [RF-37] **(modifica existente: `servicios/sesion.ts`, `componentes/RutaProtegida.tsx`, `paginas/PanelInicio.tsx`, `paginas/PortalInicio.tsx`)**
  `canAccess` con `notice` para las rutas de PDF de la otra sección; `RutaProtegida` lo pasa en el `state`; los dos inicios lo muestran.
  Hecho cuando: los tests verifican `canAccess` en las tres rutas de PDF para un cliente, un integrante, sin sesión y con cambio pendiente; que `RutaProtegida` lleva con el aviso, y que cada inicio muestra "No existe ese PDF" con `role="status"` solo si llegó en el `state`.

- [x] **T30 — `CampoPdf`** [RF-9, RF-11, RF-15, RF-16]
  Componente con el PDF guardado o "Sin PDF", "Elegir PDF", "Quitar PDF" y, en movimientos, la casilla de visibilidad.
  Hecho cuando: los tests verifican el `input` sin `multiple` y con `accept`; que un archivo inválido muestra su mensaje y se descarta; la casilla según T28; que "Quitar PDF" la oculta; el tamaño con `formatPdfSize`, y que todo se usa con el teclado.

- [x] **T31 — `AccionesPdf`** [RF-28]
  Hecho cuando: los tests verifican el enlace "Ver PDF" con `target="_blank"`, `rel="noopener noreferrer"` y su nombre accesible ("Ver el PDF del movimiento del 24/10/2026 (se abre en una pestaña nueva)"), y el botón "Descargar PDF", que llama al servicio y a `saveFile`, y que ante un 404 lleva al inicio con el aviso.

- [x] **T32 — `PaginaPdf` y rutas** [RF-28, RF-37] **(modifica existente: `RutasAplicacion.tsx`)**
  Página y tres rutas dentro de `RutaProtegida`, fuera de los diseños del panel y del portal.
  Hecho cuando: los tests con servicios simulados verifican "Abriendo el PDF…", que con el PDF llama a `openPdfInPlace`, que ante un 404 o un 403 lleva al inicio de su sección con el aviso, y que sin sesión las tres rutas llevan a `/ingresar`.

- [x] **T33 — Formulario de movimiento con PDF** [RF-10 a RF-13, RF-16, RF-18] **(modifica existente: `componentes/FormularioMovimiento.tsx`)**
  Hecho cuando: los tests con servicios simulados verifican:
  - "Guardando…" y el botón deshabilitado durante el envío.
  - La confirmación de reemplazo y de quitado, y que sin aceptar no se envía nada.
  - Que un error de red muestra "No se pudo guardar. Probá de nuevo" y conserva lo escrito y el archivo.
  - Que un rechazo del archivo lo descarta y uno de otro campo lo conserva.
  - Los avisos de RF-18.

- [x] **T34 — Detalle, historial y fila del movimiento** [RF-19, RF-21, RF-30, RF-31] **(modifica existente: `paginas/PanelMovimientoDetalle.tsx`, `componentes/FilaMovimiento.tsx`, `componentes/HistorialCambios.tsx`, `servicios/presentacion-movimientos.ts`)**
  Hecho cuando: los tests verifican la sección del PDF en el detalle (tamaño, autor marcado si está desactivado, fecha, visibilidad y `AccionesPdf`); la confirmación al restaurar un movimiento visible con PDF visible y su ausencia en los demás casos; la leyenda "PDF" y la visibilidad en la fila, y el campo "PDF" del historial ("K7Q2MX, 850 KB, oculto para el cliente" y "Sin PDF").

- [x] **T35 — Fallos en la web** [RF-24 a RF-27, RF-32] **(modifica existente: `componentes/FormularioFallo.tsx`, `componentes/FilaFallo.tsx`, `paginas/PanelFalloDetalle.tsx`)**
  Hecho cuando: los tests verifican `CampoPdf` sin casilla de visibilidad en el formulario; que la pregunta de repetido reenvía el mismo archivo con `confirmarRepetido`; la leyenda "PDF" en la fila; la sección del PDF en el detalle, y que un fallo desactivado muestra el PDF sin opciones para cambiarlo.

- [x] **T36 — Portal en la web** [RF-34, RF-35] **(modifica existente: `componentes/TarjetaMovimientoPortal.tsx`, `paginas/PortalMovimientoDetalle.tsx`)**
  Hecho cuando: los tests verifican que la leyenda "PDF" y `AccionesPdf` aparecen solo con `tienePdf`, que nunca se muestra el tamaño, y que el test de aislamiento del portal de la spec 005 sigue pasando.

- [x] **T37 — Persistencia** [RNF de persistencia]
  Hecho cuando: un test recorre la carga con archivo, el reemplazo, la descarga y la apertura de un PDF con espías sobre `localStorage` y `sessionStorage`, y verifica que no se escribe nada.

## Cierre

- [x] **T38 — Documentación** **(modifica existente: `README.md`)**
  Los dos agregados de la sección "Documentación" del plan, y el estado de la spec 010 en la hoja de ruta.
  Hecho cuando: el README explica el tope de 4 PDF en la demo, que el restablecimiento borra los PDF de los visitantes, y cómo verificar `max_allowed_packet`.

- [x] **T39 — Validación de la spec**
  Recorrer `spec.md` requisito por requisito con su test, correr la migración `up` y `down` sobre la base de tests y hacer la demo manual de los criterios de finalización.
  Hecho cuando:
  - Cada RF y cada requisito no funcional tiene al menos un test en verde identificado, salvo el visor del navegador y el celular real, que se verifican a mano.
  - `pnpm test` y `pnpm lint` pasan.
  - La demo manual se completó sin errores, incluida la firma válida del PDF firmado en un lector de PDF.
  - `validacion.md` deja anotados los avisos de despliegue: verificar `max_allowed_packet` en la base de producción, y que el proxy de Easypanel no guarde respuestas con PDF.
