import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PdfsModule } from '../pdfs/pdfs.module.js';
import { FalloPalabraClave } from './fallo-palabra-clave.entity.js';
import { Fallo } from './fallo.entity.js';
import { JurisprudenciaController } from './jurisprudencia.controller.js';
import { JurisprudenciaService } from './jurisprudencia.service.js';
import { PalabraClave } from './palabra-clave.entity.js';
import { PalabrasClaveService } from './palabras-clave.service.js';

/**
 * Jurisprudencia del estudio (plan 005). No exporta nada a propósito: ningún otro módulo, en
 * particular el portal, puede llegar a la jurisprudencia sin cambiar este módulo a la vista
 * (RF-36).
 */
@Module({
  // PdfsService: el PDF de cada fallo (spec 010). PdfsModule no conoce la jurisprudencia.
  imports: [TypeOrmModule.forFeature([Fallo, PalabraClave, FalloPalabraClave]), PdfsModule],
  controllers: [JurisprudenciaController],
  providers: [JurisprudenciaService, PalabrasClaveService],
})
export class JurisprudenciaModule {}
