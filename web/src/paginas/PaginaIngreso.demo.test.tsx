import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeSessionService, renderApp, testUser } from '../pruebas/aplicacion-de-prueba';
import { CONTRASENA_DEMO, CUENTAS_DEMO, TEXTOS_CUENTAS_DEMO } from '../servicios/cuentas-demo';
import { TEXTOS_INGRESO } from '../servicios/textos-aplicacion';

// La pantalla de ingreso con el modo demo encendido (spec 009, RF-15 a RF-17). El resto de sus
// tests, con el modo apagado, están en PaginaIngreso.test.tsx.
vi.mock('../servicios/modo-demo', () => ({ DEMO_MODE: true, isDemoEnabled: () => true }));

async function openLogin() {
  const service = fakeSessionService({ login: vi.fn(async () => testUser('admin')) });
  renderApp('/ingresar', service);
  await screen.findByRole('heading', { name: 'Ingresar' });
  return service;
}

const field = (label: string) => screen.getByLabelText<HTMLInputElement>(label);
const loginButton = () => screen.getByRole('button', { name: 'Ingresar' });

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('PaginaIngreso en modo demo (spec 009, RF-16 y RF-17)', () => {
  it('muestra las cuentas de prueba dentro de la tarjeta, después de T-3', async () => {
    await openLogin();

    const main = screen.getByRole('main');
    const box = within(main).getByRole('region', { name: TEXTOS_CUENTAS_DEMO.titulo });
    const forgot = within(main).getByText(TEXTOS_INGRESO.olvido);
    expect(forgot.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(box).getAllByRole('listitem')).toHaveLength(CUENTAS_DEMO.length);
    // Sigue habiendo un solo título principal.
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([
      'Ingresar',
    ]);
  });

  it('"Usar esta cuenta" reemplaza lo escrito, borra el aviso y deja el foco en "Ingresar"', async () => {
    const user = userEvent.setup();
    const service = await openLogin();
    await user.click(loginButton());
    expect(await screen.findByRole('alert')).toBeTruthy();
    await user.type(field('DNI o CUIT'), '99999999');

    const cuenta = CUENTAS_DEMO[2];
    await user.click(screen.getByRole('button', { name: cuenta.etiqueta }));

    expect(field('DNI o CUIT').value).toBe(cuenta.dni);
    expect(field('Contraseña').value).toBe(CONTRASENA_DEMO);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(document.activeElement).toBe(loginButton());
    expect(service.login).not.toHaveBeenCalled();
  });

  it('con la cuenta elegida, "Ingresar" ingresa como siempre (spec 001)', async () => {
    const user = userEvent.setup();
    const service = await openLogin();

    await user.click(screen.getByRole('button', { name: CUENTAS_DEMO[0].etiqueta }));
    await user.click(loginButton());

    expect(service.login).toHaveBeenCalledWith(CUENTAS_DEMO[0].dni, CONTRASENA_DEMO);
  });

  it('no guarda nada en el navegador (constitución, principio 5)', async () => {
    const user = userEvent.setup();
    await openLogin();

    await user.click(screen.getByRole('button', { name: CUENTAS_DEMO[1].etiqueta }));

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
