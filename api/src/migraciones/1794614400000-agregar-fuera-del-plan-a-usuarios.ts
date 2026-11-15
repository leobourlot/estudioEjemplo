import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marca de los integrantes fuera del plan Básico (spec 011, RF-20; plan 011, D4). Todas las
 * cuentas nacen sin la marca: la pone PlanService al arrancar con el plan Básico.
 */
export class AgregarFueraDelPlanAUsuarios1794614400000 implements MigrationInterface {
  name = 'AgregarFueraDelPlanAUsuarios1794614400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `usuarios` ADD `fueraDelPlan` tinyint NOT NULL DEFAULT 0');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `usuarios` DROP COLUMN `fueraDelPlan`');
  }
}
