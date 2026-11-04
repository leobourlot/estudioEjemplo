import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  fakeSessionService,
  findPanelHome,
  findScreenHeading,
  INICIO_PANEL,
  renderApp,
  testUser,
} from '../pruebas/aplicacion-de-prueba';
import { whatsappMenu } from '../pruebas/whatsapp-de-prueba';
import { ApiError, NETWORK_ERROR_MESSAGE } from '../servicios/cliente-http';
import type { UsuarioPropio } from '../servicios/sesion';
import { TEXTOS_INGRESO } from '../servicios/textos-aplicacion';
import { MARCA } from '../servicios/marca';
import { STUDIO_CONTACT } from '../servicios/datos-estudio';

async function openLogin(login: (documento: string, contrasena: string) => Promise<UsuarioPropio>) {
  const service = fakeSessionService({ login: vi.fn(login) });
  renderApp('/ingresar', service);
  await screen.findByRole('heading', { name: 'Ingresar' });
  return service;
}

async function submit(documento: string, contrasena: string) {
  const user = userEvent.setup();
  if (documento) await user.type(screen.getByLabelText('DNI o CUIT'), documento);
  if (contrasena) await user.type(screen.getByLabelText('Contraseña'), contrasena);
  await user.click(screen.getByRole('button', { name: 'Ingresar' }));
}

