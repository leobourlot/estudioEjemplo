import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La marca que identifica a la base de la demo (spec 009, RF-21; plan 009, D6). La tabla se crea
 * vacía en todas las bases, y admite una sola fila (id = 1). Solo el comando demo:marcar la
 * escribe, a mano y en la base de la demo; el restablecimiento se niega a correr sin ella. No
 * tiene entidad: solo la leen y la escriben los comandos de la demo, con SQL.
 */
export class CrearBaseDemo1793664000000 implements MigrationInterface {
  name = 'CrearBaseDemo1793664000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`base_demo\` (\`id\` int NOT NULL, \`marcadaEn\` datetime(6) NOT NULL, PRIMARY KEY (\`id\`), CONSTRAINT \`CHK_base_demo_una_fila\` CHECK (\`id\` = 1)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `base_demo`');
  }
}
