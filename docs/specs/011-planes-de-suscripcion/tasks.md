# Tareas 011 — Planes de suscripción

Derivadas de `spec.md` y `plan.md` de esta carpeta. Cada tarea dura entre 20 y 30 minutos y se hace en orden.

Reglas para todas las tareas:
- Primero se escriben los tests, después el código.
- Una tarea está terminada solo si, además de su "Hecho cuando", `pnpm test` y `pnpm lint` pasan sin errores.
- Ninguna tarea crea ni modifica archivos `.env`, `.env.test` ni ningún otro con credenciales, y ninguna se conecta a la base de producción. Los e2e usan la base de tests de la spec 001. `api/.env` y `api/.env.test` ya tienen `PLAN=premium` y `ESPACIO_PDF_GB=10`, cargados a mano. Los tests que necesitan otro plan u otro espacio los fijan con `createTestApp` (T5).
- No se agregan dependencias: el plan no prevé ninguna.
- Antes de modificar un archivo existente se pide aprobación (AGENTS.md). Las tareas que lo hacen lo indican con **(modifica existente)**.
- No se hacen commits sin pedido explícito.

## Preparación

- [x] **T1 — El 503 del ajuste pendiente en la spec** [plan D5, riesgo 1] **(modifica existente: `spec.md`)**
  El plan responde 503 "El sistema se está actualizando. Probá de nuevo en unos minutos" mientras el ajuste de las cuentas no se completó (por ejemplo, si se publica sin correr la migración). La spec no lo prevé. Se agrega como caso límite en "Configuración" y el mensaje al anexo de textos como T-17, para que código y spec no diverjan (principio 2). Requiere tu aprobación antes de empezar T7.
  Hecho cuando: `spec.md` tiene el caso límite y T-17, y el plan remite a T-17 en lugar del texto suelto.

## api

- [ ] **T2 — Variables `PLAN` y `ESPACIO_PDF_GB`** [RF-1, RF-2, RF-27, RF-36] **(modifica existente: `configuracion/validar-entorno.ts`)**
  `Environment` suma `PLAN: Plan` y `ESPACIO_PDF_BYTES: number`, según D1 y D2.
  Hecho cuando: los tests unitarios verifican:
  - Que sin `PLAN`, con `Premium`, con `BASICO` y con `gratis` falla, y el error nombra la variable.
  - Que con `premium`, `ESPACIO_PDF_GB` ausente da 10.737.418.240 bytes; 1 y 1.000 se aceptan; 0, 1.001, `10,5`, `10.5` y `diez` fallan.
  - Que con `basico`, un `ESPACIO_PDF_GB` inválido se ignora.
  - Que `MODO_DEMO=true` con `basico` falla y con `premium` pasa.

- [ ] **T3 — Reglas puras del plan** [RF-17, RF-20, RF-28]
  `plan/reglas-plan.ts`: las constantes del plan, `PLAN_MESSAGES` (T-4, T-5, T-6, T-9 con el total, T-14 y T-17), `selectOutsidePlan` y `exceedsPdfSpace`.
  Hecho cuando: los tests unitarios verifican:
  - `selectOutsidePlan` con 1, 2, 3 y 4 integrantes; con el principal como el más nuevo; con dos de la misma `creadoEn` (gana el id menor); y que nunca devuelve al principal.
  - `exceedsPdfSpace` con justo el total (no supera), un byte más (supera) y un reemplazo que descuenta el anterior.
  - Que T-9 arma "Se completó el espacio para PDF del estudio (10 GB)…" con el total en GB enteros.
  - Que los textos coinciden letra por letra con el anexo de la spec.

- [ ] **T4 — Columna `fueraDelPlan` y migración** [RF-20] **(modifica existente: `usuarios/usuario.entity.ts`, `base-de-datos/esquema.ts`)**
  `@Column({ type: 'boolean', default: false })` en `Usuario` y la migración `1794614400000-agregar-fuera-del-plan-a-usuarios`, al final de la lista de `esquema.ts`.
  Hecho cuando: un e2e corre `up` sobre la base de tests con las migraciones anteriores, verifica que una cuenta existente queda en `false` y que una nueva nace en `false`, y corre `down` sin errores.

