import { describe, expect, it } from 'vitest';
import { MARCA } from './marca';
import { initialsOf, pageTitle } from './presentacion-sitio';

describe('pageTitle (spec 007, RF-34)', () => {
  it('suma " · " y el nombre del estudio de la marca (spec 009, RF-10)', () => {
    expect(pageTitle('Sucesiones')).toBe(`Sucesiones · ${MARCA.nombre}`);
  });
});

describe('initialsOf (spec 007, RF-21)', () => {
  it.each([
    ['Ana Robledo', 'AR'],
    ['Ana María Robledo', 'AMR'],
    ['Luis Peña Ortiz', 'LPO'],
    ['  ana   maría  ', 'AM'],
    ['Ñandú Álvarez', 'ÑÁ'],
  ])('%s → %s', (nombre, iniciales) => {
    expect(initialsOf(nombre)).toBe(iniciales);
  });
});
