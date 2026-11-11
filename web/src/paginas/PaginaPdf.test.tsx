import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProveedorServicios } from '../componentes/ProveedorServicios';
import { ProveedorSesion } from '../componentes/ProveedorSesion';
import {
  fakeSessionService,
  fakeUsersService,
  findPanelHome,
  testUser,
} from '../pruebas/aplicacion-de-prueba';
import { fakeJurisprudenciaService } from '../pruebas/jurisprudencia-de-prueba';
import { fakeMovimientosService } from '../pruebas/movimientos-de-prueba';
import { fakePortalService } from '../pruebas/portal-de-prueba';
import { RutasAplicacion } from '../RutasAplicacion';
import { ApiError } from '../servicios/cliente-http';
import { openPdfInPlace } from '../servicios/descarga-pdf';
import type { Rol } from '../servicios/sesion';

vi.mock('../servicios/descarga-pdf', () => ({ openPdfInPlace: vi.fn(), saveFile: vi.fn() }));

const ARCHIVO = { blob: new Blob(['%PDF-1.4']), nombre: 'x.pdf' };

function renderPdf(path: string, rol: Rol | null, getPdf: () => Promise<unknown>) {
  const movimientos = fakeMovimientosService({ getPdf: vi.fn(getPdf) as never });
  const jurisprudencia = fakeJurisprudenciaService({ getPdf: vi.fn(getPdf) as never });
  const portal = fakePortalService({ getPdf: vi.fn(getPdf) as never });
  const session = fakeSessionService({
    fetchOwnUser: vi.fn().mockResolvedValue(rol ? testUser(rol) : null),
  });
  render(
    <MemoryRouter initialEntries={[path]}>
      <ProveedorServicios services={{ users: fakeUsersService(), movimientos, jurisprudencia, portal }}>
        <ProveedorSesion service={session}>
          <RutasAplicacion />
        </ProveedorSesion>
      </ProveedorServicios>
    </MemoryRouter>,
  );
  return { movimientos, jurisprudencia, portal };
}

/** Spec 010, T32 (RF-28, RF-37; plan 010, D4). */
describe('PaginaPdf y sus rutas', () => {
  beforeEach(() => vi.mocked(openPdfInPlace).mockClear());

  it('muestra "Abriendo el PDF…" y abre el PDF del movimiento del panel', async () => {
    const { movimientos } = renderPdf('/panel/causas/3/movimientos/8/pdf', 'abogado', async () => ARCHIVO);

    expect((await screen.findByText('Abriendo el PDF…')).getAttribute('role')).toBe('status');
    await waitFor(() => expect(openPdfInPlace).toHaveBeenCalledWith(ARCHIVO.blob));
    expect(movimientos.getPdf).toHaveBeenCalledWith(3, 8);
  });

  it('abre el PDF de un fallo', async () => {
    const { jurisprudencia } = renderPdf('/panel/jurisprudencia/5/pdf', 'admin', async () => ARCHIVO);

    await waitFor(() => expect(openPdfInPlace).toHaveBeenCalledWith(ARCHIVO.blob));
    expect(jurisprudencia.getPdf).toHaveBeenCalledWith(5);
  });

  it('abre el PDF de un movimiento del portal', async () => {
    const { portal } = renderPdf('/portal/causas/3/movimientos/8/pdf', 'cliente', async () => ARCHIVO);

    await waitFor(() => expect(openPdfInPlace).toHaveBeenCalledWith(ARCHIVO.blob));
    expect(portal.getPdf).toHaveBeenCalledWith('3', '8');
  });

  it.each([404, 403])('ante un %i lleva al inicio de su sección con el aviso (RF-37)', async (status) => {
    renderPdf('/panel/causas/3/movimientos/8/pdf', 'abogado', async () =>
      Promise.reject(new ApiError(status, ['No existe ese PDF'])),
    );

    await findPanelHome();
    expect(screen.getByRole('status').textContent).toBe('No existe ese PDF');
    expect(openPdfInPlace).not.toHaveBeenCalled();
  });

  it('el portal lleva al inicio del portal con el aviso', async () => {
    renderPdf('/portal/causas/3/movimientos/8/pdf', 'cliente', async () =>
      Promise.reject(new ApiError(404, ['No existe ese PDF'])),
    );

    await screen.findByText('No existe ese PDF');
    screen.getByRole('heading', { name: 'Mis causas' });
  });

  it.each([
    '/panel/causas/3/movimientos/8/pdf',
    '/panel/jurisprudencia/5/pdf',
    '/portal/causas/3/movimientos/8/pdf',
  ])('sin sesión, %s lleva a /ingresar', async (path) => {
    const services = renderPdf(path, null, async () => ARCHIVO);

    await screen.findByRole('button', { name: 'Ingresar' });
    expect(services.movimientos.getPdf).not.toHaveBeenCalled();
    expect(services.portal.getPdf).not.toHaveBeenCalled();
  });
});
