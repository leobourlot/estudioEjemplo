import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NombreEstudio } from './NombreEstudio';
import { MARCA } from '../servicios/marca';

describe('NombreEstudio (spec 007, RF-3)', () => {
  it('muestra el nombre en dos líneas, y la primera no se corta', () => {
    render(<NombreEstudio />);

    const first = screen.getByText(MARCA.nombreLineas[0]);
    const second = screen.getByText(MARCA.nombreLineas[1]);
    expect(first.className).toContain('whitespace-nowrap');
    expect(first.parentElement).toBe(second.parentElement);
    expect(first.parentElement!.className).toContain('flex-col');
  });

  it('se lee completo: su texto es el nombre exacto del estudio', () => {
    render(<NombreEstudio />);

    expect(screen.getByText(MARCA.nombreLineas[0]).parentElement!.textContent).toBe(MARCA.nombre);
    expect(screen.getByText('-').className).toContain('sr-only');
  });
});

describe('NombreEstudio junto al logo', () => {
  it('con "centrado", la segunda línea va centrada debajo de la primera', () => {
    render(<NombreEstudio centrado />);

    const name = screen.getByText(MARCA.nombreLineas[0]).parentElement!;
    expect(name.className).toContain('items-center');
    expect(name.className).toContain('text-center');
  });

  it('sin "centrado", las dos líneas van alineadas a la izquierda', () => {
    render(<NombreEstudio />);

    expect(screen.getByText(MARCA.nombreLineas[0]).parentElement!.className).not.toContain(
      'items-center',
    );
  });
});

describe('NombreEstudio dentro de un enlace', () => {
  it('el enlace se anuncia con el nombre completo, con sus espacios', () => {
    render(
      <a href="/">
        <NombreEstudio />
      </a>,
    );

    expect(screen.getByRole('link', { name: MARCA.nombre })).toBeTruthy();
  });
});
