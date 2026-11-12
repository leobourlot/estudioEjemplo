# Validación 010 — PDF de movimientos y fallos

## T1 — Prueba de "Ver PDF" en los navegadores (plan D4, riesgo 1)

Banco de prueba fuera del repositorio: un servidor de Node sin dependencias, con los encabezados de `web/public/.htaccess` en las páginas y los de `toPdfResponse` (plan, "Entrega del PDF") en el PDF. Cada caso se abre en una pestaña nueva con `target="_blank" rel="noopener noreferrer"`, como "Ver PDF".

Casos:
1. **Como la aplicación:** la página pide el PDF con `fetch`, arma un `Blob` de tipo `application/pdf` y reemplaza la pestaña con `location.replace`. Esperado: el visor muestra "Prueba T1 - spec 010" (en el celular, también vale que lo descargue).
2. **PDF con una página web escondida:** el mismo flujo con un PDF que lleva HTML y un script en comentarios PDF. Esperado: se ve o falla como PDF; nunca aparece una página que diga "EJECUTADO".
3. **Alternativa `iframe`:** solo para comparar.
4. **Dirección de la api abierta directamente:** esperado, se descarga como "2026-10-24 Resolucion K7Q2MX.pdf" y no se muestra.

| Navegador | Caso 1 | Caso 2 | Caso 3 | Caso 4 |
|---|---|---|---|---|
| Chrome (Windows) | Bien | Bien | Bien | Bien |
| Firefox (Windows) | Bien | Bien | Bien | Bien |
| Edge (Windows) | Bien | Bien | Bien | Bien |
| Chrome (Android) | Sin probar | Sin probar | Sin probar | Sin probar |
| Safari (iOS) | Sin probar | Sin probar | Sin probar | Sin probar |

Resultado (10/11/2026): en los tres navegadores de escritorio, el PDF se muestra con el visor del navegador desde la dirección `blob:`, el PDF con una página escondida nunca se ejecuta como página, y la dirección de la api descarga el archivo con su nombre. Se sigue con D4 del plan; la alternativa del `iframe` no hace falta. Los celulares quedan para la demo manual de T39.

## T23 — Rendimiento (plan, riesgo 6)

`test/rendimiento-pdfs.e2e-spec.ts`, corrido el 11/11/2026 desde la computadora de desarrollo contra la base de tests del VPS:

| Requisito | Resultado |
|---|---|
| Historial de 5.000 movimientos, con PDF de 5 MB en la primera página, en menos de 2 s | Aprobado |
| Listado de jurisprudencia con PDF de 5 MB en menos de 2 s | Aprobado |
| Movimientos del portal con PDF en menos de 2 s | Aprobado |
| Ningún listado ni detalle (panel, jurisprudencia y portal) pide el contenido de un PDF | Aprobado |
| Cinco descargas simultáneas de 5 MB empiezan a llegar en menos de 2 s | **Pendiente: correr desde el VPS** |
| Guardar un formulario con 5 MB tarda menos de 3 s una vez recibido | **Pendiente: correr desde el VPS** |

Los dos pendientes miden sobre todo la red entre esta computadora y la base. Medida sin la api, la base sola tarda 5,9 s en guardar 5 MB y 2,3 s en leerlos cinco veces a la vez, y la ida y vuelta mínima es de 37 ms. Con la api, fueron 8,1 s y 2,9 s. El test los marca como **omitidos**, no como aprobados, cuando la base sola tarda más de 1 s en mover 5 MB. Corridos desde el VPS, con la base al lado, se miden con los límites de la spec. Queda para T39 o para el despliegue: `pnpm --filter api exec vitest run --config ./vitest.config.e2e.ts test/rendimiento-pdfs.e2e-spec.ts` desde la consola del VPS, contra una base de tests.

## T39 — Recorrido de la spec

Cada requisito con los tests que lo cubren. `api/src/…` son unitarios de la api, `api/test/…` e2e de la api y `web/src/…` tests de la web.

