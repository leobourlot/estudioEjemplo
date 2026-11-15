import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ProveedorPlan } from '../componentes/ProveedorPlan';
import { ProveedorServicios } from '../componentes/ProveedorServicios';
import type { PlanInfo } from '../servicios/plan';
import { fakePlanService } from './plan-de-prueba';

/** Renderiza un componente del panel con el plan indicado ya cargado (spec 011). */
export function renderWithPlan(ui: ReactElement, info: PlanInfo) {
  const plan = fakePlanService(info);
  const result = render(
    <MemoryRouter>
      <ProveedorServicios services={{ plan }}>
        <ProveedorPlan>{ui}</ProveedorPlan>
      </ProveedorServicios>
    </MemoryRouter>,
  );
  return { ...result, plan };
}
