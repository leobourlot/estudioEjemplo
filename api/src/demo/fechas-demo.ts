/**
 * Las fechas de los datos de muestra en el restablecimiento (spec 009, RF-22; plan 009, D7): se
 * corren todas la misma cantidad de días, la que separa la fecha de referencia del día del
 * restablecimiento en Argentina. Así se conservan los intervalos, la hora y el orden, y una fecha
 * futura sigue siéndolo. La fecha de cada fallo no se corre: es la de un fallo real. Funciones
 * puras, para los tests.
 */

/** La fecha más reciente de los datos de muestra: el último ingreso de una cuenta. */
export const FECHA_REFERENCIA = '2026-10-24';

const ARGENTINA = 'America/Argentina/Buenos_Aires';
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** El día, en Argentina, de un instante, como AAAA-MM-DD. */
export function argentinaDate(ahora: Date): string {
  // en-CA escribe las fechas como AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}

function utcDay(fecha: string): number {
  const match = DATE.exec(fecha);
  if (!match) throw new Error(`La fecha debe tener la forma AAAA-MM-DD (recibida: "${fecha}")`);
  const [, year, month, day] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
}

/** Cuántos días hay que correr las fechas para que la referencia caiga en `hoy`. */
export function daysToShift(referencia: string, hoy: string): number {
  return Math.round((utcDay(hoy) - utcDay(referencia)) / DAY_MS);
}

/** Una columna de fecha de la base, como la lista information_schema. */
export interface ColumnaFecha {
  tabla: string;
  columna: string;
}

/** Las tablas de control, que el restablecimiento no vacía ni corre. */
export const CONTROL_TABLES: readonly string[] = ['migraciones', 'base_demo'];

/** Las columnas que se conservan: la fecha de cada fallo, que es real. */
const KEPT_COLUMNS = new Set(['fallos.fecha']);

/** Las columnas de fecha que se corren: todas, salvo las de control y la fecha de los fallos. */
export function shiftableColumns(columnas: readonly ColumnaFecha[]): ColumnaFecha[] {
  return columnas.filter(
    ({ tabla, columna }) =>
      !CONTROL_TABLES.includes(tabla) && !KEPT_COLUMNS.has(`${tabla}.${columna}`),
  );
}
