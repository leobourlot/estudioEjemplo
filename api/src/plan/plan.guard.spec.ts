import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { PlanGuard } from './plan.guard.js';
import type { PlanService } from './plan.service.js';
import { PLAN_MESSAGES } from './reglas-plan.js';

const guardFor = (isPremium: boolean) => new PlanGuard({ isPremium } as PlanService);

/** Spec 011, RF-4 y RF-8: las rutas del plan Premium. */
describe('PlanGuard', () => {
  it('con el plan Básico responde 403 T-4', () => {
    expect(() => guardFor(false).canActivate()).toThrow(ForbiddenException);
    expect(() => guardFor(false).canActivate()).toThrow(PLAN_MESSAGES.featureNotIncluded);
  });

  it('con el plan Premium deja pasar', () => {
    expect(guardFor(true).canActivate()).toBe(true);
  });
});
