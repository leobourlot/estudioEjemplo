import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Los PDF de movimientos y fallos (spec 010; plan 010, "Entidades de TypeORM y migración"). El
 * contenido va en una tabla propia (plan 010, D1); movimientos y fallos solo suman la
 * referencia, única, y los movimientos, la visibilidad del PDF para el cliente. Las claves
 * foráneas no borran en cascada: el service desvincula el PDF antes de borrarlo (RF-14).
 */
export class CrearPdfs1794182400000 implements MigrationInterface {
  name = 'CrearPdfs1794182400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`pdfs\` (\`id\` int NOT NULL AUTO_INCREMENT, \`contenido\` mediumblob NOT NULL, \`tamano\` int NOT NULL, \`codigo\` char(6) NOT NULL, \`subidoPorId\` int NOT NULL, \`subidoEn\` datetime(6) NOT NULL, UNIQUE INDEX \`UQ_pdfs_codigo\` (\`codigo\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await queryRunner.query(
      `ALTER TABLE \`pdfs\` ADD CONSTRAINT \`FK_pdfs_subido_por\` FOREIGN KEY (\`subidoPorId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE \`movimientos\` ADD \`pdfId\` int NULL, ADD \`pdfVisible\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`UQ_movimientos_pdf\` ON \`movimientos\` (\`pdfId\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`movimientos\` ADD CONSTRAINT \`FK_movimientos_pdf\` FOREIGN KEY (\`pdfId\`) REFERENCES \`pdfs\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`ALTER TABLE \`fallos\` ADD \`pdfId\` int NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX \`UQ_fallos_pdf\` ON \`fallos\` (\`pdfId\`)`);
    await queryRunner.query(
      `ALTER TABLE \`fallos\` ADD CONSTRAINT \`FK_fallos_pdf\` FOREIGN KEY (\`pdfId\`) REFERENCES \`pdfs\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `fallos` DROP FOREIGN KEY `FK_fallos_pdf`');
    await queryRunner.query('DROP INDEX `UQ_fallos_pdf` ON `fallos`');
    await queryRunner.query('ALTER TABLE `fallos` DROP COLUMN `pdfId`');

    await queryRunner.query('ALTER TABLE `movimientos` DROP FOREIGN KEY `FK_movimientos_pdf`');
    await queryRunner.query('DROP INDEX `UQ_movimientos_pdf` ON `movimientos`');
    await queryRunner.query(
      'ALTER TABLE `movimientos` DROP COLUMN `pdfVisible`, DROP COLUMN `pdfId`',
    );

    await queryRunner.query('ALTER TABLE `pdfs` DROP FOREIGN KEY `FK_pdfs_subido_por`');
    await queryRunner.query('DROP TABLE `pdfs`');
  }
}
