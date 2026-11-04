import { describe, expect, it } from 'vitest';
import { DEMO_MODE, isDemoEnabled } from './modo-demo';

describe('modo demo (spec 009, RF-15)', () => {
  it('solo se enciende con "true"', () => {
    expect(isDemoEnabled('true')).toBe(true);
  });

  it.each([undefined, '', 'false', 'TRUE', '1', 'si', ' true'])('con %j queda apagado', (valor) => {
    expect(isDemoEnabled(valor)).toBe(false);
  });

  it('está apagado por defecto: los tests corren sin VITE_MODO_DEMO', () => {
    expect(import.meta.env.VITE_MODO_DEMO).toBeUndefined();
    expect(DEMO_MODE).toBe(false);
  });

  it('DEMO_MODE sigue la misma regla que isDemoEnabled', () => {
    expect(DEMO_MODE).toBe(isDemoEnabled(import.meta.env.VITE_MODO_DEMO));
  });
});
