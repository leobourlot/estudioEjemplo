import { describe, expect, it } from 'vitest';
import { campoLabel, formatChangeValue } from './presentacion-movimientos';

/** Spec 010, RF-21: el PDF en el historial de cambios. */
describe('el PDF en el historial de cambios', () => {
  it('el campo se llama "PDF"', () => {
    expect(campoLabel('pdf')).toBe('PDF');
  });

  it('muestra el código, el tamaño y la visibilidad', () => {
    expect(formatChangeValue('pdf', { codigo: 'K7Q2MX', tamano: 850_000, visible: false })).toBe(
      'K7Q2MX, 830 KB, oculto para el cliente',
    );
    expect(formatChangeValue('pdf', { codigo: 'P4N8RC', tamano: 2_300_000, visible: true })).toBe(
      'P4N8RC, 2 MB, visible para el cliente',
    );
  });

  it('sin PDF muestra "Sin PDF"', () => {
    expect(formatChangeValue('pdf', null)).toBe('Sin PDF');
  });

  it('los demás campos se muestran como siempre', () => {
    expect(formatChangeValue('visible', true)).toBe('Sí');
    expect(formatChangeValue('fecha', '2024-03-01')).toBe('01/03/2024');
  });
});
