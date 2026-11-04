import { Module } from '@nestjs/common';
import { DemoProtectionService } from './proteccion-demo.service.js';

/** El modo demo dentro de la api: la protección de las cuentas de prueba (spec 009, RF-19). */
@Module({
  providers: [DemoProtectionService],
  exports: [DemoProtectionService],
})
export class DemoModule {}
