import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProveedorServicios } from '../componentes/ProveedorServicios';
import {
  fakePortalService,
  testMovimientoCliente,
  testMovimientoClienteDetalle,
  testPortalPage,
} from '../pruebas/portal-de-prueba';
import type { MovimientoCliente } from '../servicios/portal';
import { PortalCausaDetalle } from './PortalCausaDetalle';
import { PortalMovimientoDetalle } from './PortalMovimientoDetalle';

function renderPortal(path: string, movimiento: MovimientoCliente) {
  const portal = fakePortalService({
    listMovimientos: vi.fn(async () => testPortalPage([movimiento])),
    getMovimiento: vi.fn(async () => testMovimientoClienteDetalle(movimiento)),
  });
  render(
    <MemoryRouter initialEntries={[path]}>
      <ProveedorServicios services={{ portal }}>
        <Routes>
          <Route path="/portal/causas/:id" element={<PortalCausaDetalle />} />
          <Route path="/portal/causas/:id/movimientos/:movimientoId" element={<PortalMovimientoDetalle />} />
        </Routes>
      </ProveedorServicios>
    </MemoryRouter>,
  );
}

const CON_PDF = testMovimientoCliente({ id: 70, fecha: '2026-09-30', tienePdf: true });
const SIN_PDF = testMovimientoCliente({ id: 70, fecha: '2026-09-30', tienePdf: false });

/** Spec 010, T36 (RF-34, RF-35). */
describe('el PDF en el portal', () => {
  it.each([
    ['la lista de movimientos', '/portal/causas/3'],
    ['el movimiento abierto', '/portal/causas/3/movimientos/70'],
  ])('%s muestra "PDF" y las acciones solo con tienePdf', async (_caso, path) => {
    renderPortal(path, CON_PDF);

    const ver = await screen.findByRole('link', {
      name: 'Ver el PDF del movimiento del 30/09/2026 (se abre en una pestaña nueva)',
    });
    expect(ver.getAttribute('href')).toBe('/portal/causas/3/movimientos/70/pdf');
    screen.getByRole('button', { name: 'Descargar el PDF del movimiento del 30/09/2026' });
    screen.getByText('PDF');
    // Nunca el tamaño (RF-35).
    expect(screen.queryByText(/\d+ (KB|MB)/)).toBeNull();
  });

  it.each([
    ['la lista de movimientos', '/portal/causas/3'],
    ['el movimiento abierto', '/portal/causas/3/movimientos/70'],
  ])('%s sin PDF visible no deja ningún indicio', async (_caso, path) => {
    renderPortal(path, SIN_PDF);

    await screen.findByText(SIN_PDF.texto);
    expect(screen.queryByText('PDF')).toBeNull();
    expect(screen.queryByRole('link', { name: /PDF/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /PDF/ })).toBeNull();
  });
});
