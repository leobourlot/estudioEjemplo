/**
 * Modo demo (spec 009, RF-15; plan 009, D4): apagado por defecto, solo se enciende construyendo
 * el sitio con VITE_MODO_DEMO=true. Vite reemplaza la variable por su valor al construir, así que
 * con el modo apagado lo que depende de él (las cuentas de prueba del ingreso) queda fuera del
 * código publicado. No importa React (principio 3).
 */

/** Solo "true", escrito así, enciende el modo demo. */
export function isDemoEnabled(valor: string | undefined): boolean {
  return valor === 'true';
}

// Escrito como comparación, y no con isDemoEnabled, para que el minificador lo resuelva al
// construir y deje afuera del código publicado lo que solo existe en modo demo (plan 009, D4).
export const DEMO_MODE = import.meta.env.VITE_MODO_DEMO === 'true';