describe('PaginaIngreso (RF-8 a RF-10)', () => {
  it.each([
    ['admin', testUser('admin'), INICIO_PANEL],
    ['abogado', testUser('abogado'), INICIO_PANEL],
    ['cliente', testUser('cliente'), 'Mis causas'],
    [
      'con cambio pendiente',
      testUser('abogado', { debeCambiarContrasena: true }),
      'Cambiar contraseña',
    ],
  ])(
    'al ingresar como %s, lleva a donde indica resolveLandingRoute',
    async (_case, usuario, page) => {
      const service = await openLogin(async () => usuario);

      await submit('20.111.222', 'clave del estudio 2026');

      expect(await findScreenHeading(page)).toBeTruthy();
      expect(service.login).toHaveBeenCalledWith('20.111.222', 'clave del estudio 2026');
    },
  );

  it.each([
    ['401', new ApiError(401, ['DNI/CUIT o contraseña incorrectos'])],
    ['429', new ApiError(429, ['Demasiados intentos. Probá de nuevo en unos minutos'])],
    ['sin conexión', new ApiError(0, [NETWORK_ERROR_MESSAGE])],
  ])('muestra el mensaje de la API ante un %s y borra la contraseña', async (_case, error) => {
    await openLogin(async () => {
      throw error;
    });

    await submit('20.111.222', 'otra clave');

    expect((await screen.findByRole('alert')).textContent).toBe(error.message);
    expect(screen.getByRole('heading', { name: 'Ingresar' })).toBeTruthy();
    expect((screen.getByLabelText('Contraseña') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('DNI o CUIT') as HTMLInputElement).value).toBe('20.111.222');
  });

  it('pide completar los dos campos antes de enviar', async () => {
    const service = await openLogin(async () => testUser('admin'));

    await submit('20.111.222', '');

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Completá el DNI o CUIT y la contraseña',
    );
    expect(service.login).not.toHaveBeenCalled();
  });

  it('deshabilita el botón mientras espera la respuesta', async () => {
    let finish!: (usuario: UsuarioPropio) => void;
    await openLogin(() => new Promise((resolve) => (finish = resolve)));

    await submit('20.111.222', 'clave del estudio 2026');

    const button = screen.getByRole('button', { name: 'Ingresando…' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    finish(testUser('admin'));
    expect(await findPanelHome()).toBeTruthy();
  });

  it('usa campos de DNI o CUIT y contraseña con autocompletado del navegador', async () => {
    await openLogin(async () => testUser('admin'));

    const document = screen.getByLabelText('DNI o CUIT');
    expect(document.getAttribute('autocomplete')).toBe('username');
    // Texto con teclado numérico: acepta los puntos y guiones con que se suele escribir.
    expect(document.getAttribute('type')).toBe('text');
    expect(document.getAttribute('inputmode')).toBe('numeric');
    expect(screen.getByLabelText('Contraseña').getAttribute('type')).toBe('password');
    expect(screen.getByLabelText('Contraseña').getAttribute('autocomplete')).toBe(
      'current-password',
    );
  });
});

describe('PaginaIngreso en el sitio (spec 007, RF-3, RF-26, RF-33 y RF-34)', () => {
  it('el logo y el nombre del estudio llevan al sitio público', async () => {
    await openLogin(async () => testUser('abogado'));

    const home = screen.getByRole('link', { name: MARCA.nombre });
    expect(home.getAttribute('href')).toBe('/');
    expect(home.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('muestra el botón de WhatsApp, sin mensaje', async () => {
    await openLogin(async () => testUser('abogado'));

    expect(whatsappMenu().map((opcion) => [opcion.numero, opcion.mensaje])).toEqual(
      STUDIO_CONTACT.whatsapps.map((whatsapp) => [whatsapp.numero, null]),
    );
  });

  it('deja lugar abajo para que el botón no tape el formulario (RF-28)', async () => {
    await openLogin(async () => testUser('abogado'));

    expect(screen.getByRole('main').className).toContain('pb-24');
  });

  it('pone el título del documento', async () => {
    await openLogin(async () => testUser('abogado'));

    expect(document.title).toBe(`Ingresar · ${MARCA.nombre}`);
  });
});

describe('PaginaIngreso con la identidad del estudio (spec 008, RF-11 a RF-13)', () => {
  it('muestra T-1 en la marca y T-2 y T-3 en la tarjeta', async () => {
    await openLogin(async () => testUser('abogado'));

    expect(screen.getByText(TEXTOS_INGRESO.titulo)).toBeTruthy();
    const main = within(screen.getByRole('main'));
    expect(main.getByText(TEXTOS_INGRESO.indicacion)).toBeTruthy();
    expect(main.getByText(TEXTOS_INGRESO.olvido)).toBeTruthy();
    // T-1 no es un título: el único título principal sigue siendo "Ingresar".
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([
      'Ingresar',
    ]);
  });

  it('con el modo demo apagado, no muestra las cuentas de prueba (spec 009, RF-15)', async () => {
    await openLogin(async () => testUser('abogado'));

    expect(screen.queryByRole('region', { name: 'Cuentas de prueba' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Usar la cuenta/ })).toBeNull();
  });

  it('no muestra el texto que el estudio pidió quitar', async () => {
    await openLogin(async () => testUser('abogado'));

    expect(screen.queryByText(/Clientes e integrantes del estudio ingresan/)).toBeNull();
  });

  it('muestra la dirección y cada WhatsApp de la marca, sin mensaje', async () => {
    await openLogin(async () => testUser('abogado'));

    const { whatsapps, direccion } = STUDIO_CONTACT;
    const links = whatsapps.map((whatsapp) =>
      screen.getByRole('link', { name: `${whatsapp.nombre}: ${whatsapp.visible}` }),
    );
    links.forEach((link, index) => {
      expect(link.getAttribute('href')).toBe(`https://wa.me/${whatsapps[index].numero}`);
    });
    if (direccion) expect(links[0].closest('p')!.textContent).toContain(`${direccion} · `);
  });

  it('el aviso de error va dentro de la tarjeta, arriba de los campos', async () => {
    await openLogin(async () => testUser('admin'));

    await submit('20.111.222', '');

    const alert = await screen.findByRole('alert');
    expect(within(screen.getByRole('main')).getByRole('alert')).toBe(alert);
    expect(
      alert.compareDocumentPosition(screen.getByLabelText('DNI o CUIT')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
