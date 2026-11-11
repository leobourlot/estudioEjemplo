import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProveedorServicios } from '../componentes/ProveedorServicios';
import {
  fakeMovimientosService,
  type FakeMovimientosService,
  testMovimientoDetalle,
} from '../pruebas/movimientos-de-prueba';
import { ApiError } from '../servicios/cliente-http';
import type { MovimientoDetalle, PdfDetalle } from '../servicios/movimientos';
import { PanelMovimientoDetalle } from './PanelMovimientoDetalle';

const PDF: PdfDetalle = {
  codigo: 'K7Q2MX',
  tamano: 850_000,
  visible: true,
  subidoPor: { id: 2, nombre: 'Ana', apellido: 'Paz', activo: false },
  subidoEn: '2026-10-01T15:00:00.000Z',
};

const detail = (overrides: Partial<MovimientoDetalle> = {}) =>
  testMovimientoDetalle({ id: 12, causaId: 7, fecha: '2024-10-24', visible: true, ...overrides });

async function openDetail(
  movimiento: MovimientoDetalle,
  overrides: Partial<FakeMovimientosService> = {},
) {
  const movimientos = fakeMovimientosService({
    getMovement: vi.fn().mockResolvedValue(movimiento),
    ...overrides,
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
  await screen.findByRole('region', { name: 'Datos del movimiento' });
  return { movimientos, user: userEvent.setup() };
}

const fileInput = () => screen.getByLabelText(/PDF$/, { selector: 'input[type="file"]' });
const pdfFile = () => new File(['%PDF-1.4'], 'nuevo.pdf', { type: 'application/pdf' });

/** Spec 010, T33 y T34 (RF-11 a RF-13, RF-19, RF-31). */
describe('PanelMovimientoDetalle con PDF', () => {
  describe('sección del PDF (RF-31)', () => {
    it('muestra tamaño, autor marcado si está desactivado, fecha, visibilidad y las acciones', async () => {
      await openDetail(detail({ pdf: PDF }));

      const datos = within(screen.getByRole('region', { name: 'Datos del movimiento' }));
      datos.getByText(/830 KB, subido por Paz, Ana \(desactivado\)/);
      datos.getByText(/Visible para el cliente\./);
      datos.getByRole('link', { name: 'Ver el PDF del movimiento del 24/10/2024 (se abre en una pestaña nueva)' });
      datos.getByRole('button', { name: 'Descargar el PDF del movimiento del 24/10/2024' });
    });

    it('sin PDF dice "Sin PDF"', async () => {
      await openDetail(detail());

      within(screen.getByRole('region', { name: 'Datos del movimiento' })).getByText('Sin PDF');
    });
  });

  describe('restaurar (RF-19)', () => {
    it('un movimiento visible con PDF visible pide confirmación antes de restaurar', async () => {
      const restoreMovement = vi.fn().mockResolvedValue(detail({ pdf: PDF }));
      const { user } = await openDetail(detail({ anulado: true, pdf: PDF }), { restoreMovement });

      await user.click(screen.getByRole('button', { name: 'Restaurar' }));

      expect(screen.getByRole('alertdialog').textContent).toContain(
        'Al restaurarlo, el cliente volverá a ver este movimiento y su PDF',
      );
      expect(restoreMovement).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: 'Sí, restaurar' }));
      expect(restoreMovement).toHaveBeenCalledWith(7, 12);
    });

    it('cancelar no restaura', async () => {
      const restoreMovement = vi.fn();
      const { user } = await openDetail(detail({ anulado: true, pdf: PDF }), { restoreMovement });

      await user.click(screen.getByRole('button', { name: 'Restaurar' }));
      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(restoreMovement).not.toHaveBeenCalled();
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it.each([
      ['el PDF oculto', detail({ anulado: true, pdf: { ...PDF, visible: false } })],
      ['el movimiento oculto', detail({ anulado: true, visible: false, pdf: PDF })],
      ['sin PDF', detail({ anulado: true })],
    ])('con %s restaura sin preguntar', async (_caso, movimiento) => {
      const restoreMovement = vi.fn().mockResolvedValue(movimiento);
      const { user } = await openDetail(movimiento, { restoreMovement });

      await user.click(screen.getByRole('button', { name: 'Restaurar' }));

      expect(restoreMovement).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });
  });

  describe('guardar con PDF (RF-10 a RF-12)', () => {
    it('envía los cambios y el archivo en un solo pedido', async () => {
      const updateMovement = vi.fn().mockResolvedValue(detail({ pdf: PDF }));
      const { user } = await openDetail(detail(), { updateMovement });

      await user.click(screen.getByRole('button', { name: 'Editar' }));
      await user.upload(fileInput(), pdfFile());
      await waitFor(() => screen.getByText(/PDF elegido/));
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      expect(updateMovement).toHaveBeenCalledTimes(1);
      const [causa, movimiento, cambios, archivo] = updateMovement.mock.calls[0];
      expect([causa, movimiento, cambios]).toEqual([7, 12, { pdfVisible: false }]);
      expect(archivo).toBeInstanceOf(File);
    });

    it('un error de red muestra "No se pudo guardar. Probá de nuevo" y conserva lo escrito y el archivo', async () => {
      const updateMovement = vi.fn().mockRejectedValue(new ApiError(0, ['Sin conexión']));
      const { user } = await openDetail(detail(), { updateMovement });

      await user.click(screen.getByRole('button', { name: 'Editar' }));
      const descripcion = screen.getByLabelText('Descripción');
      await user.clear(descripcion);
      await user.type(descripcion, 'Texto nuevo');
      await user.upload(fileInput(), pdfFile());
      await waitFor(() => screen.getByText(/PDF elegido/));
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      await screen.findByText('No se pudo guardar. Probá de nuevo');
      expect((screen.getByLabelText('Descripción') as HTMLTextAreaElement).value).toBe('Texto nuevo');
      screen.getByText(/PDF elegido/);
    });

    it('un rechazo del archivo lo descarta; uno de otro dato lo conserva (RF-11)', async () => {
      const updateMovement = vi
        .fn()
        .mockRejectedValueOnce(new ApiError(400, ['Indicá la descripción del movimiento']))
        .mockRejectedValueOnce(new ApiError(400, ['El archivo debe ser un PDF']));
      const { user } = await openDetail(detail(), { updateMovement });

      await user.click(screen.getByRole('button', { name: 'Editar' }));
      await user.upload(fileInput(), pdfFile());
      await waitFor(() => screen.getByText(/PDF elegido/));

      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
      await screen.findByText('Indicá la descripción del movimiento');
      screen.getByText(/PDF elegido/);

      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
      // En la lista de errores y en el aviso del campo, que ofrece "Descartar".
      expect(await screen.findAllByText('El archivo debe ser un PDF')).toHaveLength(2);
      screen.getByRole('button', { name: 'Descartar' });
      expect(screen.queryByText(/PDF elegido/)).toBeNull();
      screen.getByText('Sin PDF');
    });
  });
});