| Requisito | Tests |
|---|---|
| RF-1, RF-2 | `api/src/pdfs/entidades.spec.ts`, `api/test/migracion-pdfs.e2e-spec.ts`, `api/src/pdfs/formulario-con-pdf.interceptor.spec.ts` (en memoria, sin disco) |
| RF-3, RF-4 | `api/src/pdfs/reglas-pdf.spec.ts`, `api/test/formulario-con-pdf.e2e-spec.ts`, `api/test/pdf-movimientos.e2e-spec.ts`, `web/src/servicios/archivo-pdf.test.ts`, `web/src/componentes/CampoPdf.test.tsx` |
| RF-5 | `api/test/respuesta-pdf.e2e-spec.ts`, `api/test/pdf-movimientos.e2e-spec.ts` y `api/test/pdf-fallos.e2e-spec.ts` (el PDF firmado, idéntico) |
| RF-6, RF-7 | `api/src/pdfs/reglas-pdf.spec.ts`, `api/test/pdfs-service.e2e-spec.ts` (choques de código), `api/test/pdf-movimientos.e2e-spec.ts` (nombre con los datos vigentes), `api/test/pdf-fallos.e2e-spec.ts` |
| RF-8 | `api/src/pdfs/entidades.spec.ts`, `api/test/formulario-con-pdf.e2e-spec.ts` (respuestas y registros), `web/src/componentes/CampoPdf.test.tsx` |
| RF-9 | `web/src/servicios/archivo-pdf.test.ts`, `api/test/pdfs-service.e2e-spec.ts` |
| RF-10, RF-11 | `api/test/pdf-movimientos.e2e-spec.ts`, `api/test/pdf-fallos.e2e-spec.ts`, `web/src/servicios/formulario-pdf.test.ts`, `web/src/paginas/PanelMovimientoDetallePdf.test.tsx` |
| RF-12 | `api/test/pdf-acceso.e2e-spec.ts` (interrupción y sesión), `web/src/componentes/FormularioMovimientoPdf.test.tsx`, `web/src/paginas/PanelMovimientoDetallePdf.test.tsx` |
| RF-13, RF-14 | `api/test/pdf-movimientos.e2e-spec.ts`, `api/test/pdf-fallos.e2e-spec.ts`, `web/src/servicios/formulario-pdf.test.ts`, `web/src/componentes/FormularioMovimientoPdf.test.tsx`, `web/src/paginas/FallosPdf.test.tsx` |
| RF-15 a RF-17 | `api/src/movimientos/dto/dto-pdf.spec.ts`, `api/test/pdf-movimientos.e2e-spec.ts`, `web/src/servicios/formulario-pdf.test.ts`, `web/src/componentes/CampoPdf.test.tsx` |
| RF-18 | `web/src/servicios/formulario-movimiento-pdf.test.ts`, `web/src/componentes/FormularioMovimientoPdf.test.tsx` |
| RF-19 | `web/src/servicios/formulario-movimiento-pdf.test.ts`, `web/src/paginas/PanelMovimientoDetallePdf.test.tsx`, `api/test/pdf-movimientos.e2e-spec.ts` |
| RF-20, RF-21 | `api/src/movimientos/reglas-movimientos-pdf.spec.ts`, `api/test/pdf-movimientos.e2e-spec.ts`, `web/src/servicios/presentacion-movimientos-pdf.test.ts`, `web/src/componentes/FilaMovimientoPdf.test.tsx` |
| RF-22, RF-23 | `api/test/pdf-movimientos.e2e-spec.ts`, `api/test/pdf-portal.e2e-spec.ts` (causa reactivada) |
| RF-24 a RF-27 | `api/test/pdf-fallos.e2e-spec.ts`, `web/src/paginas/FallosPdf.test.tsx` |
| RF-28 | `web/src/componentes/AccionesPdf.test.tsx`, `web/src/paginas/PaginaPdf.test.tsx`, `web/src/servicios/descarga-pdf.test.ts`, `web/src/servicios/cliente-http-pdf.test.ts`; el visor, a mano (T1) |
| RF-29 | `api/test/pdf-portal.e2e-spec.ts`, `web/src/servicios/servicios-pdf.test.ts` |
| RF-30 a RF-32 | `api/src/movimientos/movimiento-detalle-pdf.spec.ts`, `api/test/pdf-movimientos.e2e-spec.ts`, `api/test/pdf-fallos.e2e-spec.ts`, `web/src/componentes/FilaMovimientoPdf.test.tsx`, `web/src/paginas/PanelMovimientoDetallePdf.test.tsx`, `web/src/paginas/FallosPdf.test.tsx` |
| RF-33 a RF-35 | `api/test/pdf-portal.e2e-spec.ts`, `api/src/movimientos/movimiento-detalle.spec.ts`, `web/src/paginas/PortalPdf.test.tsx` |
| RF-36 | `api/test/respuesta-pdf.e2e-spec.ts`, `api/test/pdf-acceso.e2e-spec.ts` |
| RF-37 | `api/test/pdf-portal.e2e-spec.ts`, `api/test/pdf-movimientos.e2e-spec.ts` y `api/test/pdf-fallos.e2e-spec.ts` (404 único), `web/src/componentes/AvisoNavegacion.test.tsx`, `web/src/paginas/PaginaPdf.test.tsx`, `web/src/componentes/AccionesPdf.test.tsx` |
| RF-38 | `api/test/pdf-acceso.e2e-spec.ts` |
| RF-39 | `api/test/pdf-movimientos.e2e-spec.ts`, `api/test/pdf-fallos.e2e-spec.ts` |
| RF-40 | `api/test/pdf-movimientos.e2e-spec.ts`, `api/src/movimientos/movimiento-detalle-pdf.spec.ts` |
| RF-41 | `api/test/pdfs-service.e2e-spec.ts` |
| RF-42, RF-43 | `api/test/pdf-demo.e2e-spec.ts`, `api/test/restablecimiento-demo.e2e-spec.ts` |
| RNF de seguridad y de copias en el camino | `api/test/respuesta-pdf.e2e-spec.ts`, `api/test/pdf-acceso.e2e-spec.ts`, `web/src/servicios/descarga-pdf.test.ts` (el tipo del Blob lo fija la web); T1, caso 2 |
| RNF de validación y de registros | `api/test/formulario-con-pdf.e2e-spec.ts`, `web/src/servicios/archivo-pdf.test.ts` |
| RNF de aislamiento | `api/test/pdf-portal.e2e-spec.ts`, `api/test/pdf-fallos.e2e-spec.ts`; el test de aislamiento del portal de la spec 005 sigue en verde |
| RNF de persistencia | `web/src/paginas/PersistenciaPdf.test.tsx` |
| RNF de rendimiento | `api/test/rendimiento-pdfs.e2e-spec.ts` (dos tiempos pendientes desde el VPS, ver T23) |
| RNF de accesibilidad | `web/src/componentes/AccionesPdf.test.tsx`, `web/src/componentes/CampoPdf.test.tsx` (teclado) |