- [ ] **T5 — `PlanModule` y utilidad de los e2e** [RF-1, RF-3] **(modifica existente: `app.module.ts`, `test/utilidades/aplicacion-de-tests.ts`)**
  `plan/plan.module.ts` y `plan/plan.service.ts` con `plan` e `isPremium` (sin `ensureApplied` todavía). `createTestApp` acepta `plan`, `espacioPdfGb` y `keepTables`, según el plan ("Configuración, demo y tests de la api").
  Hecho cuando: los e2e verifican que `createTestApp({ plan: 'basico' })` da `isPremium === false`, que sin opciones da `true` (lo de `.env.test`), que al cerrar la app `process.env.PLAN` vuelve a su valor anterior, y que con `keepTables: true` una cuenta creada antes sigue estando.

- [ ] **T6 — Ajuste de las cuentas al arrancar** [RF-3, RF-20, RF-25, plan D5]
  `PlanService.ensureApplied()` según el pseudocódigo del plan, llamado en `onApplicationBootstrap`.
  Hecho cuando: los e2e, con un primer arranque que carga las cuentas y un segundo con `keepTables: true`, verifican:
  - Con el plan Básico y 4 integrantes activos, quedan sin marca el principal y el de `creadoEn` más antigua, y los otros dos con la marca.
  - Que el principal más nuevo que los demás igual queda habilitado, con el más antiguo de los otros.
  - Que una cuenta desactivada no cuenta ni se marca, y que los clientes nunca se marcan.
  - Que con 2 o menos no marca a nadie, y que un segundo arranque en Básico no cambia las marcas.
  - Que con el plan Premium se quitan todas las marcas.
  - Que ningún otro dato de las cuentas cambia (comparación antes y después) y que no se cierra ninguna sesión.
  - Que si el ajuste falla (consulta simulada que rechaza), el arranque termina igual, se registra el error sin datos de cuentas y la siguiente llamada vuelve a intentarlo.

- [ ] **T7 — 503 mientras el ajuste está pendiente** [plan D5] **(modifica existente: `autenticacion/autenticacion.guard.ts`, `autenticacion/autenticacion.service.ts`, `autenticacion/autenticacion.module.ts`)**
  El guard de autenticación, el ingreso y la renovación esperan `ensureApplied()`. Si falla, responden 503 con el mensaje de T-17 (T1).
  Hecho cuando: los e2e, con `ensureApplied` simulado que falla, verifican que el ingreso, la renovación y una ruta del panel responden 503 sin crear sesión ni sumar un intento; que el sitio público sigue respondiendo; y que cuando el ajuste se completa, el ingreso funciona sin reiniciar la api.

- [ ] **T8 — Ingreso y sesión de una cuenta fuera del plan** [RF-21] **(modifica existente: `autenticacion/sesion-valida.ts`, `autenticacion/autenticacion.service.ts`)**
  Hecho cuando: los e2e verifican:
  - Que con la contraseña correcta el ingreso responde 403 T-6 y no crea sesión, también con cambio de contraseña pendiente.
  - Que con la contraseña incorrecta el mensaje es el genérico de la spec 001.
  - Que los intentos con T-6 cuentan para el bloqueo: después del límite, el siguiente responde el bloqueo de la spec 001.
  - Que una sesión abierta antes de la marca se rechaza en la siguiente acción con 401, que la renovación responde 401 T-6 y borra las cookies, y que el estado del sitio público responde "sin sesión".

- [ ] **T9 — `@SoloPremium()` y jurisprudencia** [RF-4, RF-8, RF-9, plan D6] **(modifica existente: `jurisprudencia/jurisprudencia.controller.ts`, `jurisprudencia/jurisprudencia.module.ts`)**
  `plan/plan.guard.ts` y `plan/solo-premium.decorator.ts`, aplicados a todo `JurisprudenciaController`.
  Hecho cuando:
  - Los tests unitarios del guard verifican 403 T-4 con el plan Básico y que pasa con el Premium.
  - Los e2e con el plan Básico verifican que cada endpoint de jurisprudencia (listado, detalle, búsqueda, palabras clave, sugerencias, carga, modificación, desactivación, reactivación y PDF) responde 403 T-4, también con ids inexistentes, y que la base no cambia.
  - Que un visitante sigue recibiendo 401 y un cliente 403 de rol, no T-4.
  - Que los fallos cargados con el plan Premium se ven igual después de pasar por el Básico y volver (tres arranques con `keepTables`).

