import { MigrationInterface, QueryRunner } from 'typeorm';

const JURISDICTIONS = "'civil', 'penal', 'familia', 'laboral', 'federal', 'otro'";

/**
 * Fuero opcional en las causas (spec 002, RF-1). La columna generada claveExpediente no
 * cambia: CONCAT con un fuero NULL da NULL, así que una causa sin fuero queda fuera del
 * control de duplicado exacto (RF-8) y solo genera el aviso de RF-9.
 */
export class HacerOpcionalElFuero1793404800000 implements MigrationInterface {
  name = 'HacerOpcionalElFuero1793404800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`causas\` MODIFY \`fuero\` enum (${JURISDICTIONS}) NULL`);
  }

  /** Para volver a exigirlo, las causas sin fuero pasan al fuero Otro. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE \`causas\` SET \`fuero\` = 'otro' WHERE \`fuero\` IS NULL`);
    await queryRunner.query(
      `ALTER TABLE \`causas\` MODIFY \`fuero\` enum (${JURISDICTIONS}) NOT NULL`,
    );
  }
}
