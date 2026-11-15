import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
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
import { basicPlan, fakePlanService } from '../pruebas/plan-de-prueba';
import { fakePortalService } from '../pruebas/portal-de-prueba';
import { RutasAplicacion } from '../RutasAplicacion';
import { ApiError } from '../servicios/cliente-http';
import { PLAN_TEXTS } from '../servicios/plan';

vi.mock('../servicios/descarga-pdf', () => ({ openPdfInPlace: vi.fn(), saveFile: vi.fn() }));

const T4 = () => Promise.reject(new ApiError(403, [PLAN_TEXTS.featureNotIncluded]));

function renderPdf(path: string) {
  const movimientos = fakeMovimientosService({ getPdf: vi.fn(T4) as never });
  const jurisprudencia = fakeJurisprudenciaService({ getPdf: vi.fn(T4) as never });
  render(
    <MemoryRouter initialEntries={[path]}>
      <ProveedorServicios
        services={{
          users: fakeUsersService(),
          movimientos,
          jurisprudencia,
          portal: fakePortalService(),
          plan: fakePlanService(basicPlan()),
        }}
      >
        <ProveedorSesion
          service={fakeSessionService({
            fetchOwnUser: vi.fn().mockResolvedValue(testUser('abogado')),
          })}
        >
          <RutasAplicacion />
        </ProveedorSesion>
      </ProveedorServicios>
    </MemoryRouter>,
  );
}

/** Spec 011, RF-7 y RF-12: las direcciones de PDF con el plan Básico. */
describe('direcciones de PDF con el plan Básico', () => {
  it('el PDF de un movimiento lleva al inicio del panel con T-4 como aviso', async () => {
    renderPdf('/panel/causas/3/movimientos/8/pdf');

    await findPanelHome();
    const aviso = await screen.findByText(PLAN_TEXTS.featureNotIncluded);
    expect(aviso.getAttribute('role')).toBe('status');
  });

  it('el PDF de un fallo lleva a la jurisprudencia, que muestra T-2', async () => {
    renderPdf('/panel/jurisprudencia/5/pdf');

    expect(await screen.findByText(PLAN_TEXTS.jurisprudenciaText)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Jurisprudencia', level: 1 })).toBeTruthy();
  });
});
