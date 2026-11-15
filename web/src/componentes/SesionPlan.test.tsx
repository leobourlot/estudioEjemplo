import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  fakeSessionService,
  findPanelHome,
  renderApp,
  testUser,
} from '../pruebas/aplicacion-de-prueba';
import { ApiError, createHttpClient } from '../servicios/cliente-http';
import { PLAN_TEXTS } from '../servicios/plan';

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** Spec 011, RF-21: T-6 al ingresar y al cerrarse la sesión de una cuenta fuera del plan. */
describe('sesión de una cuenta fuera del plan', () => {
  it('la renovación rechazada con T-6 avisa el cierre con el mensaje', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(401, { statusCode: 401, message: 'Sesión vencida' }))
      .mockResolvedValueOnce(
        jsonResponse(401, { statusCode: 401, message: PLAN_TEXTS.outsidePlanLogin }),
      );
    const client = createHttpClient({ baseUrl: 'https://api.estudio.com', fetch: fetchMock });
    const listener = vi.fn();
    client.onSessionClosed(listener);

    await expect(client.get('/panel/causas')).rejects.toBeInstanceOf(ApiError);

    expect(listener).toHaveBeenCalledWith(PLAN_TEXTS.outsidePlanLogin);
  });

  it('si la api cierra la sesión con T-6, la pantalla de ingreso lo muestra', async () => {
    const service = fakeSessionService({
      fetchOwnUser: vi.fn().mockResolvedValue(testUser('abogado')),
    });
    const { closeSession } = renderApp('/panel', service);
    await findPanelHome();

    closeSession(PLAN_TEXTS.outsidePlanLogin);

    expect(await screen.findByText(PLAN_TEXTS.outsidePlanLogin)).toBeTruthy();
  });

  it('si la cierra por otro motivo, la pantalla de ingreso no muestra T-6', async () => {
    const service = fakeSessionService({
      fetchOwnUser: vi.fn().mockResolvedValue(testUser('abogado')),
    });
    const { closeSession } = renderApp('/panel', service);
    await findPanelHome();

    closeSession();

    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeTruthy();
    expect(screen.queryByText(PLAN_TEXTS.outsidePlanLogin)).toBeNull();
  });

  it('un 403 T-6 al ingresar se muestra como error', async () => {
    const service = fakeSessionService({
      login: vi.fn().mockRejectedValue(new ApiError(403, [PLAN_TEXTS.outsidePlanLogin])),
    });
    renderApp('/ingresar', service);
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/DNI/), '20111222');
    await user.type(screen.getByLabelText('Contraseña'), 'una clave');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    const error = await screen.findByText(PLAN_TEXTS.outsidePlanLogin);
    expect(error.closest('[role="alert"]')).not.toBeNull();
  });
});
