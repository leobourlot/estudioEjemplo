import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProveedorServicios } from '../componentes/ProveedorServicios';
import { fakeMovimientosService, testMovimientoDetalle } from '../pruebas/movimientos-de-prueba';
import { openPdfInPlace, saveFile } from '../servicios/descarga-pdf';
import type { PdfDetalle } from '../servicios/movimientos';
import { PanelMovimientoDetalle } from './PanelMovimientoDetalle';
import { PanelMovimientoPdf } from './PanelPdf';

vi.mock('../servicios/descarga-pdf', () => ({ openPdfInPlace: vi.fn(), saveFile: vi.fn() }));

const PDF: PdfDetalle = {
  codigo: 'K7Q2MX',
  tamano: 850_000,
  visible: false,
  subidoPor: { id: 1, nombre: 'Luis', apellido: 'Sosa', activo: true },
  subidoEn: '2026-10-01T15:00:00.000Z',
};

const fileInput = () => screen.getByLabelText(/PDF$/, { selector: 'input[type="file"]' });

/** Spec 010, T37 (RNF de persistencia; principio 5). */
describe('los flujos con PDF no guardan nada en el navegador', () => {
  let escrituras: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    escrituras = vi.spyOn(Storage.prototype, 'setItem');
  });

  afterEach(() => escrituras.mockRestore());

  it('carga con archivo, reemplazo, descarga y apertura', async () => {
    const user = userEvent.setup();
    const movimiento = testMovimientoDetalle({ id: 12, causaId: 7, pdf: PDF });
    const movimientos = fakeMovimientosService({
      getMovement: vi.fn().mockResolvedValue(movimiento),
      updateMovement: vi.fn().mockResolvedValue(movimiento),
      getPdf: vi.fn().mockResolvedValue({ blob: new Blob(['%PDF-1.4']), nombre: 'x.pdf' }),
    });
    render(
      <MemoryRouter initialEntries={['/panel/causas/7/movimientos/12']}>
        <ProveedorServicios services={{ movimientos }}>
          <Routes>
            <Route path="/panel/causas/:id/movimientos/:movimientoId" element={<PanelMovimientoDetalle />} />
          </Routes>
        </ProveedorServicios>
      </MemoryRouter>,
    );

    // Descarga.
    await user.click(await screen.findByRole('button', { name: /^Descargar el PDF/ }));
    await waitFor(() => expect(saveFile).toHaveBeenCalled());

    // Reemplazo con un archivo nuevo.
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.upload(fileInput(), new File(['%PDF-1.4 nuevo'], 'nuevo.pdf', { type: 'application/pdf' }));
    await waitFor(() => screen.getByText(/PDF elegido/));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await user.click(screen.getByRole('button', { name: 'Sí, guardar' }));
    await waitFor(() => expect(movimientos.updateMovement).toHaveBeenCalled());

    // Apertura en su pestaña.
    render(
      <MemoryRouter initialEntries={['/panel/causas/7/movimientos/12/pdf']}>
        <ProveedorServicios services={{ movimientos }}>
          <Routes>
            <Route path="/panel/causas/:id/movimientos/:movimientoId/pdf" element={<PanelMovimientoPdf />} />
          </Routes>
        </ProveedorServicios>
      </MemoryRouter>,
    );
    await waitFor(() => expect(openPdfInPlace).toHaveBeenCalled());

    expect(escrituras).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
