/**
 * Las cuentas de prueba de la demo (spec 009, RF-16 a RF-19): la administradora, el abogado y la
 * cliente de los datos de muestra (datos-de-muestra/datos-de-muestra.sql), por su documento. Con
 * el modo demo encendido, la api no deja modificarlas (proteccion-demo.service.ts). Son las
 * mismas que muestra el ingreso (web/src/servicios/cuentas-demo.ts): lo verifican
 * cuentas-demo.spec.ts, contra el SQL, y el test de la web, contra este archivo.
 */
export const DNIS_CUENTAS_DEMO: readonly string[] = ['23456781', '24567892', '28456123'];

/** La contraseña de los datos de muestra, solo para verificar su hash en los tests. */
export const CONTRASENA_DATOS_DE_MUESTRA = 'Muestra2026';
