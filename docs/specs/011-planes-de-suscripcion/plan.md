# Plan 011 — Planes de suscripción

Implementa `spec.md` de esta carpeta. Respeta `docs/constitution.md` y se apoya en lo construido en las specs anteriores: guards globales, sesión y límite de intentos (001), abogados de una causa (002), historial de cambios de los movimientos (003), portal (004), jurisprudencia (005), modo demo y archivo de marca (009) y PDF con su interceptor y su tope de la demo (010). Cada sección indica entre corchetes los RF que cubre.

No se agregan dependencias. Se agregan dos variables de entorno a la api (`PLAN` y `ESPACIO_PDF_GB`) y una columna a `usuarios`, con su migración.

## Decisiones principales

### D1. El plan es una variable de entorno de la api, `PLAN` [RF-1, RF-2, RF-36]
`PLAN` acepta exactamente `basico` o `premium`, en minúsculas. `validateEnvironment` la exige: si falta o tiene otro valor, la api no arranca y el error lo dice, como con las demás variables. Con `MODO_DEMO=true`, exige `PLAN=premium` (RF-36). La web no tiene variable propia: pregunta el plan a la api (D3). Así cambiar de plan es cambiar una variable en Easypanel y volver a desplegar la api, sin reconstruir la web en Hostinger.

*Alternativa descartada:* una tabla con el plan, cambiada con un comando de consola, como el administrador principal. Agrega una migración y un comando para un valor que cambia muy pocas veces, y la variable deja el plan junto al resto de la configuración de cada publicación.

*Alternativa descartada:* una variable `VITE_PLAN` en la web. La web y la api podrían quedar con planes distintos, y cambiar de plan exigiría reconstruir y volver a subir la web.

### D2. El espacio para PDF es otra variable, `ESPACIO_PDF_GB`, opcional [RF-27]
Es un entero de 1 a 1.000. Si falta, vale 10. Solo se valida con `PLAN=premium`: con el plan Básico se ignora, aunque sea inválida.

### D3. La web pregunta el plan con `GET /api/panel/plan`, solo para integrantes [RF-7, RF-19, RF-29, RF-31, RF-32]
El endpoint responde el plan y, según el plan, los integrantes habilitados o el espacio usado. Lleva `@Roles('admin', 'abogado')`, así que un cliente recibe 403 y un visitante 401: nunca reciben el plan (RF-32). El dato no se agrega a la respuesta de la sesión (`/api/sesion/usuario`), porque esa respuesta también la recibe un cliente.

### D4. La marca "fuera del plan" es una columna de `usuarios` [RF-20, RF-23 a RF-25]
`usuarios.fueraDelPlan` es un booleano, `false` por defecto. La spec pide que desactivar a un habilitado no habilite a nadie (RF-24), así que la marca no se puede calcular en cada acción: se guarda. La aplica `PlanService` al arrancar (D5).

### D5. El plan se aplica a las cuentas una vez por arranque, sin frenar el arranque [RF-3, RF-20, RF-25]
`PlanService.ensureApplied()` hace el ajuste una sola vez por proceso y guarda la promesa:
- Con el plan Premium, quita todas las marcas (RF-25).
- Con el plan Básico, si hay más de 2 integrantes habilitados, marca a los que exceden (RF-20).

Lo llama `onApplicationBootstrap`. Si falla, por ejemplo porque todavía no se corrió la migración (el README indica que las migraciones se corren a mano después de desplegar), registra el error y deja la promesa en blanco para reintentar. No frena el arranque: así la api queda viva y se puede correr la migración desde la consola del servicio. El guard de autenticación, el ingreso y la renovación vuelven a llamar a `ensureApplied()` antes de decidir. Mientras el ajuste no termine bien, responden 503 "El sistema se está actualizando. Probá de nuevo en unos minutos", para que nadie entre fuera del plan.

*Alternativa descartada:* hacerlo en la migración. La migración no conoce el plan, y el plan cambia sin que haya migraciones nuevas.

*Alternativa descartada:* que un error en el arranque frene la api. En Easypanel, el contenedor se reiniciaría en bucle y no se podría usar su consola para correr la migración.

### D6. Las rutas del plan Premium se cierran con un guard por controller, `@SoloPremium()` [RF-4, RF-8, RF-12]
`@SoloPremium()` aplica `UseGuards(PlanGuard)`. Los guards de controller corren después de los globales (autenticación, cambio pendiente y roles), así que un visitante sigue recibiendo 401 y un cliente 403, antes de que se mire el plan. Con el plan Básico, `PlanGuard` responde 403 con T-4. Se aplica a todo `JurisprudenciaController` y al `GET /:movimientoId/pdf` del panel.

*Alternativa descartada:* un guard global. Correría en un orden que depende del orden de los módulos y podría responder T-4 a un visitante antes que el 401.

### D7. Los límites se respetan con bloqueos de MySQL, como el tope de la demo [RF-18, RF-28, RNF de concurrencia]
- **Integrantes:** crear un integrante, reactivarlo y habilitarlo bloquean primero la fila del administrador principal (`SELECT id FROM usuarios WHERE esPrincipal = 1 FOR UPDATE`) y después cuentan, en la misma transacción. Como siempre hay un solo principal, esa fila sirve de cerrojo: la segunda operación simultánea espera y cuenta el integrante que creó la primera. No bloquea el alta de clientes.
- **Espacio:** `PdfsService.create` suma los tamaños con `SELECT COALESCE(SUM(tamano), 0) FROM pdfs FOR UPDATE`. En REPEATABLE READ, eso bloquea las filas y el hueco del final, igual que el tope de la demo (plan 010), así que una segunda subida espera y cuenta la primera. La lectura no trae `contenido`.

