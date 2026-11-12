import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { testMovimientoDetalle, testMovimientoResumen } from '../pruebas/movimientos-de-prueba';
import { FilaMovimiento } from './FilaMovimiento';
import { HistorialCambios } from './HistorialCambios';

const fila = (tienePdf: boolean) =>
  render(
    <MemoryRouter>
      <ul>
        <FilaMovimiento movimiento={testMovimientoResumen({ tienePdf })} causaId={7} />
      </ul>
    </MemoryRouter>,
  );

/** Spec 010, T34 (RF-21, RF-30). */
describe('el PDF en la fila y en el historial de cambios', () => {
  it('la fila muestra "PDF", sin visibilidad propia (RF-17, RF-30)', () => {
    fila(true);
    screen.getByText('PDF');
    expect(screen.queryByText(/PDF (visible|oculto)/)).toBeNull();
  });

  it('sin PDF, no muestra la leyenda', () => {
    fila(false);
    expect(screen.queryByText(/^PDF/)).toBeNull();
  });

  it('el historial muestra el cambio del PDF con su tamaño, sin código ni visibilidad', () => {
    const movimiento = testMovimientoDetalle({
      cambios: [
        {
          id: 2,
          accion: 'modificacion',
          usuario: { id: 1, nombre: 'Luis', apellido: 'Sosa', activo: true },
          fechaHora: '2026-10-02T15:00:00.000Z',
          cambios: [
            { campo: 'pdf', anterior: null, nuevo: { codigo: 'K7Q2MX', tamano: 850_000 } },
          ],
        },
      ],
    });

    render(<HistorialCambios cambios={movimiento.cambios} />);

    screen.getByText('PDF');
    screen.getByText('Sin PDF');
    screen.getByText('830 KB');
    expect(screen.queryByText(/K7Q2MX/)).toBeNull();
  });
});