Migración: `up` y `down` sobre la base de tests en `api/test/migracion-pdfs.e2e-spec.ts`, y los tests de migraciones de las specs anteriores, ajustados a los índices y claves foráneas nuevos.

### Demo manual (11/11/2026)

| Paso | Resultado |
|---|---|
| 1. Carga con PDF firmado; rechazos | Bien. Observación: después de un archivo rechazado, "Guardar" guardaba el resto sin avisar que el PDF no había cambiado. Se corrigió (RF-11, ver abajo). |
| 2. Detalle, ver y descargar | Bien |
| 3. Visibilidad para el cliente | Bien |
| 4. Reemplazo | Bien |
| 5. Quitado e historial | Bien |
| 6. Anulación y restauración | Bien |
| 7. PDF de un fallo | Bien |
| 8. Direcciones sin permiso y sin sesión | Bien |
| 9. Demo: PDF de muestra, tope de 4 y restablecimiento | Bien |

**Corrección de la observación del paso 1** (spec, RF-11 y casos límite; usuario, 11/11/2026): mientras haya un archivo rechazado sin elegir otro ni descartarlo, el formulario no se envía y muestra "El PDF elegido no se adjuntó: <motivo>. Elegí otro archivo o descartalo". El aviso del campo ofrece "Descartar", y con eso se guarda el resto sin cambiar el PDF. Vale para los rechazos de la pantalla y de la api. Tests: `web/src/servicios/formulario-pdf.test.ts`, `web/src/componentes/FormularioMovimientoPdf.test.tsx` y `web/src/paginas/PanelMovimientoDetallePdf.test.tsx`.