*Alternativa descartada:* bloquear todas las filas de integrantes con `FOR UPDATE`. Sin un índice que las separe, MySQL bloquearía la tabla entera y frenaría también el alta de clientes.

*Alternativa descartada:* un contador de espacio en una tabla aparte. Habría que mantenerlo al día en cada alta, reemplazo y quitado, y en el restablecimiento de la demo. La suma con bloqueo alcanza para unos pocos miles de PDF.

### D8. En el plan Básico, los PDF se cortan en tres lugares [RF-10 a RF-16]
- **Subidas y quitados:** `FormularioConPdfInterceptor`, antes de leer el cuerpo, responde 403 T-4 a un pedido `multipart/form-data` con el plan Básico, con `Connection: close` como en el 413 (plan 010). Con JSON, después de leer `datos`, responde 403 T-4 si trae `quitarPdf`. `PdfsService.create` lo vuelve a verificar, como segunda barrera.
- **Respuestas del panel:** `toMovimientoDetalle` recibe si el plan es Premium. Con el plan Básico, devuelve `pdf: null` y reemplaza los valores del campo `pdf` del historial por la marca `'plan-premium'`. `tienePdf` se sigue enviando, porque es lo único que necesita el aviso T-11 (RF-12).
- **Portal:** `toMovimientoCliente` y `findVisiblePdf` reciben el plan. Con el plan Básico, `tienePdf` es `false` y `findVisiblePdf` devuelve `null`, así que la descarga responde el 404 único de la spec 010 (RF-13).

### D9. Los datos de Bourder Web van en `web/src/servicios/bourder-web.ts` [RF-33 a RF-35]
El archivo tiene la dirección del sitio, el WhatsApp en sus dos formas (`+54 9 345 401-7104` y `5493454017104`) y los dos mensajes T-13. `PieSitio` toma de ahí el enlace "Diseñado por", y `contenido-sitio.ts` pierde `bourderWebUrl`. `marca-unica.test.ts` suma ese archivo a los exceptuados.

## Arquitectura

### Módulos de NestJS (`api/src/`)

| Carpeta o archivo | Contenido | RF |
|---|---|---|
| `plan/` (nuevo) | Ver detalle debajo. | RF-1 a RF-4, RF-17 a RF-20, RF-25, RF-27 a RF-31 |
| `configuracion/validar-entorno.ts` | `PLAN`, `ESPACIO_PDF_GB` y la regla del modo demo (D1, D2). | RF-2, RF-27, RF-36 |
| `migraciones/` | `1794614400000-agregar-fuera-del-plan-a-usuarios`. | RF-20 |
| `usuarios/` | Columna `fueraDelPlan`, límite al crear y reactivar, "Habilitar en el plan", rechazo T-14, filtro y dato en las respuestas. | RF-17 a RF-25 |
| `autenticacion/` | Ingreso, renovación y sesión válida con la marca. | RF-21 |
| `causas/` | Un integrante fuera del plan no se puede agregar a una causa. | RF-26 |
| `movimientos/` | Respuestas del panel según el plan. `@SoloPremium()` en la descarga del panel. | RF-12, RF-14, RF-16 |
| `jurisprudencia/` | `@SoloPremium()` en todo el controller. | RF-7 a RF-9 |
| `pdfs/` | Corte en el interceptor, segunda barrera y espacio en `create`. | RF-11, RF-27, RF-28 |
| `portal/` | `tienePdf` y descarga según el plan. | RF-13 |
| `app.module.ts` | Importa `PlanModule`. | — |

Contenido de `plan/`:
- `reglas-plan.ts`: reglas puras, sin base.
  - Constantes: `MAX_STAFF_BASICO = 2`, `BYTES_PER_GB = 1_073_741_824`, `DEFAULT_PDF_SPACE_GB = 10`, `NEAR_LIMIT_RATIO = 0.9`.
  - Mensajes: `PLAN_MESSAGES`, con T-4, T-5, T-6, T-9 y T-14 y el 503 de D5.
  - `selectOutsidePlan(integrantes)`: recibe los integrantes habilitados (`id`, `esPrincipal`, `creadoEn`) y devuelve los ids a marcar. Ordena por principal primero, después `creadoEn` y después `id`, y conserva los 2 primeros.
  - `exceedsPdfSpace(usado, nuevo, total)`: `usado + nuevo > total`.
- `plan.service.ts`: el plan vigente (`plan`, `isPremium`), `ensureApplied()` (D5), `assertStaffSlot(manager)` (D7), `assertPdfSpace(manager, tamano)` (D7) y `summary()` para el endpoint.
- `plan.guard.ts` y `solo-premium.decorator.ts`: D6.
- `plan.controller.ts`: `GET /api/panel/plan` (D3).
- `plan.module.ts`: registra el repositorio de `Usuario` y de `Pdf` y exporta `PlanService` y `PlanGuard`. Lo importan `AuthenticationModule`, `UsersModule`, `CausasModule`, `MovimientosModule`, `JurisprudenciaModule`, `PdfsModule` y `PortalModule`. No importa ninguno de ellos, así que no hay dependencias circulares.

