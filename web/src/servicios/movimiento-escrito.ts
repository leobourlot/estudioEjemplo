import type { MovementForm } from './formulario-movimiento';

/**
 * Registrar un escrito completado como movimiento de la causa (spec 006, RF-54 y RF-55; plan
 * 006, "Registrar el escrito como movimiento"). Solo arma el formulario de la spec 003 con los
 * datos puestos de antemano: la carga la hace el servicio de movimientos. No importa React
 * (principio 3).
 */

/** Lo que va antes del título del modelo en la descripción (RF-54). */
export const ESCRITO_DESCRIPTION_PREFIX = 'Escrito: ';

export const MOVEMENT_REGISTERED_MESSAGE = 'Movimiento registrado';

/**
 * Día actual en Buenos Aires como AAAA-MM-DD. Es el mismo cálculo que el de
 * `formulario-fallo.ts`: los archivos de modelos no importan nada de la jurisprudencia salvo
 * `texto-fallo` (RF-53).
 */
export function todayInBuenosAires(ahora: Date = new Date()): string {
  // El formato en-CA es AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}

/**
 * Formulario de movimiento para el escrito de un modelo (RF-54): el día de hoy, Escrito
 * presentado y el título del modelo, oculto para el cliente. Solo lleva el título: nunca el
 * texto del escrito (RF-55).
 */
export function movementFormFromEscrito(tituloModelo: string, ahora?: Date): MovementForm {
  return {
    fecha: todayInBuenosAires(ahora),
    tipo: 'escrito_presentado',
    descripcion: `${ESCRITO_DESCRIPTION_PREFIX}${tituloModelo}`,
    textoCliente: '',
    visible: false,
  };
}