- [ ] **T10 — Límite de integrantes** [RF-17 a RF-19, RNF de concurrencia, plan D7] **(modifica existente: `usuarios/usuarios.service.ts`, `usuarios/usuarios.module.ts`)**
  `PlanService.assertStaffSlot(manager)`, llamado en `create` y en `reactivate` (que pasa a usar una transacción) solo para integrantes.
  Hecho cuando: los e2e con el plan Básico verifican:
  - Con 1 habilitado se crea un abogado; con 2, un tercero responde 409 T-5 y no deja la cuenta.
  - Que con 2 habilitados se crea un cliente.
  - Que reactivar un integrante con 2 habilitados responde 409 T-5, y con 1 se reactiva.
  - Que las cuentas con cambio de contraseña pendiente cuentan, y las desactivadas y las fuera del plan no.
  - Que cambiar el rol de un habilitado entre administrador y abogado se permite.
  - Que dos altas simultáneas de integrantes con 1 habilitado dejan exactamente 2, y que un alta de cliente simultánea no espera el cerrojo.
  - Que con el plan Premium se crea un tercero.

- [ ] **T11 — Acciones sobre una cuenta fuera del plan** [RF-23, RF-24] **(modifica existente: `usuarios/permisos-gestion.ts`, `usuarios/usuarios.service.ts`)**
  `checkAccountAction` con la regla de RF-23. `deactivate` quita la marca en la misma actualización.
  Hecho cuando:
  - Los tests unitarios verifican cada acción sobre una cuenta con la marca: `view` y `deactivate` se permiten; modificar, cambiar el rol, restablecer la contraseña, liberar el email y transferir la condición de principal devuelven 409 T-14.
  - Los e2e verifican esas respuestas por la api sin cambios en la base; que desactivar una cuenta con la marca se la quita; y que desactivar a un habilitado no le quita la marca a nadie.

- [ ] **T12 — "Habilitar en el plan"** [RF-18, RF-23] **(modifica existente: `usuarios/usuarios.controller.ts`, `usuarios/usuarios.service.ts`, `usuarios/permisos-gestion.ts`)**
  `POST /api/panel/usuarios/:id/habilitar` y `enableInPlan(actor, id)`.
  Hecho cuando: los e2e verifican:
  - Que con 1 habilitado quita la marca, actualiza `modificadoPor/En`, conserva la contraseña y la cuenta puede ingresar.
  - Que con 2 habilitados responde 409 T-5; que sin la marca responde 409 "La cuenta no está fuera del plan".
  - Que un abogado y un cliente reciben 403, un visitante 401, y que en el modo demo responde la protección de la spec 009.
  - Que dos habilitaciones simultáneas con 1 habilitado dejan exactamente 2.

- [ ] **T13 — La marca en el listado y en la consulta de cuentas** [RF-22] **(modifica existente: `usuarios/usuario-detalle.ts`, `usuarios/dto/listar-usuarios.dto.ts`, `usuarios/usuarios.service.ts`)**
  `UsuarioDetalle.fueraDelPlan` y el filtro `fueraDelPlan=true`.
  Hecho cuando: los e2e verifican el campo en el listado y en el detalle, que el filtro devuelve solo las cuentas activas con la marca, que un valor distinto de `true` responde 400, y que los filtros de las specs anteriores siguen igual.

- [ ] **T14 — Integrantes fuera del plan en las causas** [RF-26] **(modifica existente: `causas/reglas-causas.ts`, `causas/causa-detalle.ts`, `causas/causas.service.ts`)**
  `IntegranteResumen.fueraDelPlan` y `checkMember` con la marca.
  Hecho cuando:
  - Los tests unitarios de `checkMember` verifican que rechaza con T-14 a un integrante con la marca que no estaba en ese lugar de la causa, y lo acepta si ya estaba.
  - Los e2e verifican el 409 T-14 al crear y al modificar una causa, que una causa donde ya figuraba se modifica sin quitarlo, y que su autoría y su nombre se siguen mostrando sin marca en causas y movimientos.