### Veredicto

La spec está cumplida: cada RF y cada requisito no funcional tiene sus tests en verde, `pnpm test` y `pnpm lint` pasan, y la demo manual se completó sin errores (la firma del PDF firmado siguió válida después de descargarlo, en el paso 1). Quedan para el despliegue, porque no se pueden verificar desde la computadora de desarrollo:

- Chrome en Android y Safari en iOS (T1). La spec acepta que el celular descargue el PDF en lugar de mostrarlo.
- Los dos tiempos de rendimiento con 5 MB, desde el VPS (T23).

### Avisos de despliegue

- Verificar `max_allowed_packet` en la base de producción y en la de la demo: al menos 16 MB (README, "Desarrollo").
- Verificar que el proxy de Easypanel no guarde respuestas con PDF: las respuestas llevan `Cache-Control: no-store, private`, pero conviene confirmar que ninguna capa intermedia lo ignore.
- La migración `CrearPdfs1794182400000` se aplica a mano, como las anteriores: `npx typeorm migration:run -d dist/base-de-datos/data-source.js` desde la consola del servicio de la api.

### Ajustes después del despliegue (11/11/2026)

Observaciones del usuario al probar en el celular:

- **El PDF en el historial de cambios** (spec, RF-21 y casos límite): cada valor muestra solo el tamaño y la visibilidad, por ejemplo "17 KB · Oculto para el cliente", o "Sin PDF". El código se sigue registrando, pero no se muestra. Un reemplazo por un PDF del mismo tamaño y la misma visibilidad queda registrado con quién y cuándo, aunque los dos valores se vean iguales. Tests: `web/src/servicios/presentacion-movimientos-pdf.test.ts` y `web/src/componentes/FilaMovimientoPdf.test.tsx`.
- **El botón "Buscar" fuera de lugar en el celular** (specs 003 y 008, ancho de 360 px sin desplazamiento horizontal): en los filtros de movimientos, de jurisprudencia y de modelos, el campo de búsqueda ocupa el ancho disponible y "Buscar" queda a su lado; desde el ancho `sm` se ven como antes.

`pnpm test` (web) y `pnpm lint` pasan.

### La visibilidad del PDF sigue a la del movimiento (12/11/2026)

Pedido del usuario: quitar la casilla "PDF visible para el cliente" y que el cliente vea el PDF de un movimiento si y solo si ve el movimiento.

- **Spec:** RF-10, RF-15 a RF-23, RF-30 a RF-38, RF-42, RNF de privacidad y de accesibilidad, casos límite, fuera de alcance y criterios de finalización. El plan lleva una nota al principio.
- **Base:** la migración `QuitarVisibilidadDelPdf1794441600000` quita `movimientos.pdfVisible`. Su `down` la vuelve a crear, marcada en el PDF de cada movimiento visible, para que el cliente siga viendo lo mismo. Test: `api/test/migracion-visibilidad-pdf.e2e-spec.ts`.
- **Api:** los DTO ya no aceptan `pdfVisible` ("El campo pdfVisible no está permitido"); el portal entrega el PDF de todo movimiento que el cliente puede ver; el resumen del historial informa `tienePdf`; el historial de cambios registra el PDF como `{ codigo, tamano }`. Los datos de muestra dejan de marcar el PDF.
- **Web:** sin casilla de visibilidad del PDF; la fila muestra la leyenda "PDF"; el historial de cambios muestra solo el tamaño, también en los cambios viejos que guardan la visibilidad; los avisos de RF-18 son "El cliente también podrá ver y descargar el PDF" (el movimiento pasa a visible con PDF) y "El cliente podrá ver y descargar este PDF" (PDF nuevo en un movimiento visible); restaurar un movimiento visible con PDF pide confirmación.

Antes de aplicar la migración en producción y en la demo: un movimiento visible cuyo PDF estaba oculto pasa a mostrar el PDF al cliente. Para revisarlos antes de migrar: `SELECT id, causaId FROM movimientos WHERE visible = 1 AND anulado = 0 AND pdfId IS NOT NULL AND pdfVisible = 0`. La migración se aplica a mano, como las anteriores.
