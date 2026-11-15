import { type CanActivate, ForbiddenException, Injectable } from '@nestjs/common';
import { PlanService } from './plan.service.js';
import { PLAN_MESSAGES } from './reglas-plan.js';

/**
 * Cierra las rutas del plan Premium (spec 011, RF-4, RF-8, RF-12; plan 011, D6). Se aplica con
 * @SoloPremium() a nivel de controller o de ruta, así corre después de los guards globales: un
 * visitante sigue recibiendo 401 y un cliente 403 antes de que se mire el plan. Con el plan
 * Básico responde 403 T-4 sin consultar nada.
 */
@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private readonly plan: PlanService) {}

  canActivate(): boolean {
    if (!this.plan.isPremium) throw new ForbiddenException(PLAN_MESSAGES.featureNotIncluded);
    return true;
  }
}