- [ ] **T15 — Subidas y quitados de PDF en el plan Básico** [RF-11, plan D8] **(modifica existente: `pdfs/formulario-con-pdf.interceptor.ts`, `pdfs/pdfs.service.ts`, `pdfs/pdfs.module.ts`)**
  Hecho cuando:
  - Los tests unitarios del interceptor verifican, con el plan Básico, que un `multipart/form-data` responde 403 T-4 con `Connection: close` sin leer el cuerpo ni llamar al handler, que un JSON con `quitarPdf` responde 403 T-4 y que un JSON sin `quitarPdf` pasa.
  - Los e2e verifican cargar un movimiento con PDF, adjuntar, reemplazar y quitar en un movimiento y en un fallo: 403 T-4, sin filas nuevas en `movimientos`, `pdfs` ni `movimiento_cambios`.
  - Que `PdfsService.create` llamado directamente con el plan Básico responde 403 T-4.
  - Que modificar un movimiento con JSON y sin `quitarPdf` funciona igual que hoy.

- [ ] **T16 — Respuestas y descarga del panel en el plan Básico** [RF-12, RF-16, plan D8] **(modifica existente: `movimientos/movimiento-detalle.ts`, `movimientos/movimientos.service.ts`, `movimientos/movimientos.controller.ts`, `movimientos/movimientos.module.ts`)**
  `toMovimientoDetalle` con `{ planPremium }` y `@SoloPremium()` en `GET /:movimientoId/pdf`.
  Hecho cuando:
  - Los tests unitarios verifican, con cada plan, `pdf`, `tienePdf` y los valores del campo `pdf` en `cambios` (`'plan-premium'` en Básico), y que los demás campos del cambio no se tocan.
  - Los e2e con el plan Básico verifican que el detalle tiene `pdf: null` y `tienePdf`, que el listado no trae otros datos del PDF, que ninguna respuesta del panel contiene el código, el tamaño ni el autor del PDF (búsqueda en el cuerpo), y que la descarga responde 403 T-4 con causa, movimiento o PDF inexistentes, igual que existiendo.

- [ ] **T17 — Portal en el plan Básico** [RF-13, RNF de seguridad] **(modifica existente: `movimientos/movimiento-detalle.ts`, `movimientos/visibilidad-cliente.service.ts`, `portal/portal.service.ts`, `portal/portal.module.ts`)**
  `toMovimientoCliente` y `findVisiblePdf` reciben el plan.
  Hecho cuando: los e2e con el plan Básico verifican, sobre un movimiento visible con su PDF visible, que `tienePdf` es `false` en el listado y en el detalle, que la descarga responde exactamente el mismo código y cuerpo que el 404 de la spec 010 (comparación byte a byte con un caso sin permiso), y que ninguna respuesta del portal contiene datos del PDF.

- [ ] **T18 — Conservación al pasar de plan** [RF-9, RF-14, RF-16]
  Sin código nuevo si T15 a T17 están bien.
  Hecho cuando: los e2e, con un primer arranque Premium que carga un movimiento visible con PDF visible y un fallo con PDF, un segundo Básico y un tercero Premium (con `keepTables`), verifican que en Básico se modifica el movimiento sin tocar el PDF, se anula, se restaura y se cambia su visibilidad; que el PDF sigue en `pdfs` con su contenido idéntico; y que en el tercer arranque el integrante descarga los dos PDF, el cliente descarga el del movimiento y el historial vuelve a mostrar el código y el tamaño.

- [ ] **T19 — Espacio para PDF** [RF-27, RF-28, RNF de concurrencia y de rendimiento, plan D7] **(modifica existente: `pdfs/pdfs.service.ts`)**
  `PlanService.assertPdfSpace(manager, tamano)`, llamado en `PdfsService.create` después del tope de la demo.
  Hecho cuando: los e2e con `espacioPdfGb: 1`, con filas de `pdfs` insertadas con un `tamano` grande y un contenido chico (plan, riesgo 4), verifican:
  - Que un PDF que supera el espacio responde 409 T-9 y no guarda nada; uno que llega justo al total se guarda.
  - Que un reemplazo descuenta el anterior, y que quitar un PDF libera el espacio en el momento.
  - Que se suman los PDF de movimientos anulados y de fallos desactivados.
  - Que dos subidas simultáneas cuando entra una sola guardan una sola.
  - Que con el espacio completo un archivo inválido responde el mensaje del archivo, y con `MODO_DEMO=true` y 4 PDF responde el tope de la demo, no T-9.
  - Que el registro de consultas de TypeORM, activado solo en el test, no muestra `contenido` en la suma.