Los controllers solo validan y delegan (principio 3).

### Carpetas de `web/src/`

| Carpeta o archivo | Contenido | RF |
|---|---|---|
| `servicios/plan.ts` (nuevo) | Tipo `PlanInfo`, `getPlan()`, `formatUsedGb(bytes)` (un decimal, hacia abajo, con coma), `formatTotalGb(bytes)`, `isNearPdfLimit(info)`, `planSummary(info)` (T-10), `withPlanBadge(menu, plan)` (T-1) y los textos T-1 a T-16. | RF-7, RF-19, RF-29 a RF-31 |
| `servicios/bourder-web.ts` (nuevo) | D9. `bourderWhatsappUrl(mensaje, nombreEstudio)` reutiliza `whatsappUrl` de `datos-estudio.ts`. | RF-33 a RF-35 |
| `componentes/ProveedorPlan.tsx` (nuevo) | Pide el plan al entrar al panel y lo expone con `usePlan()`, con `refresh()` para después de guardar un PDF. Solo se monta en `DisenoPanel`. | RF-7, RF-29, RF-31 |
| `componentes/AvisoPlan.tsx` y `ContactoBourderWeb.tsx` (nuevos) | El texto de un aviso con el contacto T-12 y el mensaje T-13 que corresponde. | RF-33 |
| `componentes/RutaPremium.tsx` (nuevo) | Envuelve las rutas de la jurisprudencia. Con el plan Básico muestra `PantallaPlanPremium` (T-2). Un `:id` que no es un entero positivo lleva al inicio del panel (spec 007, RF-10). | RF-7 |
| `servicios/menu-aplicacion.ts` y `MenuLateral.tsx` | La etiqueta T-1 y el nombre accesible "Jurisprudencia, plan Premium". | RF-7 |
| `paginas/PanelInicio.tsx` | T-10, T-8 y la etiqueta en el acceso a Jurisprudencia. | RF-29, RF-31 |
| `servicios/formulario-movimiento.ts` y `FormularioMovimiento.tsx` | T-3 en lugar de `CampoPdf` con el plan Básico, también desde un escrito. T-8 junto a `CampoPdf` con el Premium. `pdfVisibilityNotice` recibe el plan y elige T-11. | RF-10, RF-15, RF-29 |
| `FormularioFallo.tsx` | T-8 junto a `CampoPdf`. | RF-29 |
| `servicios/archivo-pdf.ts` | `isPdfFileError` suma T-4 y T-9: el formulario descarta el archivo (spec 010, RF-11). `isPdfSpaceError` muestra el contacto debajo de T-9. | RF-28, RF-33 |
| `paginas/PanelMovimientoDetalle.tsx` | Con el plan Básico, restaurar no pide la confirmación de la spec 010 (RF-19) y muestra T-11 después. | RF-15 |
| `FilaMovimiento.tsx` | Sin la leyenda "PDF" con el plan Básico. | RF-12 |
| `servicios/presentacion-movimientos.ts` | La marca `'plan-premium'` se muestra como T-15. | RF-16 |
| `paginas/PanelPdf.tsx` y `PanelFalloPdf.tsx` | Un 403 con T-4 lleva al inicio del panel con T-4 (RF-12). El PDF de un fallo con el plan Básico lleva a `/panel/jurisprudencia` (T-2). | RF-7, RF-12 |
| `servicios/usuarios.ts`, `acciones-cuenta.ts` y `formulario-cuenta.ts` | `fueraDelPlan`, filtro, `enableInPlan(id)`, acciones permitidas y roles no disponibles. | RF-19, RF-22, RF-23 |
| `paginas/PanelUsuarios.tsx`, `PanelUsuarioDetalle.tsx` y `PanelUsuarioNuevo.tsx` | T-10, T-7, el filtro, T-16 y T-5 junto al rol. | RF-19, RF-22, RF-23 |
| `SelectorIntegrantes.tsx` | No ofrece a los integrantes fuera del plan. | RF-26 |
| `servicios/cliente-http.ts` y `ProveedorSesion.tsx` | `onSessionClosed` pasa el mensaje de la renovación rechazada. Si es T-6, la pantalla de ingreso lo muestra. | RF-21 |
| `PieSitio.tsx`, `contenido-sitio.ts` y `marca-unica.test.ts` | D9. | RF-34, RF-35 |

Nada en `src/servicios/` importa React (principio 3).

