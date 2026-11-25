# Validación 011 — Planes de suscripción

## T39 — Recorrido de la spec

Cada requisito con los tests que lo cubren. `api/src/…` son unitarios de la api, `api/test/…` e2e de la api y `web/src/…` tests de la web. Los e2e eligen el plan con `createTestApp({ plan, espacioPdfGb })`, sin tocar `.env.test`, así que cada requisito se prueba con los dos planes donde corresponde.

| Requisito | Tests |
|---|---|
| RF-1 | `api/src/configuracion/validar-entorno.spec.ts`, `api/test/plan-configuracion.e2e-spec.ts`, `api/test/plan-endpoint.e2e-spec.ts` (la sesión no trae el plan), `web/src/paginas/PortalPlan.test.tsx` (no se guarda en el navegador) |
| RF-2 | `api/src/configuracion/validar-entorno.spec.ts` (sin plan, mal escrito, en mayúsculas) |
| RF-3 | `api/test/plan-arranque.e2e-spec.ts` (el Premium quita las marcas sin cerrar sesiones), `web/src/paginas/PanelInicioPlan.test.tsx` y `web/src/componentes/MenuLateralPlan.test.tsx` (el plan se vuelve a pedir) |
| RF-4 | `api/src/plan/plan.guard.spec.ts`, `api/test/plan-jurisprudencia.e2e-spec.ts`, `api/test/plan-pdf.e2e-spec.ts`, `api/test/plan-integrantes.e2e-spec.ts` (pedidos directos a la api) |
| RF-5 | Los tests de las specs 001 a 010 siguen en verde con el plan Premium; `api/test/plan-integrantes.e2e-spec.ts` (clientes sin límite) |
| RF-6 | `api/test/plan-jurisprudencia.e2e-spec.ts`, `api/test/plan-pdf.e2e-spec.ts`, `api/test/plan-integrantes.e2e-spec.ts` (con el Premium se crea un tercer integrante) |
| RF-7 | `web/src/componentes/MenuLateralPlan.test.tsx`, `web/src/componentes/RutaPremium.test.tsx`, `web/src/paginas/PaginaPdfPlan.test.tsx`, `web/src/paginas/PanelInicioPlan.test.tsx` |
| RF-8 | `api/src/plan/plan.guard.spec.ts`, `api/test/plan-jurisprudencia.e2e-spec.ts` (cada endpoint, 403 T-4 sin cambios en la base) |
| RF-9 | `api/test/plan-jurisprudencia.e2e-spec.ts`, `api/test/plan-pdf.e2e-spec.ts` (vuelta al Premium) |
| RF-10 | `web/src/componentes/FormularioPlan.test.tsx` (carga, modificación y formulario desde un escrito) |
| RF-11 | `api/src/pdfs/formulario-con-pdf-plan.spec.ts`, `api/test/plan-pdf.e2e-spec.ts`, `web/src/servicios/formulario-movimiento-plan.test.ts` |
| RF-12 | `api/src/movimientos/movimiento-detalle-plan.spec.ts`, `api/test/plan-pdf.e2e-spec.ts` (detalle y descarga, exista o no), `web/src/paginas/PanelMovimientoDetallePlan.test.tsx`, `web/src/paginas/PaginaPdfPlan.test.tsx` |
| RF-13 | `api/src/movimientos/movimiento-detalle-plan.spec.ts`, `api/test/plan-pdf.e2e-spec.ts` (portal sin señal y 404 de siempre), `web/src/paginas/PortalPlan.test.tsx` |
| RF-14 | `api/test/plan-pdf.e2e-spec.ts` (modificar, anular, restaurar y cambiar la visibilidad conservan el PDF) |
| RF-15 | `web/src/servicios/formulario-movimiento-plan.test.ts`, `web/src/componentes/FormularioPlan.test.tsx`, `web/src/paginas/PanelMovimientoDetallePlan.test.tsx` (T-11 al hacer visible y al restaurar, sin los avisos de la spec 010) |
| RF-16 | `api/src/movimientos/movimiento-detalle-plan.spec.ts`, `api/test/plan-pdf.e2e-spec.ts`, `web/src/paginas/PanelMovimientoDetallePlan.test.tsx` (T-15) |
| RF-17, RF-18 | `api/test/plan-integrantes.e2e-spec.ts` (alta, reactivación y habilitación, también simultáneas; cambio de rol), `api/src/plan/plan.service.spec.ts` |
| RF-19 | `api/test/plan-integrantes.e2e-spec.ts`, `api/test/plan-endpoint.e2e-spec.ts`, `web/src/paginas/CuentasPlan.test.tsx`, `web/src/servicios/cuentas-plan.test.ts`, `web/src/servicios/plan.test.ts` |
| RF-20 | `api/src/plan/reglas-plan.spec.ts`, `api/test/plan-arranque.e2e-spec.ts` (principal, desempate por fecha, desactivadas y clientes), `api/test/migracion-fuera-del-plan.e2e-spec.ts` |
| RF-21 | `api/src/autenticacion/autenticacion.service.spec.ts`, `api/src/autenticacion/autenticacion.guard.spec.ts`, `api/test/plan-ingreso.e2e-spec.ts`, `web/src/componentes/SesionPlan.test.tsx` |
| RF-22 | `api/test/plan-integrantes.e2e-spec.ts` (filtro), `web/src/paginas/CuentasPlan.test.tsx`, `web/src/servicios/cuentas-plan.test.ts` |
| RF-23 | `api/src/usuarios/permisos-plan.spec.ts`, `api/test/plan-integrantes.e2e-spec.ts`, `web/src/paginas/CuentasPlan.test.tsx` (T-14 y T-16) |
| RF-24 | `api/test/plan-integrantes.e2e-spec.ts` |
| RF-25 | `api/test/plan-arranque.e2e-spec.ts` |
| RF-26 | `api/test/plan-causas.e2e-spec.ts`, `api/src/causas/causa-detalle.spec.ts`, `web/src/componentes/SelectorIntegrantesPlan.test.tsx` |
| RF-27, RF-28 | `api/src/configuracion/validar-entorno.spec.ts`, `api/src/plan/reglas-plan.spec.ts`, `api/test/plan-espacio-pdf.e2e-spec.ts` (justo al total, reemplazo, quitado, anulados y desactivados, simultáneas y orden de los mensajes), `web/src/servicios/formulario-movimiento-plan.test.ts`, `web/src/componentes/FormularioPlan.test.tsx` |
| RF-29, RF-30 | `web/src/servicios/plan.test.ts` (90 % y redondeo hacia abajo), `web/src/paginas/PanelInicioPlan.test.tsx`, `web/src/componentes/FormularioPlan.test.tsx` |
| RF-31 | `api/test/plan-endpoint.e2e-spec.ts`, `web/src/paginas/PanelInicioPlan.test.tsx` |
| RF-32 | `api/test/plan-endpoint.e2e-spec.ts` (cliente 403, visitante 401), `web/src/paginas/PortalPlan.test.tsx`, `web/src/componentes/MenuLateralPlan.test.tsx` |
| RF-33 | `web/src/componentes/AvisoPlan.test.tsx`, `web/src/servicios/bourder-web.test.ts`, `web/src/componentes/FormularioPlan.test.tsx` |
| RF-34 | `web/src/servicios/bourder-web.test.ts`, `web/src/componentes/PieSitio.test.tsx`, `web/src/servicios/contenido-sitio.test.ts`, `web/src/aislamiento-sitio.test.ts` |
| RF-35 | `web/src/marca-unica.test.ts`, `web/src/servicios/bourder-web.test.ts` |
| RF-36 | `api/src/configuracion/validar-entorno.spec.ts`, `api/src/demo/datos-de-muestra-plan.spec.ts`, `api/test/plan-espacio-pdf.e2e-spec.ts` (tope de la demo antes que T-9) |
| Caso límite T-17 (ajuste pendiente) | `api/src/plan/plan.service.spec.ts`, `api/test/plan-ingreso.e2e-spec.ts` (ingreso, renovación y rutas con sesión en 503; el sitio público sigue) |
| RNF de seguridad | `api/test/plan-jurisprudencia.e2e-spec.ts`, `api/test/plan-pdf.e2e-spec.ts`, `api/src/movimientos/movimiento-detalle-plan.spec.ts` |
| RNF de persistencia | `api/test/plan-arranque.e2e-spec.ts`, `api/test/plan-pdf.e2e-spec.ts`, `api/test/plan-jurisprudencia.e2e-spec.ts`, `web/src/paginas/PortalPlan.test.tsx` |
| RNF de concurrencia | `api/test/plan-integrantes.e2e-spec.ts` y `api/test/plan-espacio-pdf.e2e-spec.ts` (pedidos simultáneos) |
| RNF de rendimiento | `api/test/plan-espacio-pdf.e2e-spec.ts` (la suma no lee el contenido de los PDF) |
| RNF de configuración | `api/test/plan-configuracion.e2e-spec.ts` (el plan de cada test, sin tocar `.env.test`) |
| RNF de accesibilidad | `web/src/componentes/MenuLateralPlan.test.tsx` ("Jurisprudencia, plan Premium"), `web/src/componentes/AvisoPlan.test.tsx` (informativo o error), `web/src/paginas/CuentasPlan.test.tsx` y `web/src/servicios/cuentas-plan.test.ts` (roles no disponibles con el motivo, nombre de "Habilitar en el plan") |