- [ ] **T20 — `GET /api/panel/plan`** [RF-31, RF-32, plan D3]
  `PlanService.summary()` y `plan/plan.controller.ts`.
  Hecho cuando: los e2e verifican la respuesta con el plan Básico (habilitados y máximo 2) y con el Premium (bytes usados y total), para un administrador y un abogado; que un cliente recibe 403 y un visitante 401; y que la respuesta de `/api/sesion/usuario` no cambió.

- [ ] **T21 — Demo y regresión** [RF-5, RF-36]
  Hecho cuando: los e2e verifican que con `MODO_DEMO=true` y el plan Premium el tope de 4 PDF sigue respondiendo como en la spec 010, que el restablecimiento de la demo deja todas las cuentas sin la marca, y que toda la suite de las specs 001 a 010 pasa con `PLAN=premium`.

## web

- [ ] **T22 — Reglas del plan en la web** [RF-7, RF-29 a RF-31]
  `servicios/plan.ts`: `PlanInfo`, `getPlan()`, `formatUsedGb`, `formatTotalGb`, `isNearPdfLimit`, `planSummary`, `withPlanBadge` y los textos T-1 a T-16.
  Hecho cuando: los tests verifican `formatUsedGb` con 0 bytes ("0,0 GB"), 9,99 GB ("9,9 GB") y el total exacto ("10,0 GB"); `formatTotalGb` con 10 y 20 GB; `isNearPdfLimit` en el 89,9 % (no) y el 90 % (sí), también con 20 GB; `planSummary` en cada plan ("Plan Básico · 2 de 2 integrantes", "Plan Premium · PDF: 9,3 GB de 10 GB"); `withPlanBadge` en cada plan sin cambiar las demás opciones; y `getPlan` con el cliente simulado.

- [ ] **T23 — Datos de Bourder Web** [RF-34, RF-35] **(modifica existente: `componentes/PieSitio.tsx`, `servicios/contenido-sitio.ts`, `marca-unica.test.ts`)**
  `servicios/bourder-web.ts` con D9 y `bourderWhatsappUrl(mensaje, nombreEstudio)`.
  Hecho cuando: los tests verifican los dos mensajes T-13 con el nombre del estudio de la marca, la dirección de WhatsApp con el mensaje codificado, que el enlace del pie sale de `bourder-web.ts`, que `contenido-sitio.ts` ya no tiene `bourderWebUrl`, y que `marca-unica.test.ts` pasa con la marca de ejemplo, no revisa `bourder-web.ts` y sigue fallando con un dato de la marca escrito en otro archivo (archivo de prueba temporal).

- [ ] **T24 — `ContactoBourderWeb` y `AvisoPlan`** [RF-33, RNF de accesibilidad]
  Hecho cuando: los tests verifican que `ContactoBourderWeb` muestra "WhatsApp: +54 9 345 401-7104" y "bourderweb.com.ar", que los dos enlaces tienen `target="_blank"` y `rel="noopener noreferrer"` y los nombres accesibles de la spec, y que el WhatsApp lleva el mensaje del plan o el de espacio según la prop; y que `AvisoPlan` se anuncia como texto informativo (o como error con T-9) con el contacto debajo.

- [ ] **T25 — `ProveedorPlan`** [RF-7, RF-29, RF-31, RF-32] **(modifica existente: `componentes/DisenoPanel.tsx`)**
  `componentes/ProveedorPlan.tsx` con `usePlan()` y `refresh()`.
  Hecho cuando: los tests con el servicio simulado verifican que pide el plan al montarse, que mientras no llega `usePlan()` devuelve `null`, que si falla vuelve a pedirlo al navegar, que `refresh()` lo vuelve a pedir, y que `DisenoPanel` lo monta.

- [ ] **T26 — Menú con la etiqueta** [RF-7, RNF de accesibilidad] **(modifica existente: `servicios/menu-aplicacion.ts`, `componentes/MenuLateral.tsx`)**
  Hecho cuando: los tests verifican que con el plan Básico la opción "Jurisprudencia" sigue en su lugar con la etiqueta "Premium" y el nombre accesible "Jurisprudencia, plan Premium", y que con el Premium o sin plan todavía se ve como hoy.

