import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { argentinaDate, daysToShift, FECHA_REFERENCIA, shiftableColumns } from './fechas-demo.js';

// Vitest corre los tests de la api desde api/.
const sql = readFileSync('datos-de-muestra/datos-de-muestra.sql', 'utf8').replace(/\r\n/g, '\n');

describe('daysToShift (spec 009, RF-22)', () => {
  it.each([
    ['el mismo día', '2026-10-24', '2026-10-24', 0],
    ['en el mismo mes', '2026-10-24', '2026-10-30', 6],
    ['con un cambio de mes', '2026-10-24', '2026-11-03', 10],
    ['con un cambio de año', '2026-10-24', '2027-01-02', 70],
    ['con un 29 de febrero en el medio', '2028-02-27', '2028-03-01', 3],
  ])('%s', (_caso, referencia, hoy, dias) => {
    expect(daysToShift(referencia, hoy)).toBe(dias);
  });

  it('rechaza una fecha que no es AAAA-MM-DD', () => {
    expect(() => daysToShift('24/10/2026', '2026-11-03')).toThrow('AAAA-MM-DD');
  });
});

describe('argentinaDate (spec 009, RF-22)', () => {
  it.each([
    ['las 23:30 de Argentina siguen siendo el mismo día', '2026-11-04T02:30:00Z', '2026-11-03'],
    ['las 0:30 de Argentina ya son el día siguiente', '2026-11-04T03:30:00Z', '2026-11-04'],
    ['las 4:00 de Argentina, la hora del restablecimiento', '2026-11-03T07:00:00Z', '2026-11-03'],
  ])('%s', (_caso, instante, dia) => {
    expect(argentinaDate(new Date(instante))).toBe(dia);
  });
});

describe('shiftableColumns (spec 009, RF-22)', () => {
  it('corre todas las fechas, salvo la de los fallos y las de las tablas de control', () => {
    const columns = [
      { tabla: 'movimientos', columna: 'fecha' },
      { tabla: 'movimientos', columna: 'creadoEn' },
      { tabla: 'usuarios', columna: 'ultimoIngreso' },
      { tabla: 'fallos', columna: 'fecha' },
      { tabla: 'fallos', columna: 'creadoEn' },
      { tabla: 'migraciones', columna: 'timestamp' },
      { tabla: 'base_demo', columna: 'marcadaEn' },
    ];

    expect(shiftableColumns(columns)).toEqual([
      { tabla: 'movimientos', columna: 'fecha' },
      { tabla: 'movimientos', columna: 'creadoEn' },
      { tabla: 'usuarios', columna: 'ultimoIngreso' },
      { tabla: 'fallos', columna: 'creadoEn' },
    ]);
  });
});

describe('FECHA_REFERENCIA (spec 009, RF-22)', () => {
  it('es la fecha más reciente de los datos de muestra, sin contar la de los fallos', () => {
    const dates = sql.split('\n').flatMap((line) => {
      // En los fallos, la fecha del fallo (sin hora) es real y no cuenta; sí las de carga.
      const pattern = line.startsWith('INSERT INTO `fallos`')
        ? /'(\d{4}-\d{2}-\d{2}) \d{2}:\d{2}:\d{2}(?:\.\d+)?'/g
        : /'(\d{4}-\d{2}-\d{2})(?: \d{2}:\d{2}:\d{2}(?:\.\d+)?)?'/g;
      return Array.from(line.matchAll(pattern), (match) => match[1]);
    });

    expect(dates.length).toBeGreaterThan(100);
    expect(dates.sort().at(-1)).toBe(FECHA_REFERENCIA);
  });
});
