import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { FilaMovimiento } from '../componentes/FilaMovimiento';
import { ProveedorPlan } from '../componentes/ProveedorPlan';
import { ProveedorServicios } from '../componentes/ProveedorServicios';
import {
  fakeMovimientosService,
  testMovimientoDetalle,
  testMovimientoResumen,
} from '../pruebas/movimientos-de-prueba';
import { basicPlan, fakePlanService, premiumPlan } from '../pruebas/plan-de-prueba';
import { renderWithPlan } from '../pruebas/plan-en-pantalla';
import type { MovimientoDetalle } from '../servicios/movimientos';
import type { PlanInfo } from '../servicios/plan';
import { PDF_HIDDEN_BY_PLAN, PLAN_TEXTS } from '../servicios/plan';
import { formatChangeValue } from '../servicios/presentacion-movimientos';
import { PanelMovimientoDetalle } from './PanelMovimientoDetalle';

const detail = (overrides: Partial<MovimientoDetalle> = {}) =>
  testMovimientoDetalle({ id: 12, causaId: 7, fecha: '2024-10-24', visible: true, ...overrides });

async function openDetail(movimiento: MovimientoDetalle, info: PlanInfo) {
  const movimientos = fakeMovimientosService({
    getMovement: vi.fn().mockResolvedValue(movimiento),
    restoreMovement: vi.fn().mockResolvedValue({ ...movimiento, anulado: false }),
  });
  const plan = fakePlanService(info);
  render(
    <MemoryRouter initialEntries={['/panel/causas/7/movimientos/12']}>
      <ProveedorServicios services={{ movimientos, plan }}>
        <ProveedorPlan>
          <Routes>
            <Route
              path="/panel/causas/:id/movimientos/:movimientoId"
              element={<PanelMovimientoDetalle />}
            />
          </Routes>
        </ProveedorPlan>
      </ProveedorServicios>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: 'Movimiento', level: 1 });
  await waitFor(() => expect(plan.getPlan).toHaveBeenCalled());
  return movimientos;
}

/** Spec 011, RF-12, RF-15 y RF-16: el movimiento en el plan Básico. */
describe('el movimiento según el plan', () => {
  it('con el plan Básico, restaurar un visible con PDF no pide confirmación y muestra T-11 después', async () => {
    const user = userEvent.setup();
    const movimientos = await openDetail(
      detail({ anulado: true, tienePdf: true, pdf: null }),
      basicPlan(),
    );

    await user.click(await screen.findByRole('button', { name: 'Restaurar' }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(movimientos.restoreMovement).toHaveBeenCalled();
    expect(await screen.findByText(PLAN_TEXTS.pdfKeptHidden)).toBeTruthy();
  });

  it('con el plan Básico, restaurar uno sin PDF no muestra T-11', async () => {
    const user = userEvent.setup();
    await openDetail(detail({ anulado: true, tienePdf: false, pdf: null }), basicPlan());

    await user.click(await screen.findByRole('button', { name: 'Restaurar' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Restaurar' })).toBeNull());
    expect(screen.queryByText(PLAN_TEXTS.pdfKeptHidden)).toBeNull();
  });

  it('con el plan Básico, el detalle no muestra la sección del PDF', async () => {
    await openDetail(detail({ tienePdf: true, pdf: null }), basicPlan());

    const datos = within(screen.getByRole('region', { name: 'Datos del movimiento' }));
    await waitFor(() => expect(datos.queryByText('Sin PDF')).toBeNull());
    expect(datos.queryByText('PDF')).toBeNull();
  });

  it('con el plan Básico, la fila no muestra la leyenda "PDF"; con el Premium, sí', async () => {
    const fila = (
      <FilaMovimiento movimiento={testMovimientoResumen({ tienePdf: true })} causaId={7} />
    );
    const { unmount } = renderWithPlan(<ul>{fila}</ul>, basicPlan());
    await waitFor(() => expect(screen.queryByText('PDF')).toBeNull());
    unmount();

    renderWithPlan(<ul>{fila}</ul>, premiumPlan());
    expect(await screen.findByText('PDF')).toBeTruthy();
  });

  it('el historial muestra T-15 en lugar de los datos del PDF', () => {
    expect(formatChangeValue('pdf', PDF_HIDDEN_BY_PLAN)).toBe('Disponible en el plan Premium');
    expect(formatChangeValue('pdf', null)).toBe('Sin PDF');
  });
});
