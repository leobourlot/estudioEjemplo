import { checkCanMark, MARK_MESSAGES, markDemoDatabase } from './base-demo.js';
import { loadConsoleEnvironment, openDemoConnection } from './entorno-consola.js';

/**
 * Comando de consola: marca la base como la de la demo, una sola vez (spec 009, RF-21; plan 009,
 * D6). Se niega, sin conectarse, con el modo demo apagado o en una base de tests.
 * Desarrollo: `pnpm --filter api demo:marcar`.
 * Easypanel: `node dist/demo/marcar-base-demo.js` desde la consola del servicio de la api.
 */
async function main(): Promise<number> {
  const environment = loadConsoleEnvironment();
  const refusal = checkCanMark({
    modoDemo: environment.MODO_DEMO,
    baseDeDatos: environment.DB_DATABASE,
  });
  if (refusal) {
    console.error(refusal);
    return 1;
  }

  const dataSource = await openDemoConnection(environment);
  const queryRunner = dataSource.createQueryRunner();
  try {
    await markDemoDatabase(queryRunner);
    console.log(MARK_MESSAGES.done(environment.DB_DATABASE));
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
