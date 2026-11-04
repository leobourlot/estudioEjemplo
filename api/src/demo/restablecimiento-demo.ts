import type { QueryRunner } from 'typeorm';
import { CONTROL_TABLES, type ColumnaFecha, shiftableColumns } from './fechas-demo.js';

/**
 * Restablecimiento de los datos de muestra de la demo (spec 009, RF-20 a RF-23; plan 009, D6 y
 * D7). Lo usa el comando de consola restablecer-demo.ts; no tiene ninguna dirección en la api.
 */

/** Los mensajes del comando (spec 009, anexo B). */
export const RESET_MESSAGES = {
  done: (dias: number) => `Datos de muestra restablecidos. Fechas corridas ${dias} días.`,
  demoOff: 'El modo demo está apagado: no se restableció nada.',
  notDemoDatabase: 'Esta base no está identificada como la de la demo: no se restableció nada.',
  failed: 'No se pudieron restablecer los datos de muestra: la base quedó como estaba.',
} as const;

export interface EstadoBase {
  modoDemo: boolean;
  baseDeDatos: string;
  /** Si la tabla base_demo tiene su fila (demo:marcar). */
  marcada: boolean;
}

/**
 * Si se puede restablecer: null, o el mensaje de por qué no (RF-21). Exige el modo demo, un nombre
 * de base sin "test" (la regla con la que los e2e reconocen su base) y la marca de la demo.
 */
export function checkCanReset(estado: EstadoBase): string | null {
  if (!estado.modoDemo) return RESET_MESSAGES.demoOff;
  if (/test/i.test(estado.baseDeDatos) || !estado.marcada) return RESET_MESSAGES.notDemoDatabase;
  return null;
}

/**
 * Vacía las tablas de datos, carga el SQL de los datos de muestra (sin su propia transacción,
 * script-datos-de-muestra.ts) y corre sus fechas, todo en una transacción: si algo falla, la base
 * queda como estaba (RF-20). Vacía con DELETE y no con TRUNCATE, que en MySQL cierra la
 * transacción. Vaciar `sesiones` cierra todas las sesiones (RF-23). El QueryRunner tiene que
 * admitir sentencias múltiples (multipleStatements).
 */
export async function resetSampleData(
  queryRunner: QueryRunner,
  script: string,
  dias: number,
): Promise<void> {
  const tables: { name: string }[] = await queryRunner.query(
    `SELECT TABLE_NAME AS name FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`,
  );
  const columns: ColumnaFecha[] = await queryRunner.query(
    `SELECT TABLE_NAME AS tabla, COLUMN_NAME AS columna FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND DATA_TYPE IN ('date', 'datetime', 'timestamp')
       AND EXTRA NOT LIKE '%GENERATED%'
     ORDER BY TABLE_NAME, ORDINAL_POSITION`,
  );

  await queryRunner.startTransaction();
  try {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const { name } of tables) {
      if (!CONTROL_TABLES.includes(name)) await queryRunner.query(`DELETE FROM \`${name}\``);
    }
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
    await queryRunner.query(script);
    for (const { tabla, columna } of shiftableColumns(columns)) {
      await queryRunner.query(
        `UPDATE \`${tabla}\` SET \`${columna}\` = \`${columna}\` + INTERVAL ? DAY WHERE \`${columna}\` IS NOT NULL`,
        [dias],
      );
    }
    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}