### Archivos existentes que se modifican
- api: `app.module.ts`, `configuracion/validar-entorno.ts`, `base-de-datos/esquema.ts` (la migración), `.env.example`.
- api, usuarios: `usuario.entity.ts`, `usuarios.service.ts`, `usuarios.controller.ts`, `permisos-gestion.ts`, `usuario-detalle.ts`, `dto/listar-usuarios.dto.ts`, `usuarios.module.ts`.
- api, autenticación: `autenticacion.service.ts`, `sesion-valida.ts`, `autenticacion.guard.ts`, `autenticacion.module.ts`.
- api, causas: `reglas-causas.ts`, `causa-detalle.ts`, `causas.module.ts`.
- api, movimientos: `movimiento-detalle.ts`, `movimientos.service.ts`, `movimientos.controller.ts`, `visibilidad-cliente.service.ts`, `movimientos.module.ts`.
- api: `jurisprudencia/jurisprudencia.controller.ts` y su módulo; `pdfs/formulario-con-pdf.interceptor.ts`, `pdfs/pdfs.service.ts` y su módulo; `portal/portal.service.ts` y su módulo.
- api: las utilidades de los e2e (`test/utilidades/`), para levantar la api con otro plan.
- web: los archivos de las tablas de arriba, con sus tests.
- `README.md` (ver "Documentación").

`api/.env` y `api/.env.test` los completás vos a mano (ver "Documentación"). Ninguna tarea los toca.

## Entidades de TypeORM y migración [RF-20]
- `usuarios.fueraDelPlan`: `boolean NOT NULL DEFAULT false`. En la entidad, `@Column({ type: 'boolean', default: false })`. Las cuentas existentes y las de los datos de muestra quedan en `false` sin tocar el SQL de la demo.
- Sin índice: las consultas que lo usan (contar integrantes, marcar) recorren solo las cuentas de integrantes, que son pocas.
- La migración `1794614400000-agregar-fuera-del-plan-a-usuarios` agrega la columna. Es reversible: `down` la quita. `synchronize` sigue en `false`.

Invariantes, que mantiene `PlanService`:
- El principal nunca tiene la marca.
- Solo una cuenta activa de integrante puede tenerla.
- Con el plan Premium, ninguna la tiene después de `ensureApplied()`.

## Contrato de la API
Errores con el formato de siempre (`statusCode`, `message`, en español).

### Mensajes del plan
| Caso | Código | Mensaje |
|---|---|---|
| Función del plan Premium con el plan Básico | 403 | T-4 |
| Límite de integrantes | 409 | T-5 |
| Ingreso o renovación de una cuenta fuera del plan | 403 en el ingreso, 401 en la renovación | T-6 |
| Espacio para PDF completo | 409 | T-9 |
| Acción no permitida sobre una cuenta fuera del plan, o agregarla a una causa | 409 | T-14 |
| Ajuste del plan pendiente (D5) | 503 | "El sistema se está actualizando. Probá de nuevo en unos minutos" |

### Plan — `GET /api/panel/plan` (roles `admin` y `abogado`) [RF-29, RF-31, D3]
```
{ plan: 'basico', integrantes: { habilitados: number, maximo: 2 }, espacioPdf: null }
{ plan: 'premium', integrantes: null, espacioPdf: { usadoBytes: number, totalBytes: number } }
```

### Usuarios — `/api/panel/usuarios` [RF-17 a RF-25]
| Método y ruta | Cambio | RF |
|---|---|---|
| `GET /` | Acepta `fueraDelPlan=true`, que filtra las cuentas activas con la marca. | RF-22 |
| `GET /:id` y el listado | `UsuarioDetalle` suma `fueraDelPlan: boolean`. | RF-22 |
| `POST /` | Con el plan Básico y rol de integrante, `assertStaffSlot` (D7). El alta de clientes no cambia. | RF-18, RF-19 |
| `POST /:id/reactivar` | Igual, si es una cuenta de integrante. | RF-18 |
| `POST /:id/habilitar` (nuevo, `admin`) | Cuenta con la marca: `assertStaffSlot` y quita la marca. Sin la marca: 409 "La cuenta no está fuera del plan". No toca la contraseña ni las sesiones. | RF-23 |
| `POST /:id/desactivar` | Con la marca, la quita en la misma actualización. | RF-23 |
| `PATCH /:id`, `restablecer-contrasena`, `liberar-email` y `transferir-principal` | Con la marca en la cuenta destino: 409 T-14. | RF-23 |

### Sesión — `/api/sesion` [RF-21]
- `POST /ingresar`: con la contraseña correcta y la cuenta activa con la marca, 403 T-6, sin crear sesión. El limitador ya cuenta todos los intentos, exitosos o no (plan 001), así que este también cuenta.
- `POST /renovar`: con la marca, 401 T-6, y borra las cookies como en cualquier renovación rechazada.
- `findValidSession` exige además `!usuario.fueraDelPlan`. Así el guard rechaza la siguiente acción y el estado del sitio público responde "sin sesión".

### Causas — `GET /api/panel/causas/integrantes` [RF-26]
`IntegranteResumen` suma `fueraDelPlan`. `checkMember` (`reglas-causas.ts`) rechaza con T-14 a un integrante con la marca que no estaba ya en ese lugar de la causa, igual que hoy con un desactivado.

### Jurisprudencia — `/api/panel/jurisprudencia` [RF-8]
`@SoloPremium()` en el controller: con el plan Básico, todo endpoint responde 403 T-4 sin consultar la base.

### Movimientos — `/api/panel/causas/:causaId/movimientos` [RF-11, RF-12, RF-16]
| Método y ruta | Con el plan Básico |
|---|---|
| `GET /` | Sin cambios: `tienePdf` sigue (D8). |
| `GET /:movimientoId` | `pdf: null`. En `cambios`, los valores `anterior` y `nuevo` del campo `pdf` valen `'plan-premium'`. |
| `GET /:movimientoId/pdf` | `@SoloPremium()`: 403 T-4, sin consultar la causa, el movimiento ni el PDF. |
| `POST /` y `PATCH /:movimientoId` | Con archivo o con `quitarPdf`: 403 T-4 (D8). |

