import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { prepareSampleScript, SampleScriptError } from './script-datos-de-muestra.js';

// Vitest corre los tests de la api desde api/.
const sql = readFileSync('datos-de-muestra/datos-de-muestra.sql', 'utf8');

const wrap = (body: string) =>
  `-- Encabezado\nSET NAMES utf8mb4;\nSTART TRANSACTION;\n${body}\nCOMMIT;\n`;

describe('prepareSampleScript (spec 009, RF-20; plan 009, D7)', () => {
  it('quita del SQL real su propia transacción y conserva todo lo demás', () => {
    const script = prepareSampleScript(sql);

    expect(script).not.toMatch(/^\s*START TRANSACTION;/m);
    expect(script).not.toMatch(/^\s*COMMIT;/m);
    expect(script).toContain('SET @hash = ');
    expect(script.match(/^INSERT INTO/gm)).toHaveLength(sql.match(/^INSERT INTO/gm)!.length);
  });

  it('quita solo la primera apertura y el último cierre', () => {
    expect(prepareSampleScript(wrap("INSERT INTO `x` VALUES ('a');"))).toBe(
      "-- Encabezado\nSET NAMES utf8mb4;\nINSERT INTO `x` VALUES ('a');\n",
    );
  });

  it.each([
    ['un TRUNCATE', 'TRUNCATE TABLE `usuarios`;'],
    [
      'un COMMIT en el medio',
      "INSERT INTO `x` VALUES ('a');\nCOMMIT;\nINSERT INTO `x` VALUES ('b');",
    ],
    ['un CREATE', 'CREATE TABLE `y` (`id` int);'],
    ['un ALTER', 'ALTER TABLE `usuarios` ADD `z` int;'],
    ['un DROP', 'DROP TABLE `usuarios`;'],
    ['otra transacción', 'START TRANSACTION;'],
    ['un cambio de autocommit', 'SET autocommit = 1;'],
  ])('rechaza %s, que cerraría la transacción del restablecimiento', (_caso, sentencia) => {
    expect(() => prepareSampleScript(wrap(sentencia))).toThrow(SampleScriptError);
  });

  it('rechaza un SQL sin su transacción', () => {
    expect(() => prepareSampleScript("INSERT INTO `x` VALUES ('a');")).toThrow(SampleScriptError);
  });
});