- [ ] **T27 — `RutaPremium` y la pantalla T-2** [RF-7] **(modifica existente: `RutasAplicacion.tsx`)**
  `componentes/RutaPremium.tsx` y `PantallaPlanPremium`, envolviendo `/panel/jurisprudencia`, `/nuevo`, `/:id` y la modificación.
  Hecho cuando: los tests con servicios simulados verifican que con el plan Básico cada ruta muestra T-2 con el contacto y no llama a ningún servicio de jurisprudencia; que un `:id` que no es un entero positivo lleva al inicio del panel; que una dirección que no corresponde a ninguna pantalla se trata como inexistente; y que con el plan Premium se muestra la página de siempre.

- [ ] **T28 — El plan en el inicio del panel** [RF-29, RF-31] **(modifica existente: `paginas/PanelInicio.tsx`)**
  Hecho cuando: los tests verifican T-10 en cada plan para un administrador y para un abogado; T-8 con el contacto desde el 90 % y su ausencia debajo; la etiqueta en el acceso a Jurisprudencia con el plan Básico; y que `refresh()` se llama al entrar.

- [ ] **T29 — Reglas de los formularios con el plan** [RF-15, RF-28, RF-33] **(modifica existente: `servicios/formulario-movimiento.ts`, `servicios/archivo-pdf.ts`)**
  `pdfVisibilityNotice` con `planPremium`, e `isPdfFileError` e `isPdfSpaceError` con T-4 y T-9.
  Hecho cuando: los tests verifican que con el plan Básico `pdfVisibilityNotice` devuelve T-11 al dejar visible un movimiento con `tienePdf` y ninguno de los avisos de la spec 010; que sin PDF o sin dejarlo visible no devuelve nada; que con el Premium sigue como en la spec 010; que `isPdfFileError` reconoce T-4 y T-9; y que `isPdfSpaceError` reconoce solo T-9.

- [ ] **T30 — Formularios de movimiento y de fallo** [RF-10, RF-15, RF-28, RF-29, RF-33] **(modifica existente: `componentes/FormularioMovimiento.tsx`, `componentes/FormularioFallo.tsx`)**
  Hecho cuando: los tests con servicios simulados verifican:
  - Con el plan Básico, T-3 con el contacto en lugar de `CampoPdf`, en la carga, en la modificación y desde un escrito completado (`PanelEscrito`), con el resto del formulario igual.
  - T-11 al marcar visible un movimiento con PDF, sin pedir confirmación.
  - Con el Premium, T-8 junto a `CampoPdf` desde el 90 %, en movimientos y en fallos.
  - Que un rechazo T-9 descarta el archivo, conserva lo escrito y muestra el contacto; que un T-4 descarta el archivo y conserva lo escrito.
  - Que después de guardar con PDF se llama a `refresh()`.

- [ ] **T31 — Detalle, fila e historial del movimiento** [RF-12, RF-15, RF-16] **(modifica existente: `paginas/PanelMovimientoDetalle.tsx`, `componentes/FilaMovimiento.tsx`, `servicios/presentacion-movimientos.ts`)**
  Hecho cuando: los tests verifican que con el plan Básico restaurar un movimiento visible con PDF no pide confirmación y muestra T-11 después; que el detalle no muestra la sección del PDF; que la fila no muestra la leyenda "PDF"; que el historial muestra T-15 en los valores del PDF y el resto del cambio igual; y que con el Premium todo sigue como en la spec 010.

- [ ] **T32 — Direcciones de PDF en el plan Básico** [RF-7, RF-12] **(modifica existente: `paginas/PaginaPdf.tsx`, `paginas/PanelPdf.tsx`, `paginas/PanelInicio.tsx`)**
  Hecho cuando: los tests con servicios simulados verifican que un 403 T-4 en el PDF de un movimiento lleva al inicio del panel con T-4 como aviso (`role="status"`), que en el PDF de un fallo lleva a `/panel/jurisprudencia`, y que los 404 y 403 de la spec 010 siguen igual.

