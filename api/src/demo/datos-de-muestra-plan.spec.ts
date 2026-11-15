import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Vitest corre los tests de la api desde api/.
const sql = readFileSync('datos-de-muestra/datos-de-muestra.sql', 'utf8');

/** Spec 011, RF-36: la demo funciona con el plan Premium y sus cuentas de muestra. */
describe('datos de muestra y plan', () => {
  it('ninguna cuenta de muestra nace fuera del plan: la columna queda en su valor por defecto', () => {
    expect(sql).not.toContain('fueraDelPlan');
    expect(sql).toMatch(/^INSERT INTO `usuarios`/m);
  });
});
