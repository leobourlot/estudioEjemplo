import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El PDF de un movimiento deja de tener visibilidad propia (spec 010, RF-17, RF-33): el cliente lo
 * ve si puede ver el movimiento. Un movimiento visible con el PDF marcado como oculto pasa a
 * mostrar su PDF al cliente.
 */
export class QuitarVisibilidadDelPdf1794441600000 implements MigrationInterface {
  name = 'QuitarVisibilidadDelPdf1794441600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `movimientos` DROP COLUMN `pdfVisible`');
  }

  /**
   * Vuelve a crear la marca. Para que el cliente siga viendo lo mismo, el PDF de un movimiento
   * visible queda visible.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `movimientos` ADD `pdfVisible` tinyint NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'UPDATE `movimientos` SET `pdfVisible` = 1 WHERE `pdfId` IS NOT NULL AND `visible` = 1',
    );
  }
}