### Portal [RF-13]
Con el plan Básico, `MovimientoCliente.tienePdf` siempre es `false`, y `GET /:causaId/movimientos/:movimientoId/pdf` responde el 404 único "No existe ese PDF" (spec 010, RF-37).

## Reglas de negocio

### `PlanService.ensureApplied()`, en pseudocódigo [RF-20, RF-25, D5]
```
ensureApplied():
  si ya terminó bien → nada
  si hay uno en curso → esperarlo
  transacción:
    si plan es premium:
      UPDATE usuarios SET fueraDelPlan = 0 WHERE fueraDelPlan = 1
    si no:
      bloquear la fila del principal (FOR UPDATE)
      habilitados = integrantes activos sin la marca (id, esPrincipal, creadoEn)
      ids = selectOutsidePlan(habilitados)          # vacío si son 2 o menos
      si ids no está vacío: UPDATE usuarios SET fueraDelPlan = 1 WHERE id IN (ids)
  si falla: registrar el error (sin datos de cuentas), olvidar la promesa y relanzar
```
No cierra sesiones: la siguiente acción de una cuenta marcada la rechaza el guard (RF-21).

### Integrantes [RF-17 a RF-19, RF-23, RF-24]
- `assertStaffSlot(manager)`: solo con el plan Básico. Bloquea la fila del principal y cuenta `rol IN ('admin','abogado') AND activo = 1 AND fueraDelPlan = 0`. Con 2 o más, 409 T-5.
- `create` y `reactivate` llaman a `assertStaffSlot` dentro de su transacción, solo para integrantes. `reactivate` pasa a usar una transacción para eso.
- `enableInPlan(actor, id)`: `checkAccountAction(actor, target, 'enableInPlan')` (solo `admin`), demo (`assertModifiable`), y en una transacción `assertStaffSlot`, después `fueraDelPlan = false` y `modificadoPor/En`.
- `permisos-gestion.ts`: `checkAccountAction` suma la regla de RF-23. Si el destino tiene la marca, solo se permiten `view`, `deactivate` y `enableInPlan`; el resto devuelve 409 T-14. `transferPrincipal` también se rechaza si el destino tiene la marca (caso límite de la spec).
- Desactivar a un habilitado no llama a nada del plan (RF-24).

### Espacio para PDF [RF-27, RF-28]
`PdfsService.create(manager, contenido, actor)`:
1. Si el plan es Básico: 403 T-4 (segunda barrera, D8).
2. Si el modo demo está encendido: el tope de 4 de la spec 010, como hoy.
3. Si el plan es Premium: `assertPdfSpace(manager, contenido.length)` (D7). Si se supera, 409 T-9.
4. Inserta, como hoy.

`validatePdfContent` corre antes de la transacción (plan 010), así que el orden de los mensajes de RF-28 sale solo: primero el archivo, después la demo y por último el espacio. En un reemplazo, el service ya borra el PDF anterior antes de llamar a `create` (plan 010), así que la suma no lo cuenta (RF-28).

### Historial con el plan Básico [RF-16]
`toMovimientoDetalle(movimiento, causaActiva, { planPremium })` reemplaza en cada cambio los valores `anterior` y `nuevo` del campo `pdf` por `'plan-premium'`. Lo guardado en `movimiento_cambios` no cambia.

## Frontend

### Plan en el panel [RF-7, RF-29, RF-31, RF-32]
- `ProveedorPlan` va dentro de `DisenoPanel`. Ninguna pantalla del portal lo monta ni pide el plan (RF-32).
- Mientras el plan no llegó, el menú se muestra sin la etiqueta y los formularios sin los avisos. Si el pedido falla, se reintenta al navegar. La api decide de todos modos (RF-4).
- `refresh()` se llama al entrar al inicio y después de guardar un formulario con PDF, para que el espacio usado esté al día.

### Pantallas
- **Menú** [RF-7]: `withPlanBadge` suma `badge: 'Premium'` a la opción de Jurisprudencia con el plan Básico. `MenuLateral` muestra la etiqueta y usa "Jurisprudencia, plan Premium" como nombre accesible.
- **`RutaPremium`** [RF-7]: envuelve `/panel/jurisprudencia`, `/nuevo` y `/:id`. Con el plan Básico muestra `PantallaPlanPremium` (T-2 con `AvisoPlan`) y no monta la página de la jurisprudencia, así que no se hace ningún pedido.
- **Inicio** [RF-29, RF-31]: debajo del saludo, `planSummary(info)` (T-10) y, si `isNearPdfLimit`, T-8.
- **Formulario de movimiento** [RF-10, RF-15, RF-29]: con el plan Básico, `AvisoPlan` con T-3 en lugar de `CampoPdf`. Como `PanelEscrito` usa el mismo `FormularioMovimiento` (spec 006, RF-54), queda cubierto. `pdfVisibilityNotice({ ..., planPremium })` devuelve T-11 con el plan Básico si el movimiento queda visible y `tienePdf`, y ninguno de los avisos de la spec 010.
- **Restaurar** [RF-15]: con el plan Básico, `PanelMovimientoDetalle` restaura sin la confirmación de la spec 010 (RF-19). Si el movimiento es visible y `tienePdf`, muestra T-11 después.
- **Cuentas** [RF-19, RF-22, RF-23]:
  - En `PanelUsuarios`, para administradores con el plan Básico, el contador T-10, el estado T-7 en cada fila con la marca y la opción "Fuera del plan" en el filtro de estado.
  - En `PanelUsuarioDetalle`, el estado T-7 y el botón T-16. `acciones-cuenta.ts` deja solo desactivar y habilitar para una cuenta con la marca.
  - En `PanelUsuarioNuevo`, con 2 habilitados, las opciones de administrador y abogado van con `disabled`, el rol inicial es cliente y T-5 aparece junto al campo, vinculado con `aria-describedby`.
