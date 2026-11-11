import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { testMovimientoDetalle, testMovimientoResumen } from '../pruebas/movimientos-de-prueba';
import { FilaMovimiento } from './FilaMovimiento';
import { HistorialCambios } from './HistorialCambios';

const fila = (pdf: { visible: boolean } | null) =>
  render(
    <MemoryRouter>
      <ul>
        <FilaMovimiento movimiento={testMovimientoResumen({ pdf })} causaId={7} />
      </ul>
    </MemoryRouter>,
  );

/** Spec 010, T34 (RF-21, RF-30). */
describe('el PDF en la fila y en el historial de cambios', () => {
  it('la fila muestra "PDF" y si es visible para el cliente', () => {
    fila({ visible: true });
    screen.getByText('PDF visible para el cliente');
  });

  it('o si está oculto', () => {
    fila({ visible: false });
    screen.getByText('PDF oculto para el cliente');
  });

  it('sin PDF, no muestra la leyenda', () => {
    fila(null);
    expect(screen.queryByText(/^PDF/)).toBeNull();
  });

  it('el historial muestra el cambio del PDF con su código, tamaño y visibilidad', () => {
    const movimiento = testMovimientoDetalle({
      cambios: [
        {
          id: 2,
          accion: 'modificacion',
          usuario: { id: 1, nombre: 'Luis', apellido: 'Sosa', activo: true },
          fechaHora: '2026-10-02T15:00:00.000Z',
          cambios: [
            { campo: 'pdf', anterior: null, nuevo: { codigo: 'K7Q2MX', tamano: 850_000, visible: false } },
          ],
        },
      ],
    });

    render(<HistorialCambios cambios={movimiento.cambios} />);

    screen.getByText('PDF');
    screen.getByText('Sin PDF');
    screen.getByText('K7Q2MX, 830 KB, oculto para el cliente');
  });
});
