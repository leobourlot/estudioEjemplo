/**
 * Las cuentas de prueba que muestra el ingreso en modo demo (spec 009, RF-16 y anexo B). Son tres
 * cuentas de los datos de muestra (api/datos-de-muestra/datos-de-muestra.sql), las mismas que
 * protege la api (api/src/demo/cuentas-demo.ts, RF-18 y RF-19): lo verifica cuentas-demo.test.ts.
 * No son de la marca ni van en el archivo de marca (RF-4). No importa React (principio 3).
 */

export interface CuentaDemo {
  /** El rol, como se muestra en el recuadro. */
  rol: string;
  /** Nombre y apellido, como en los datos de muestra. */
  nombre: string;
  /** El DNI con el que ingresa, sin puntos, como lo escribe "Usar esta cuenta". */
  dni: string;
  /** El nombre del botón "Usar esta cuenta" para el lector de pantalla. */
  etiqueta: string;
}

/** La contraseña de todas las cuentas de los datos de muestra. */
export const CONTRASENA_DEMO = 'Muestra2026';

/** En el orden del recuadro: la administradora, el abogado y la cliente (RF-16). */
export const CUENTAS_DEMO: readonly CuentaDemo[] = [
  {
    rol: 'Administradora',
    nombre: 'Carolina Ferreyra',
    dni: '23456781',
    etiqueta: 'Usar la cuenta de la administradora Carolina Ferreyra',
  },
  {
    rol: 'Abogado',
    nombre: 'Julián Ibarra',
    dni: '24567892',
    etiqueta: 'Usar la cuenta del abogado Julián Ibarra',
  },
  {
    rol: 'Cliente',
    nombre: 'María Elena Gómez',
    dni: '28456123',
    etiqueta: 'Usar la cuenta de la cliente María Elena Gómez',
  },
];

/** Los textos del recuadro (anexo B). */
export const TEXTOS_CUENTAS_DEMO = {
  titulo: 'Cuentas de prueba',
  texto:
    'Esta es una demo con datos ficticios. Probala con cualquiera de estas cuentas: todos los días, a las 4 de la mañana, los datos vuelven a como estaban.',
  dni: 'DNI',
  contrasena: 'Contraseña',
  usar: 'Usar esta cuenta',
} as const;
