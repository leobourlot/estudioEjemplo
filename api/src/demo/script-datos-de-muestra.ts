/**
 * El SQL de los datos de muestra, listo para el restablecimiento (spec 009, RF-20; plan 009, D7).
 * El archivo trae su propio START TRANSACTION y COMMIT, para cargarlo a mano. El restablecimiento
 * lo ejecuta dentro de su propia transacción, así que se los quita: un START TRANSACTION dentro de
 * otra transacción la confirma. Y rechaza cualquier otra sentencia que la cerraría, para que un
 * error en el medio siempre deje la base como estaba. Función pura, para los tests.
 */

export class SampleScriptError extends Error {}

/** Sentencias que en MySQL cierran la transacción en curso, al principio de un renglón. */
const IMPLICIT_COMMIT =
  /^\s*(START\s+TRANSACTION|BEGIN|COMMIT|ROLLBACK|TRUNCATE|CREATE|ALTER|DROP|RENAME|LOCK|UNLOCK|SET\s+autocommit)\b/im;

export function prepareSampleScript(sql: string): string {
  const lines = sql.replace(/\r\n/g, '\n').split('\n');
  const open = lines.findIndex((line) => line.trim() === 'START TRANSACTION;');
  let close = -1;
  lines.forEach((line, index) => {
    if (line.trim() === 'COMMIT;') close = index;
  });
  if (open === -1 || close < open) {
    throw new SampleScriptError(
      'El SQL de los datos de muestra debe abrir su carga con START TRANSACTION; y cerrarla con COMMIT;',
    );
  }

  const script = [
    ...lines.slice(0, open),
    ...lines.slice(open + 1, close),
    ...lines.slice(close + 1),
  ].join('\n');

  const forbidden = IMPLICIT_COMMIT.exec(script);
  if (forbidden) {
    throw new SampleScriptError(
      `El SQL de los datos de muestra no puede tener "${forbidden[1]}": cerraría la transacción del restablecimiento`,
    );
  }
  return script;
}
