import { readFile } from 'node:fs/promises';
import { isDemoMarked } from './base-demo.js';
import { loadConsoleEnvironment, openDemoConnection } from './entorno-consola.js';
import { argentinaDate, daysToShift, FECHA_REFERENCIA } from './fechas-demo.js';
import { checkCanReset, RESET_MESSAGES, resetSampleData } from './restablecimiento-demo.js';
import { prepareSampleScript } from './script-datos-de-muestra.js';

/**
 * Comando de consola: restablece los datos de muestra de la demo (spec 009, RF-20 a RF-24; plan
 * 009, D7). Lo corre el cron del VPS todos los días a las 4:00 de Argentina, con docker exec.
 * Se niega, sin conectarse, con el modo demo apagado o en una base de tests, y se niega, sin
 * tocar nada, si la base no tiene la marca de la demo. Termina con 0 si restableció los datos y
 * con 1 si no.
 * Desarrollo: `pnpm --filter api demo:restablecer`.
 * Easypanel: `node dist/demo/restablecer-demo.js`, desde la consola o los Scripts del servicio.
 */

// Desde dist/demo/ (y desde src/demo/), el SQL está en api/datos-de-muestra/; en la imagen de
// Docker, en /app/datos-de-muestra/ (api/Dockerfile).
const SAMPLE_SQL = new URL('../../datos-de-muestra/datos-de-muestra.sql', import.meta.url);

async function main(): Promise<number> {
  const environment = loadConsoleEnvironment();
  const estado = { modoDemo: environment.MODO_DEMO, baseDeDatos: environment.DB_DATABASE };
  // Las dos primeras condiciones se verifican antes de conectarse a la base.
  const early = checkCanReset({ ...estado, marcada: true });
  if (early) {
    console.error(early);
    return 1;
  }

  const dataSource = await openDemoConnection(environment);
  const queryRunner = dataSource.createQueryRunner();
  try {
    const refusal = checkCanReset({ ...estado, marcada: await isDemoMarked(queryRunner) });
    if (refusal) {
      console.error(refusal);
      return 1;
    }

    const script = prepareSampleScript(await readFile(SAMPLE_SQL, 'utf8'));
    const dias = daysToShift(FECHA_REFERENCIA, argentinaDate(new Date()));
    try {
      await resetSampleData(queryRunner, script, dias);
    } catch (error) {
      console.error(RESET_MESSAGES.failed);
      console.error((error as Error).message);
      return 1;
    }
    console.log(RESET_MESSAGES.done(dias));
    return 0;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error((error as Error).message);
    process.exitCode = 1;
  },
);
