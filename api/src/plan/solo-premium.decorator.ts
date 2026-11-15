import { UseGuards } from '@nestjs/common';
import { PlanGuard } from './plan.guard.js';

/** Solo con el plan Premium (spec 011, RF-6; plan 011, D6). El módulo importa PlanModule. */
export const SoloPremium = () => UseGuards(PlanGuard);
