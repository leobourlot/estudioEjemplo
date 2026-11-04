import type { QueryRunner } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { checkCanMark, isDemoMarked, MARK_MESSAGES, markDemoDatabase } from './base-demo.js';

describe('checkCanMark (spec 009, RF-21; plan 009, D6)', () => {
  it('con el modo demo y una base que no es de tests, se puede marcar', () => {
    expect(checkCanMark({ modoDemo: true, baseDeDatos: 'estudio_demo' })).toBeNull();
  });

  it('con el modo demo apagado, no', () => {
    expect(checkCanMark({ modoDemo: false, baseDeDatos: 'estudio_demo' })).toBe(
      MARK_MESSAGES.demoOff,
    );
  });

  it.each(['estudio_test', 'TEST_demo'])('una base con "test" en el nombre (%s), nunca', (base) => {
    expect(checkCanMark({ modoDemo: true, baseDeDatos: base })).toBe(MARK_MESSAGES.testDatabase);
  });
});

function fakeRunner(responses: { hasTable: boolean; rows?: number }) {
  const log: string[] = [];
  const runner = {
    hasTable: async () => responses.hasTable,
    query: async (sql: string) => {
      log.push(sql);
      return sql.startsWith('SELECT') ? [{ total: String(responses.rows ?? 0) }] : [];
    },
  };
  return { runner: runner as unknown as QueryRunner, log };
}

describe('isDemoMarked (spec 009, RF-21)', () => {
  it('es true solo si base_demo tiene su fila', async () => {
    expect(await isDemoMarked(fakeRunner({ hasTable: true, rows: 1 }).runner)).toBe(true);
    expect(await isDemoMarked(fakeRunner({ hasTable: true, rows: 0 }).runner)).toBe(false);
  });

  it('sin la tabla (migraciones sin correr), es false', async () => {
    const { runner, log } = fakeRunner({ hasTable: false });

    expect(await isDemoMarked(runner)).toBe(false);
    expect(log).toEqual([]);
  });
});

describe('markDemoDatabase (plan 009, D6)', () => {
  it('inserta la fila, sin repetirla si ya estaba', async () => {
    const { runner, log } = fakeRunner({ hasTable: true });

    await markDemoDatabase(runner);

    expect(log).toEqual(['INSERT IGNORE INTO `base_demo` (`id`, `marcadaEn`) VALUES (1, NOW(6))']);
  });

  it('sin la tabla, avisa que faltan las migraciones', async () => {
    await expect(markDemoDatabase(fakeRunner({ hasTable: false }).runner)).rejects.toThrow(
      MARK_MESSAGES.missingTable,
    );
  });
});
