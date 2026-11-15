import { Controller, Get } from '@nestjs/common';
import { Roles } from '../autenticacion/decoradores.js';
import { type PlanResumen, PlanService } from './plan.service.js';

/**
 * El plan del estudio para el panel (spec 011, RF-31, RF-32; plan 011, D3). Solo administradores
 * y abogados: un cliente recibe 403 y un visitante 401, así nunca reciben el plan.
 */
@Roles('admin', 'abogado')
@Controller('panel/plan')
export class PlanController {
  constructor(private readonly plan: PlanService) {}

  @Get()
  summary(): Promise<PlanResumen> {
    return this.plan.summary();
  }
}
