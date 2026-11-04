import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  fakeModelosService,
  lawyerSession,
  renderModelsApp,
  testEscrito,
} from '../pruebas/modelos-de-prueba';
import { fakeMovimientosService, testMovimientoDetalle } from '../pruebas/movimientos-de-prueba';
import { ApiError } from '../servicios/cliente-http';
import { todayInBuenosAires } from '../servicios/movimiento-escrito';
import type { MovimientosService } from '../servicios/movimientos';

const ESCRITO = testEscrito({
  texto: 'Señor Director:\n\nLuis Gómez, DNI 20.111.222, solicita informe de dominio.',
});

async function openEscrito(movimientosOverrides: Partial<MovimientosService> = {}) {
  const movimientos = fakeMovimientosService({
    createMovement: vi.fn(async () => testMovimientoDetalle({ id: 31, causaId: 5 })),
    ...movimientosOverrides,
  });
  renderModelsApp('/panel/causas/5/modelos/8', {
    session: lawyerSession(),
    modelos: fakeModelosService({ completeModel: vi.fn().mockResolvedValue(ESCRITO) }),
    movimientos,
  });
  await screen.findByRole('region', { name: 'Escrito completado' });
  return { movimientos, user: userEvent.setup() };
}

const registerButton = () => screen.queryByRole('button', { name: 'Registrar como movimiento' });

describe('PanelEscrito: registrar como movimiento (RF-54, RF-55)', () => {
  it('completar y copiar el escrito no carga ningún movimiento', async () => {
    const { movimientos, user } = await openEscrito();

    await user.click(screen.getByRole('button', { name: 'Copiar' }));
    await screen.findByText('Escrito copiado');

    expect(movimientos.createMovement).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Guardar movimiento' })).toBeNull();
  });

  it('abre el formulario con el día de hoy, Escrito presentado y el título del modelo, oculto', async () => {
    const { user } = await openEscrito();

    await user.click(registerButton()!);

    const form = within(screen.getByRole('region', { name: 'Registrar como movimiento' }));
    expect((form.getByLabelText('Fecha') as HTMLInputElement).value).toBe(todayInBuenosAires());
    expect((form.getByLabelText('Tipo') as HTMLSelectElement).value).toBe('escrito_presentado');
    expect((form.getByLabelText('Descripción') as HTMLTextAreaElement).value).toBe(
      'Escrito: Oficio al Registro de la Propiedad',
    );
    expect(
      (form.getByLabelText('Texto para el cliente (opcional)') as HTMLTextAreaElement).value,
    ).toBe('');
    expect((form.getByLabelText('Visible para el cliente') as HTMLInputElement).checked).toBe(
      false,
    );
    expect(registerButton()).toBeNull();
  });

  it('guarda en la causa del escrito lo que quedó en el formulario, sin el texto del escrito', async () => {
    const { movimientos, user } = await openEscrito();
    await user.click(registerButton()!);

    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-10-29' } });
    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }));

    expect(movimientos.createMovement).toHaveBeenCalledExactlyOnceWith(5, {
      fecha: '2026-10-29',
      tipo: 'escrito_presentado',
      descripcion: 'Escrito: Oficio al Registro de la Propiedad',
      textoCliente: null,
      visible: false,
    });
    expect(JSON.stringify(movimientos.createMovement.mock.calls)).not.toContain('Señor Director');
  });

  it('al guardar avisa "Movimiento registrado" con el acceso al movimiento y no ofrece registrarlo otra vez', async () => {
    const { user } = await openEscrito();
    await user.click(registerButton()!);

    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }));

    const notice = await screen.findByRole('status');
    expect(notice.textContent).toContain('Movimiento registrado');
    expect(
      within(notice).getByRole('link', { name: 'Ver el movimiento' }).getAttribute('href'),
    ).toBe('/panel/causas/5/movimientos/31');
    expect(screen.queryByRole('region', { name: 'Registrar como movimiento' })).toBeNull();
    expect(registerButton()).toBeNull();
    // El escrito sigue a la vista y se puede copiar.
    expect(screen.getByRole('region', { name: 'Escrito completado' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeTruthy();
  });

  it('"Cancelar" cierra el formulario sin guardar y vuelve a ofrecer la opción', async () => {
    const { movimientos, user } = await openEscrito();
    await user.click(registerButton()!);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(movimientos.createMovement).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Registrar como movimiento' })).toBeNull();
    expect(registerButton()).toBeTruthy();
  });

  it('valida el formulario antes de enviar, con los mensajes de los movimientos', async () => {
    const { movimientos, user } = await openEscrito();
    await user.click(registerButton()!);

    await user.clear(screen.getByLabelText('Descripción'));
    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }));

    expect(screen.getByRole('alert').textContent).toBe('Indicá la descripción del movimiento');
    expect(movimientos.createMovement).not.toHaveBeenCalled();
  });

  it('muestra en el formulario el rechazo de la API y deja reintentar', async () => {
    const { user } = await openEscrito({
      createMovement: vi.fn().mockRejectedValue(new ApiError(409, ['La causa está desactivada'])),
    });
    await user.click(registerButton()!);

    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }));

    const form = within(screen.getByRole('region', { name: 'Registrar como movimiento' }));
    expect((await form.findByRole('alert')).textContent).toBe('La causa está desactivada');
    expect(form.getByRole('button', { name: 'Guardar movimiento' })).toBeTruthy();
    expect(screen.queryByText('Movimiento registrado')).toBeNull();
  });
});
