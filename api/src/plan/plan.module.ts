import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../configuracion/validar-entorno.js';
import { PlanController } from './plan.controller.js';
import { PlanGuard } from './plan.guard.js';
import { PLAN_SETTINGS, PlanService, type PlanSettings } from './plan.service.js';

/**
 * Plan de suscripción (spec 011; plan 011, "Módulos de NestJS"). Lo importan los módulos que
 * aplican el plan; no importa ninguno de ellos, así que no hay dependencias circulares. Es
 * global porque FormularioConPdfInterceptor, que lo usa, se resuelve en el módulo de cada
 * controller que lo aplica, también en los controllers de prueba de los e2e.
 */
@Global()
@Module({
  controllers: [PlanController],
  providers: [
    {
      provide: PLAN_SETTINGS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>): PlanSettings => ({
        plan: config.get('PLAN', { infer: true }),
        espacioPdfBytes: config.get('ESPACIO_PDF_BYTES', { infer: true }),
      }),
    },
    PlanService,
    PlanGuard,
  ],
  exports: [PlanService, PlanGuard],
})
export class PlanModule {}
