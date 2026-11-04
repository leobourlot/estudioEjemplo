import type { QueryRunner } from 'typeorm';

/**
 * La marca que identifica a la base de la demo (spec 009, RF-21; plan 009, D6): la fila de la
 * tabla base_demo. Solo la escribe el comando demo:marcar, a mano, en la base de la demo; nunca
 * en una base cuyo nombre contenga "test", la regla con la que los e2e reconocen su base.
 */

export const MARK_MESSAGES = {
  done: (base: string) => `Listo: la base ${base} quedó marcada como la de la demo.`,
  demoOff: 'El modo demo está apagado: no se marcó la base.',
  testDatabase: 'Esta base es de tests: nunca se marca como la de la demo.',
  missingTable: 'Falta la tabla base_demo: corré las migraciones antes de marcar la base.',
} as const;

/** Si se puede marcar la base: null, o el mensaje de por qué no. */
export function checkCanMark(estado: { modoDemo: boolean; baseDeDatos: string }): string | null {
  if (!estado.modoDemo) return MARK_MESSAGES.demoOff;
  if (/test/i.test(estado.baseDeDatos)) return MARK_MESSAGES.testDatabase;
  return null;
}

/** Si la base tiene la marca de la demo. Sin la tabla (migraciones sin correr), no la tiene. */
export async function isDemoMarked(queryRunner: QueryRunner): Promise<boolean> {
  if (!(await queryRunner.hasTable('base_demo'))) return false;
  const [row]: { total: string }[] = await queryRunner.query(
    'SELECT COUNT(*) AS total FROM `base_demo`',
  );
  return Number(row.total) > 0;
}

/** Marca la base como la de la demo. Repetirlo no es un error. */
export async function markDemoDatabase(queryRunner: QueryRunner): Promise<void> {
  if (!(await queryRunner.hasTable('base_demo'))) throw new Error(MARK_MESSAGES.missingTable);
  await queryRunner.query('INSERT IGNORE INTO `base_demo` (`id`, `marcadaEn`) VALUES (1, NOW(6))');
}
