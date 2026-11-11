import { defineConfig } from 'vitest/config';

// Tests e2e: en serie, porque comparten la base de tests (ver plan 001).
export default defineConfig({
  test: {
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    fileParallelism: false,
    // La base de tests es remota: cada test tarda unos segundos y una demora de la red
    // alcanzaba para pasar el límite de 5 s por defecto.
    testTimeout: 30_000,
    // Lo mismo en los beforeAll: cuando un test de migraciones vacía la base, el archivo
    // siguiente vuelve a aplicar todas las migraciones al levantar la aplicación, y con las de la
    // spec 010 pasaban los 10 s por defecto. Cortarlo a mitad de una migración deja la base a
    // medio migrar para los archivos siguientes (plan 010, T8).
    hookTimeout: 60_000,
    // Como en Easypanel: un proxy delante, así los tests simulan IPs con X-Forwarded-For.
    // Va acá y no en el código de los tests porque ConfigModule lee el entorno al importar
    // AppModule; las variables del proceso tienen prioridad sobre las de .env.test.
    env: { TRUST_PROXY_HOPS: '1' },
  },
});
