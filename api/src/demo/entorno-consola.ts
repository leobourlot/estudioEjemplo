import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../base-de-datos/opciones-base-de-datos.js';
import { type Environment, validateEnvironment } from '../configuracion/validar-entorno.js';

/**
 * El entorno de los comandos de la demo (spec 009, RF-20 y RF-21). Leen siempre .env, nunca
 * .env.test: la base de los e2e no se restablece ni se marca. Sin archivo (por ejemplo en
 * Easypanel), las variables vienen del entorno del servicio, como en data-source.ts.
 */
export function loadConsoleEnvironment(): Environment {
  try {
    process.loadEnvFile('.env');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return validateEnvironment(process.env);
}

/** Una conexión propia, con sentencias múltiples para cargar el SQL de los datos de muestra. */
export async function openDemoConnection(environment: Environment): Promise<DataSource> {
  const dataSource = new DataSource({
    ...buildDataSourceOptions(environment),
    multipleStatements: true,
  });
  return dataSource.initialize();
}