- **Ingreso** [RF-21]: el 403 T-6 se muestra como cualquier error del ingreso. Si la sesión se cierra por la marca, `ProveedorSesion` pasa T-6 como aviso a la pantalla de ingreso, con `endSession`.

## Configuración, demo y tests de la api
- `validateEnvironment` lee `PLAN` (obligatoria, `basico` o `premium`) y `ESPACIO_PDF_GB` (opcional, entero de 1 a 1.000, solo con `premium`), y con `MODO_DEMO=true` exige `premium`. `Environment` suma `PLAN: Plan` y `ESPACIO_PDF_BYTES: number`.
- Los comandos de consola (`demo:restablecer`, `demo:marcar`, administrador principal) validan el mismo entorno, así que también necesitan `PLAN`. En Easypanel ya la tienen, porque corren en el contenedor del servicio.
- **Demo:** con `PLAN=premium`, nada cambia. El restablecimiento vacía `usuarios` y la vuelve a cargar con `fueraDelPlan = 0` por defecto.
- **e2e:** la utilidad de `test/utilidades/` que levanta la api acepta un plan (`crearAplicacion({ plan: 'basico' })`), que fija `process.env.PLAN` antes de construirla y lo restituye al terminar, como hace hoy `proteccion-demo.e2e-spec.ts` con `MODO_DEMO`. Así los tests del plan Básico no dependen de `.env.test`, que queda con `PLAN=premium`.

## Dependencias nuevas
Ninguna. Los bloqueos usan `FOR UPDATE` de MySQL (D7). Los enlaces de WhatsApp reutilizan `whatsappUrl` (spec 007).

## Otras decisiones técnicas
- **403 para T-4 y 409 para T-5, T-9 y T-14:** T-4 niega una función, y los demás chocan con el estado de los datos, que puede cambiar. *Descartada:* 402 Payment Required, que el navegador y los intermediarios tratan de forma poco previsible.
- **El historial con una marca y no con los valores borrados:** `'plan-premium'` le dice a la web qué mostrar sin mandar ningún dato del PDF (RF-16). *Descartada:* quitar el cambio del PDF del historial, que dejaría cambios vacíos y falsearía el registro.
- **`tienePdf` en el panel con el plan Básico:** es el único dato que pide RF-12 para el aviso T-11. *Descartada:* un endpoint aparte que pregunte si el movimiento tiene PDF al marcarlo visible, que exige un pedido más y un estado más en el formulario.
- **El plan no viaja en la sesión:** ver D3.
- **T-6 en la web por comparación de texto:** la web ya replica los mensajes de la api que necesita reconocer (`archivo-pdf.ts`, plan 010). *Descartada:* un campo extra en el cuerpo del error, que el filtro global de errores no conserva.

## Estrategia de tests

### api — unitarios (Vitest)
- `validar-entorno.ts` [RF-2, RF-27, RF-36]: sin `PLAN`, con `Premium`, con `gratis`; `ESPACIO_PDF_GB` con 0, 1, 1.000, 1.001, 10,5 y "diez" en cada plan; `MODO_DEMO=true` con `basico`; el valor por defecto de 10 GB en bytes.
- `reglas-plan.ts` [RF-20, RF-28]: `selectOutsidePlan` con 2, 3 y 4 integrantes, con el principal como el más nuevo, con dos de la misma `creadoEn` y con una reactivada; `exceedsPdfSpace` con justo el total, un byte más y un reemplazo.
- `permisos-gestion.ts` [RF-23]: cada acción sobre una cuenta con la marca.
- `reglas-causas.ts` [RF-26]: `checkMember` con la marca, nuevo y ya asignado.
- `movimiento-detalle.ts` [RF-12, RF-13, RF-16]: con cada plan, `pdf`, `cambios` y `tienePdf` del panel y del cliente.
- `PlanGuard` [RF-4, RF-8]: 403 T-4 con el plan Básico y pasa con el Premium.
- `FormularioConPdfInterceptor` [RF-11]: con el plan Básico, `multipart` responde 403 sin leer el cuerpo, y `quitarPdf` también.

