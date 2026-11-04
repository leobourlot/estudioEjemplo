import { describe, expect, it } from 'vitest';
import { contrastRatio, MIN_TEXT_CONTRAST } from './contraste';
import { MARCA } from './marca';

describe('contrastRatio (fórmula de WCAG 2)', () => {
  it('da 21 a 1 entre el negro y el blanco, en cualquier orden', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
  });

  it('da 1 a 1 entre un color y sí mismo', () => {
    expect(contrastRatio('#123456', '#123456')).toBeCloseTo(1, 5);
  });

  it('coincide con valores conocidos y no distingue mayúsculas', () => {
    // #767676 es el gris más claro que alcanza 4,5 a 1 sobre blanco.
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeLessThan(MIN_TEXT_CONTRAST);
  });

  it('rechaza un color que no es #RRGGBB', () => {
    expect(() => contrastRatio('azul', '#FFFFFF')).toThrow('#RRGGBB');
    expect(() => contrastRatio('#FFF', '#FFFFFF')).toThrow('#RRGGBB');
  });
});

describe('colores de la marca (spec 009, RF-9)', () => {
  const { oscuro, azul, blanco } = MARCA.colores;

  it.each([
    ['oscuro', oscuro],
    ['azul', azul],
  ])('el blanco contrasta al menos 4,5 a 1 con el %s', (_nombre, color) => {
    expect(
      contrastRatio(blanco, color),
      `El blanco ${blanco} no contrasta 4,5 a 1 con ${color}`,
    ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });
});