Migración: `up` y `down` de `AgregarFueraDelPlanAUsuarios1794614400000` sobre la base de tests en `api/test/migracion-fuera-del-plan.e2e-spec.ts`: una cuenta existente queda sin la marca, una nueva nace sin ella, `down` la quita y el esquema queda igual a las entidades. `api/test/migracion-visibilidad-pdf.e2e-spec.ts` se ajustó porque dejó de ser la última migración.

Resultado de los tests (16/11/2026): web, 161 archivos y 2.164 tests en verde; api, 69 archivos y 1.460 tests unitarios en verde, y 103 archivos e2e en verde. En la corrida completa de los e2e falló un test viejo, `api/test/listado-causas.e2e-spec.ts`, que comparaba el responsable campo por campo sin `fueraDelPlan`; se corrigió y ese archivo se volvió a correr en verde. `pnpm lint` pasa.

### Demo manual (25/11/2026)

| Paso | Resultado |
|---|---|
| 1. Plan Premium: todo como en las specs 001 a 010 y el espacio usado en el inicio | Bien |
| 2. Plan Básico con 3 integrantes y PDF: jurisprudencia, T-3, PDF ocultos en el panel y el portal, tercer integrante fuera del plan | Bien |
| 3. Desactivar al segundo, habilitar al tercero, T-5 al crear otro integrante y alta de un cliente | Bien |
| 4. T-11 al hacer visible un movimiento con PDF | Bien |
| 5. Vuelta al Premium: jurisprudencia, PDF e integrantes sin cambios | Bien |
| 6. `ESPACIO_PDF_GB=1`: aviso desde el 90 % y rechazo al completarse | Bien |

