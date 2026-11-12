import { describe, expect, it } from 'vitest';
import { campoLabel, formatChangeValue } from './presentacion-movimientos';

/** Spec 010, RF-21: el PDF en el historial de cambios. */
describe('el PDF en el historial de cambios', () => {
  it('el campo se llama "PDF"', () => {
    expect(campoLabel('pdf')).toBe('PDF');
  });

  it('muestra el tamaño, sin el código', () => {
    expect(formatChangeValue('pdf', { codigo: 'K7Q2MX', tamano: 850_000 })).toBe('830 KB');
    expect(formatChangeValue('pdf', { codigo: 'P4N8RC', tamano: 2_300_000 })).toBe('2 MB');
  });

  it('ignora la visibilidad que traen los cambios registrados antes de que el PDF dejara de tenerla (RF-17)', () => {
    const anterior = { codigo: 'K7Q2MX', tamano: 850_000, visible: false } as const;
    expect(formatChangeValue('pdf', anterior)).toBe('830 KB');
  });

  it('sin PDF muestra "Sin PDF"', () => {
    expect(formatChangeValue('pdf', null)).toBe('Sin PDF');
  });

  it('los demás campos se muestran como siempre', () => {
    expect(formatChangeValue('visible', true)).toBe('Sí');
    expect(formatChangeValue('fecha', '2024-03-01')).toBe('01/03/2024');
  });
});
