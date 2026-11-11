import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { FilaFallo } from '../componentes/FilaFallo';
import { ProveedorServicios } from '../componentes/ProveedorServicios';
import {
  fakeJurisprudenciaService,
  testFalloDetalle,
  testFalloResumen,
} from '../pruebas/jurisprudencia-de-prueba';
import { ApiError } from '../servicios/cliente-http';
import type { FalloDetalle, JurisprudenciaService, PdfFalloDetalle } from '../servicios/jurisprudencia';
import { PanelFalloDetalle } from './PanelFalloDetalle';
import { PanelFalloNuevo } from './PanelFalloNuevo';

const PDF: PdfFalloDetalle = {
  codigo: 'P4N8RC',
  tamano: 2_300_000,
  subidoPor: { id: 1, nombre: 'Luis', apellido: 'Sosa', activo: true },
  subidoEn: '2026-10-01T15:00:00.000Z',
};

function renderPage(path: string, jurisprudencia: JurisprudenciaService) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ProveedorServicios services={{ jurisprudencia }}>
        <Routes>
          <Route path="/panel/jurisprudencia/nuevo" element={<PanelFalloNuevo />} />
          <Route path="/panel/jurisprudencia/:id" element={<PanelFalloDetalle />} />
        </Routes>
      </ProveedorServicios>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

const fileInput = () => screen.getByLabelText(/PDF$/, { selector: 'input[type="file"]' });
const pdfFile = () => new File(['%PDF-1.4'], 'fallo.pdf', { type: 'application/pdf' });

/** Completa los datos obligatorios del formulario de un fallo. */
async function fillRuling(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Carátula'), 'Pérez c/ Gómez');
  await user.type(screen.getByLabelText('Tribunal'), 'CNCiv., Sala A');
  await user.selectOptions(screen.getByLabelText('Fuero'), 'civil');
  await user.type(screen.getByLabelText('Fecha del fallo'), '2019-05-12');
  await user.type(screen.getByLabelText('Sumario'), 'Sumario del fallo.');
  const palabra = screen.getByLabelText(/Palabras clave/);
  await user.type(palabra, 'daño moral{Enter}');
}

const repetido = () =>
  new ApiError(409, ['Ya existe un fallo con esa carátula, tribunal y fecha'], {
    codigo: 'FALLO_REPETIDO',
    fallo: { id: 9, caratula: 'Pérez c/ Gómez', tribunal: 'CNCiv., Sala A', fecha: '2019-05-12', numero: null },
  });

/** Spec 010, T35 (RF-24 a RF-27, RF-32). */
describe('PDF de los fallos en la web', () => {
  it('la fila del listado muestra "PDF" solo si tiene', () => {
    const { rerender } = render(
      <MemoryRouter>
        <ul>
          <FilaFallo fallo={testFalloResumen({ tienePdf: true })} />
        </ul>
      </MemoryRouter>,
    );
    screen.getByText('PDF');
    rerender(
      <MemoryRouter>
        <ul>
          <FilaFallo fallo={testFalloResumen({ tienePdf: false })} />
        </ul>
      </MemoryRouter>,
    );
    expect(screen.queryByText('PDF')).toBeNull();
  });

  it('el formulario de carga ofrece el PDF sin casilla de visibilidad (RF-27)', async () => {
    renderPage('/panel/jurisprudencia/nuevo', fakeJurisprudenciaService());

    fileInput();
    expect(screen.queryByRole('checkbox', { name: /visible/ })).toBeNull();
  });

  it('la pregunta de repetido reenvía el mismo archivo con confirmarRepetido (RF-25)', async () => {
    const createRuling = vi
      .fn()
      .mockRejectedValueOnce(repetido())
      .mockResolvedValueOnce(testFalloDetalle({ id: 10 }));
    const user = renderPage('/panel/jurisprudencia/nuevo', fakeJurisprudenciaService({ createRuling }));

    await fillRuling(user);
    const archivo = pdfFile();
    await user.upload(fileInput(), archivo);
    await waitFor(() => screen.getByText(/PDF elegido/));
    await user.click(screen.getByRole('button', { name: 'Guardar fallo' }));
    await user.click(await screen.findByRole('button', { name: 'Guardar igual' }));

    expect(createRuling).toHaveBeenCalledTimes(2);
    expect(createRuling.mock.calls[0][1]).toBe(archivo);
    expect(createRuling.mock.calls[1][0]).toMatchObject({ confirmarRepetido: true });
    expect(createRuling.mock.calls[1][1]).toBe(archivo);
  });

  describe('ficha del fallo', () => {
    const open = (fallo: FalloDetalle, overrides: Partial<JurisprudenciaService> = {}) =>
      renderPage(
        `/panel/jurisprudencia/${fallo.id}`,
        fakeJurisprudenciaService({ getRuling: vi.fn().mockResolvedValue(fallo), ...overrides }),
      );

    it('muestra el PDF con su tamaño, autor, fecha y acciones', async () => {
      open(testFalloDetalle({ id: 5, fecha: '2019-05-12', pdf: PDF, tienePdf: true }));

      const datos = within(await screen.findByRole('region', { name: 'Datos del fallo' }));
      datos.getByText(/2 MB, subido por Sosa, Luis/);
      datos.getByRole('link', { name: 'Ver el PDF del fallo del 12/05/2019 (se abre en una pestaña nueva)' });
      datos.getByRole('button', { name: 'Descargar el PDF del fallo del 12/05/2019' });
    });

    it('un fallo desactivado muestra el PDF, pero no ofrece cambiarlo (RF-26)', async () => {
      open(testFalloDetalle({ id: 5, activo: false, pdf: PDF, tienePdf: true }));

      await screen.findByRole('region', { name: 'Datos del fallo' });
      screen.getByRole('button', { name: /^Descargar el PDF/ });
      expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
      expect(screen.queryByLabelText(/PDF$/, { selector: 'input[type="file"]' })).toBeNull();
    });

    it('quitar el PDF pide confirmación y envía quitarPdf', async () => {
      const updateRuling = vi.fn().mockResolvedValue(testFalloDetalle({ id: 5 }));
      const user = open(testFalloDetalle({ id: 5, pdf: PDF, tienePdf: true }), { updateRuling });

      await user.click(await screen.findByRole('button', { name: 'Editar' }));
      await user.click(screen.getByRole('button', { name: 'Quitar PDF' }));
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
      expect(updateRuling).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: 'Sí, guardar' }));

      expect(updateRuling).toHaveBeenCalledWith(5, { quitarPdf: true });
    });
  });
});