Para el plan Básico en desarrollo, `MODO_DEMO=false` en `api/.env` durante la prueba: con el modo demo encendido la api exige Premium (RF-36), y además no deja desactivar las cuentas de prueba (spec 009, RF-19), que el paso 3 necesita.

### Veredicto

La spec está cumplida: cada RF y cada requisito no funcional tiene sus tests en verde, con los dos planes; `pnpm test` y `pnpm lint` pasan, y la demo manual se completó sin errores.

### Avisos de despliegue

- **Antes de desplegar esta versión**, agregar `PLAN` (`basico` o `premium`, en minúsculas) en las variables del servicio de la api de cada publicación. Sin ella, la api no arranca (RF-2). La demo lleva `PLAN=premium` (RF-36).
- **Después de desplegar**, correr la migración desde la consola del servicio: `npx typeorm migration:run -d dist/base-de-datos/data-source.js`. Hasta entonces, los logs muestran "No se pudo aplicar el plan a las cuentas: Unknown column 'fueraDelPlan'" y el ingreso y el panel responden T-17. Cuando termina, la api funciona sin volver a desplegar.
- **La web va después de la api**, porque la web nueva le pide el plan a `GET /api/panel/plan`.
- **Antes de dar más espacio** con `ESPACIO_PDF_GB`, verificar el disco del VPS y el tamaño de las copias de seguridad: el espacio vive en el MySQL compartido (README, "Espacio para PDF").

### Despliegue en la demo (25/11/2026)

`PLAN=premium` cargado en el servicio de la api, fusión de `011-planes-de-suscripcion` en `master` (`02b77c4`), despliegue y migración desde la consola. El usuario verificó que funciona todo.
