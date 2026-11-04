import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CONTRASENA_DEMO, CUENTAS_DEMO, TEXTOS_CUENTAS_DEMO } from '../servicios/cuentas-demo';
import { CuentasDemo } from './CuentasDemo';

const box = () => screen.getByRole('region', { name: TEXTOS_CUENTAS_DEMO.titulo });

describe('CuentasDemo (spec 009, RF-16 y RF-17)', () => {
  it('muestra el título, el texto y las tres cuentas en orden, con su DNI y la contraseña', () => {
    render(<CuentasDemo onUse={vi.fn()} />);

    expect(
      within(box()).getByRole('heading', { level: 2, name: TEXTOS_CUENTAS_DEMO.titulo }),
    ).toBeTruthy();
    expect(within(box()).getByText(TEXTOS_CUENTAS_DEMO.texto)).toBeTruthy();
    const items = within(box()).getAllByRole('listitem');
    expect(items).toHaveLength(CUENTAS_DEMO.length);
    items.forEach((item, index) => {
      const cuenta = CUENTAS_DEMO[index];
      expect(item.textContent).toContain(`${cuenta.rol}: ${cuenta.nombre}`);
      expect(item.textContent).toContain(`${TEXTOS_CUENTAS_DEMO.dni}: ${cuenta.dni}`);
      expect(item.textContent).toContain(`${TEXTOS_CUENTAS_DEMO.contrasena}: ${CONTRASENA_DEMO}`);
    });
  });

  it('cada botón se ve como "Usar esta cuenta" y se anuncia con el rol y el nombre', () => {
    render(<CuentasDemo onUse={vi.fn()} />);

    for (const cuenta of CUENTAS_DEMO) {
      const button = within(box()).getByRole('button', { name: cuenta.etiqueta });
      expect(button.textContent).toBe(TEXTOS_CUENTAS_DEMO.usar);
      expect(button.getAttribute('type')).toBe('button');
    }
  });

  it('al elegir una cuenta, avisa cuál se eligió', async () => {
    const onUse = vi.fn();
    render(<CuentasDemo onUse={onUse} />);

    await userEvent.setup().click(screen.getByRole('button', { name: CUENTAS_DEMO[1].etiqueta }));

    expect(onUse).toHaveBeenCalledWith(CUENTAS_DEMO[1]);
  });
});
