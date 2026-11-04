import type { QueryRunner } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { checkCanReset, RESET_MESSAGES, resetSampleData } from './restablecimiento-demo.js';

describe('checkCanReset (spec 009, RF-21)', () => {
  const ready = { modoDemo: true, baseDeDatos: 'estudio_demo', marcada: true };

  it('con todo en regla, se puede restablecer', () => {
    expect(checkCanReset(ready)).toBeNull();
  });

  it('con el modo demo apagado, no', () => {
    expect(checkCanReset({ ...ready, modoDemo: false })).toBe(RESET_MESSAGES.demoOff);
  });

  it.each(['estudio_test', 'estudio_demo_TEST', 'test'])(
    'en una base con "test" en el nombre (%s), no, aunque esté marcada',
    (baseDeDatos) => {
      expect(checkCanReset({ ...ready, baseDeDatos })).toBe(RESET_MESSAGES.notDemoDatabase);
    },
  );

  it('en una base sin la marca de la demo, no', () => {
    expect(checkCanReset({ ...ready, marcada: false })).toBe(RESET_MESSAGES.notDemoDatabase);
  });

  it('los mensajes son los del anexo B', () => {
    expect(RESET_MESSAGES.demoOff).toBe('El modo demo está apagado: no se restableció nada.');
    expect(RESET_MESSAGES.notDemoDatabase).toBe(
      'Esta base no está identificada como la de la demo: no se restableció nada.',
    );
    expect(RESET_MESSAGES.failed).toBe(
      'No se pudieron restablecer los datos de muestra: la base quedó como estaba.',
    );
    expect(RESET_MESSAGES.done(10)).toBe(
      'Datos de muestra restablecidos. Fechas corridas 10 días.',
    );
  });
});

/** Un QueryRunner falso: registra lo que se le pide y responde las consultas de esquema. */
function fakeRunner(failOn?: string) {
  const log: string[] = [];
  const runner = {
    query: async (sql: string, params?: unknown[]) => {
      log.push(params ? `${sql} ${JSON.stringify(params)}` : sql);
      if (failOn && sql.includes(failOn)) throw new Error('falla de prueba');
      if (sql.includes('information_schema.TABLES')) {
        return [
          { name: 'usuarios' },
          { name: 'fallos' },
          { name: 'migraciones' },
          { name: 'base_demo' },
        ];
      }
      if (sql.includes('information_schema.COLUMNS')) {
        return [
          { tabla: 'usuarios', columna: 'ultimoIngreso' },
          { tabla: 'fallos', columna: 'fecha' },
          { tabla: 'fallos', columna: 'creadoEn' },
          { tabla: 'migraciones', columna: 'timestamp' },
        ];
      }
      return [];
    },
    startTransaction: async () => void log.push('START'),
    commitTransaction: async () => void log.push('COMMIT'),
    rollbackTransaction: async () => void log.push('ROLLBACK'),
  };
  return { runner: runner as unknown as QueryRunner, log };
}

describe('resetSampleData (spec 009, RF-20, RF-22 y RF-23)', () => {
  it('en una transacción: vacía las tablas de datos, carga el SQL y corre las fechas', async () => {
    const { runner, log } = fakeRunner();

    await resetSampleData(runner, 'INSERT DE MUESTRA', 10);

    const work = log.filter((sql) => !sql.includes('information_schema'));
    expect(work).toEqual([
      'START',
      'SET FOREIGN_KEY_CHECKS = 0',
      'DELETE FROM `usuarios`',
      'DELETE FROM `fallos`',
      'SET FOREIGN_KEY_CHECKS = 1',
      'INSERT DE MUESTRA',
      'UPDATE `usuarios` SET `ultimoIngreso` = `ultimoIngreso` + INTERVAL ? DAY WHERE `ultimoIngreso` IS NOT NULL [10]',
      'UPDATE `fallos` SET `creadoEn` = `creadoEn` + INTERVAL ? DAY WHERE `creadoEn` IS NOT NULL [10]',
      'COMMIT',
      'SET FOREIGN_KEY_CHECKS = 1',
    ]);
  });

  it('no vacía las tablas de control ni corre la fecha de los fallos', async () => {
    const { runner, log } = fakeRunner();

    await resetSampleData(runner, 'INSERT DE MUESTRA', 3);

    expect(log.join('\n')).not.toMatch(/DELETE FROM `(migraciones|base_demo)`/);
    expect(log.join('\n')).not.toContain('`fallos` SET `fecha`');
  });

  it('si algo falla, vuelve todo atrás y avisa', async () => {
    const { runner, log } = fakeRunner('INSERT DE MUESTRA');

    await expect(resetSampleData(runner, 'INSERT DE MUESTRA', 3)).rejects.toThrow(
      'falla de prueba',
    );

    expect(log).toContain('ROLLBACK');
    expect(log).not.toContain('COMMIT');
    expect(log.at(-1)).toBe('SET FOREIGN_KEY_CHECKS = 1');
  });
});