- [ ] **T33 — Servicios de cuentas** [RF-19, RF-22, RF-23] **(modifica existente: `servicios/usuarios.ts`, `servicios/acciones-cuenta.ts`, `servicios/formulario-cuenta.ts`)**
  Hecho cuando: los tests verifican `enableInPlan(id)` y el filtro `fueraDelPlan` con el cliente simulado; que las acciones de una cuenta con la marca son solo desactivar y "Habilitar en el plan"; y que con el plan Básico y 2 habilitados los roles de integrante quedan no disponibles, con cliente como rol inicial y el motivo T-5.

- [ ] **T34 — Pantallas de cuentas** [RF-19, RF-22, RF-23, RNF de accesibilidad] **(modifica existente: `paginas/PanelUsuarios.tsx`, `paginas/PanelUsuarioDetalle.tsx`, `paginas/PanelUsuarioNuevo.tsx`)**
  Hecho cuando: los tests con servicios simulados verifican:
  - En la lista, T-10, el estado T-7 en las filas con la marca y la opción "Fuera del plan" en el filtro, solo con el plan Básico.
  - En la consulta, T-7 y el botón T-16 con su nombre accesible; que al habilitar se actualiza la cuenta; y que un 409 T-5 se muestra como error.
  - En "Nueva cuenta", con 2 habilitados, las opciones de administrador y abogado con `disabled`, T-5 vinculado con `aria-describedby`, y que se puede crear un cliente.
  - Que con el plan Premium nada de esto aparece.

- [ ] **T35 — Selector de integrantes** [RF-26] **(modifica existente: `componentes/SelectorIntegrantes.tsx`)**
  Hecho cuando: los tests verifican que un integrante con la marca no aparece entre las opciones para agregar, que sigue mostrándose si ya figuraba en la causa, y que un 409 T-14 de la api se muestra como error.

- [ ] **T36 — T-6 en el ingreso y al cerrarse la sesión** [RF-21] **(modifica existente: `servicios/cliente-http.ts`, `componentes/ProveedorSesion.tsx`, `paginas/PaginaIngreso.tsx`)**
  Hecho cuando: los tests verifican que un 403 T-6 en el ingreso se muestra como error; que una renovación rechazada con T-6 llama a `onSessionClosed` con el mensaje; que `ProveedorSesion` lleva a la pantalla de ingreso con T-6 como aviso; y que una renovación rechazada por otro motivo sigue como en la spec 001.

- [ ] **T37 — Portal y persistencia** [RF-13, RF-32, RNF de persistencia]
  Hecho cuando: los tests verifican que ninguna pantalla del portal llama a `getPlan` ni muestra los textos T-1 a T-16; que con `tienePdf: false` no aparecen la leyenda ni las acciones del PDF; que el sitio público no cambia; y, con espías sobre `localStorage` y `sessionStorage`, que el plan no se guarda en el navegador.

## Cierre

- [ ] **T38 — Documentación** **(modifica existente: `README.md`, `api/.env.example`)**
  Los agregados de la sección "Documentación" del plan.
  Hecho cuando: el README explica en "Desarrollo" que `api/.env` y `api/.env.test` necesitan `PLAN` (y que sin ella la api y los tests no arrancan); tiene la sección "Planes" (qué incluye cada uno, cómo cambiar de plan en Easypanel, qué pasa con los integrantes al pasar al Básico, cómo dar más espacio verificando antes el disco y las copias, y que después de publicar hay que correr la migración o el ingreso responde 503); "Modo demo" indica `PLAN=premium`; y `api/.env.example` tiene las dos variables con su explicación.

- [ ] **T39 — Validación de la spec**
  Recorrer `spec.md` requisito por requisito con su test, correr la migración `up` y `down` sobre la base de tests y hacer la demo manual de los criterios de finalización, cambiando `PLAN` en `api/.env` de desarrollo (lo cambiás vos).
  Hecho cuando:
  - Cada RF y cada requisito no funcional tiene al menos un test en verde identificado, con los dos planes.
  - `pnpm test` y `pnpm lint` pasan.
  - La demo manual se completó sin errores, incluido el aviso del 90 % con `ESPACIO_PDF_GB=1`.
  - `validacion.md` deja anotados los avisos de despliegue: agregar `PLAN` en cada publicación de Easypanel antes de publicar esta versión, correr la migración después, y verificar el disco antes de dar más espacio.
  - La spec 011 pasa a "Terminada" en la hoja de ruta del README.
