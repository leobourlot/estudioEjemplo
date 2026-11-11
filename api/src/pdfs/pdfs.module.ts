import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pdf } from './pdf.entity.js';
import { PdfsService } from './pdfs.service.js';

/**
 * PDF de movimientos y fallos (plan 010). Registra la entidad Pdf, que también necesitan las
 * relaciones de Movimiento y Fallo (autoLoadEntities), y exporta PdfsService para los módulos de
 * movimientos, jurisprudencia y portal.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Pdf])],
  providers: [PdfsService],
  exports: [PdfsService],
})
export class PdfsModule {}
