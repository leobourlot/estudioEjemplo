import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type ArchivoDescargado } from '../servicios/cliente-http';
import { saveFile } from '../servicios/descarga-pdf';
import { AccionesPdf } from './AccionesPdf';

vi.mock('../servicios/descarga-pdf', () => ({ saveFile: vi.fn() }));

function Inicio() {
  const state = useLocation().state as { aviso?: string } | null;
  return <p>Inicio: {state?.aviso ?? 'sin aviso'}</p>;
}

function renderAcciones(descargar: () => Promise<ArchivoDescargado>) {
  return render(
    <MemoryRouter initialEntries={['/panel/causas/3/movimientos/8']}>
      <Routes>
        <Route
          path="/panel/causas/3/movimientos/8"
          element={
            <AccionesPdf
              verHref="/panel/causas/3/movimientos/8/pdf"
              etiqueta="del movimiento del 24/10/2026"
              descargar={descargar}
              inicio="/panel"
            />
          }
        />
        <Route path="/panel" element={<Inicio />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Spec 010, T31 (RF-28, RF-37). */
describe('AccionesPdf', () => {
  beforeEach(() => vi.mocked(saveFile).mockClear());

  it('"Ver PDF" abre la ruta del PDF en una pestaña nueva y aislada, y se anuncia con su dato', () => {
    renderAcciones(vi.fn());

    const ver = screen.getByRole('link', {
      name: 'Ver el PDF del movimiento del 24/10/2026 (se abre en una pestaña nueva)',
    });
    expect(ver.textContent).toBe('Ver PDF');
    expect(ver.getAttribute('href')).toBe('/panel/causas/3/movimientos/8/pdf');
    expect(ver.getAttribute('target')).toBe('_blank');
    expect(ver.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('"Descargar PDF" pide el archivo y lo guarda con su nombre', async () => {
    const user = userEvent.setup();
    const blob = new Blob(['%PDF-1.4']);
    const descargar = vi.fn(async () => ({ blob, nombre: '2026-10-24 Resolucion K7Q2MX.pdf' }));
    renderAcciones(descargar);

    await user.click(screen.getByRole('button', { name: 'Descargar el PDF del movimiento del 24/10/2026' }));

    expect(descargar).toHaveBeenCalledTimes(1);
    expect(saveFile).toHaveBeenCalledWith(blob, '2026-10-24 Resolucion K7Q2MX.pdf');
  });

  it('ante un 404 lleva al inicio con el aviso "No existe ese PDF" (RF-37)', async () => {
    const user = userEvent.setup();
    renderAcciones(vi.fn(async () => Promise.reject(new ApiError(404, ['No existe ese PDF']))));

    await user.click(screen.getByRole('button', { name: /^Descargar el PDF/ }));

    await screen.findByText('Inicio: No existe ese PDF');
    expect(saveFile).not.toHaveBeenCalled();
  });

  it('un error de red se muestra sin salir de la pantalla', async () => {
    const user = userEvent.setup();
    renderAcciones(vi.fn(async () => Promise.reject(new ApiError(0, ['Sin conexión']))));

    await user.click(screen.getByRole('button', { name: /^Descargar el PDF/ }));

    expect((await screen.findByRole('alert')).textContent).toBe('Sin conexión');
  });
});