### api — e2e (Vitest + Supertest, base de tests)
- **Arranque** [RF-20, RF-25]: con el plan Básico y 4 integrantes activos, quedan habilitados el principal y el más antiguo; con el Premium se quitan las marcas. Con la columna inexistente, el arranque no falla y el ingreso responde 503 hasta que el ajuste se completa.
- **Jurisprudencia** [RF-8, RF-9]: con el plan Básico, cada endpoint responde 403 T-4 y la base no cambia; con el Premium, los fallos siguen iguales.
- **PDF con el plan Básico** [RF-11 a RF-14, RF-16]: subir, reemplazar y quitar responden 403 sin guardar nada; el detalle tiene `pdf: null` y el historial `'plan-premium'`; la descarga del panel responde 403 T-4 exista o no el PDF; modificar, anular y restaurar conservan el PDF; con el Premium vuelve a verse.
- **Portal con el plan Básico** [RF-13]: `tienePdf` es `false` y la descarga responde exactamente el mismo 404 que en la spec 010.
- **Integrantes** [RF-17 a RF-19]: el límite al crear, reactivar y habilitar; dos altas simultáneas con 1 habilitado dejan 2; con 2 habilitados se crea un cliente; el cambio de rol se permite.
- **Fuera del plan** [RF-21 a RF-24]: ingreso con contraseña correcta (403 T-6) e incorrecta (mensaje genérico); el intento cuenta para el bloqueo; una sesión abierta se rechaza en la siguiente acción y la renovación responde T-6; solo se permiten consultar, desactivar y habilitar; desactivar a un habilitado no habilita a nadie; habilitar conserva la contraseña.
- **Causas** [RF-26]: agregar a una causa a un integrante con la marca responde 409 T-14; donde ya estaba, sigue.
- **Espacio** [RF-27, RF-28]: con `ESPACIO_PDF_GB=1` y PDF de prueba que llenan el espacio (insertados con tamaños grandes en la base, sin subir 1 GB real), el rechazo T-9, el reemplazo que descuenta el anterior, el quitado que libera, dos subidas simultáneas y el orden de los mensajes con un archivo inválido.
- **Plan** [RF-31, RF-32]: `GET /api/panel/plan` con cada plan para administrador y abogado; 403 para un cliente y 401 sin sesión.
- **Demo** [RF-36]: con `MODO_DEMO=true` y el plan Premium, el tope de 4 sigue.
- **Migración**: `up` sobre la base con las migraciones anteriores y `down` sin errores.
- **Regresión**: toda la suite de las specs 001 a 010 sigue en verde con `PLAN=premium`.

### web — Vitest
- `plan.ts` [RF-29 a RF-31]: `formatUsedGb` con 0 ("0,0 GB"), 9,99 GB ("9,9 GB") y el total exacto; `formatTotalGb`; `isNearPdfLimit` en el 89,9 % y el 90 %; `planSummary` en cada plan; `withPlanBadge`.
- `bourder-web.ts` [RF-33]: los dos mensajes, con el nombre del estudio de la marca.
- `marca-unica.test.ts` [RF-35]: exceptúa `bourder-web.ts`, sigue fallando con un dato de la marca en otro archivo, y pasa con la marca de ejemplo.
- `MenuLateral` y `PanelInicio` [RF-7, RF-29, RF-31]: la etiqueta y su nombre accesible, T-10 para administrador y abogado, y T-8.
- `RutaPremium` [RF-7]: T-2 en cada ruta con el plan Básico, sin pedir nada a la api; un id inválido lleva al inicio; con el Premium, la página.
- `FormularioMovimiento` [RF-10, RF-15, RF-29]: T-3 en lugar del PDF, también desde un escrito; T-11 y la ausencia de los avisos de la spec 010; T-8 con el Premium.
- `PanelMovimientoDetalle` [RF-15]: restaurar con el plan Básico sin confirmación y con T-11.
- `HistorialCambios` y `presentacion-movimientos.ts` [RF-16]: T-15.
- `FilaMovimiento` [RF-12]: sin la leyenda con el plan Básico.
- `PanelUsuarios`, `PanelUsuarioDetalle` y `PanelUsuarioNuevo` [RF-19, RF-22, RF-23]: el contador, T-7, el filtro, las acciones permitidas, T-16, y los roles no disponibles con T-5.
- `SelectorIntegrantes` [RF-26]: no ofrece cuentas con la marca.
- `ProveedorSesion` y `PaginaIngreso` [RF-21]: T-6 al ingresar y como aviso al cerrarse la sesión.
- `ContactoBourderWeb` [RF-33]: los dos enlaces con `target="_blank" rel="noopener noreferrer"`, sus nombres accesibles y el mensaje de cada aviso.
- `archivo-pdf.ts` [RF-28]: T-4 y T-9 descartan el archivo.
- Portal [RF-32]: ninguna pantalla del portal pide el plan ni muestra sus textos.

### Lo que se verifica a mano (validación)
La demo manual de la spec, con una base de desarrollo y cambiando `PLAN` en `api/.env`. Para el aviso del 90 %, con `ESPACIO_PDF_GB=1` y PDF reales hasta pasar 0,9 GB, o insertando filas grandes en la base de desarrollo.

## Documentación
- `README.md`, "Hoja de ruta": la 011 pasa a "Terminada" al cerrar la validación.
- `README.md`, "Desarrollo": `PLAN` y `ESPACIO_PDF_GB` en `api/.env` y `api/.env.test` (`PLAN=premium` en los dos), y el aviso de que sin `PLAN` la api y los tests no arrancan.
- `README.md`, nueva sección "Planes": qué incluye cada uno, cómo cambiar de plan en Easypanel (variable y nuevo despliegue), qué pasa con los integrantes al pasar al Básico, cómo dar más espacio y que antes hay que verificar el disco y las copias de seguridad.
- `README.md`, "Modo demo": la demo lleva `PLAN=premium`.
- `api/.env.example`: las dos variables, con su explicación.

## Cobertura de RF

| RF | Dónde se implementa | Test |
|---|---|---|
| RF-1, RF-2 | `validateEnvironment`, D1 | Unitario |
| RF-3 | `ensureApplied` (D5), sin cerrar sesiones | e2e de arranque |
| RF-4 | Guards, services e interceptor | e2e de cada sección |
| RF-5, RF-6 | `@SoloPremium`, D8, `assertStaffSlot` | e2e de regresión y de cada límite |
| RF-7 | `withPlanBadge`, `MenuLateral`, `RutaPremium` | Vitest |
| RF-8, RF-9 | `@SoloPremium` en `JurisprudenciaController` | Unitario del guard, e2e |
| RF-10 | `FormularioMovimiento` con `AvisoPlan` | Vitest |
| RF-11 | Interceptor y `PdfsService.create` | Unitario, e2e |
| RF-12 | `toMovimientoDetalle`, `@SoloPremium` en la descarga, `FilaMovimiento`, `PanelPdf` | Unitario, e2e, Vitest |
| RF-13 | `toMovimientoCliente`, `findVisiblePdf` | Unitario, e2e de portal |
| RF-14 | Sin cambios en el borrado de PDF | e2e |
| RF-15 | `pdfVisibilityNotice`, `PanelMovimientoDetalle` | Vitest |
| RF-16 | `'plan-premium'` en `toMovimientoDetalle`, `presentacion-movimientos.ts` | Unitario, Vitest |
| RF-17 a RF-19 | `assertStaffSlot` (D7), `PanelUsuarioNuevo`, `PanelUsuarios` | e2e de integrantes, Vitest |
| RF-20 | `selectOutsidePlan`, `ensureApplied`, columna `fueraDelPlan` | Unitario, e2e de arranque |
| RF-21 | Ingreso, renovación, `findValidSession`, `ProveedorSesion` | e2e, Vitest |
| RF-22 | `UsuarioDetalle.fueraDelPlan`, filtro, `PanelUsuarios` | e2e, Vitest |
| RF-23, RF-24 | `checkAccountAction`, `enableInPlan`, `deactivate` | Unitario, e2e, Vitest |
| RF-25 | `ensureApplied` con el plan Premium | e2e de arranque |
| RF-26 | `checkMember`, `IntegranteResumen`, `SelectorIntegrantes` | Unitario, e2e, Vitest |
| RF-27, RF-28 | `ESPACIO_PDF_GB`, `assertPdfSpace` (D7) | Unitario, e2e de espacio |
| RF-29, RF-30 | `isNearPdfLimit`, `formatUsedGb`, `PanelInicio`, formularios | Vitest |
| RF-31, RF-32 | `GET /api/panel/plan`, `ProveedorPlan` solo en el panel | e2e, Vitest |
| RF-33 | `ContactoBourderWeb`, `AvisoPlan` | Vitest |
| RF-34, RF-35 | `bourder-web.ts`, `PieSitio`, `marca-unica.test.ts` | Vitest |
| RF-36 | `validateEnvironment`, tope de la demo sin cambios | Unitario, e2e de demo |
| RNF de seguridad | D3, D6, D8 | e2e |
| RNF de concurrencia | D7 | e2e de integrantes y de espacio |
| RNF de rendimiento | Suma sin `contenido`, conteo sobre pocas filas | e2e de rendimiento de la spec 010, que sigue en verde |
| RNF de accesibilidad | Nombres accesibles, `aria-describedby` | Vitest |

## Riesgos
1. **Publicar sin correr la migración:** la api arranca (D5), pero el ingreso responde 503 hasta que se corre la migración. Es preferible a dejar entrar a alguien que debería quedar fuera del plan. El README lo indica en los pasos de publicación.
2. **Varias instancias de la api:** `ensureApplied` se hace una vez por proceso, y el límite de intentos ya supone una sola instancia (plan 001). Con dos instancias, el ajuste correría dos veces dentro de una transacción con bloqueo, y el resultado sería el mismo.
3. **Mutex en la fila del principal (D7):** una transferencia del principal simultánea con un alta bloquea filas distintas en el mismo orden, así que no hay bloqueo mutuo. Lo verifica el e2e de integrantes simultáneos.
4. **Espacio en la base de tests:** probar el límite con PDF reales exigiría cargar 1 GB. Los e2e insertan filas en `pdfs` con un `tamano` grande y un contenido chico. La suma usa `tamano`, no el contenido, así que el test es válido.
5. **El plan en la web puede quedar viejo:** si se cambia el plan y se vuelve a publicar mientras alguien tiene el panel abierto, la web muestra el plan anterior hasta su siguiente navegación. La api ya aplica el nuevo (RF-3, RF-4), y la spec acepta los datos en la caché del navegador (fuera de alcance).
6. **`.env` y `.env.test`:** mientras no tengan `PLAN`, `pnpm dev` y `pnpm test` fallan al arrancar la api. Hay que agregarlas antes de la primera tarea de implementación.
