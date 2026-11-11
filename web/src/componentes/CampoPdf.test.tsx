import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { initialPdfState, type PdfFormState } from '../servicios/formulario-pdf';
import { CampoPdf, type PdfGuardadoInfo } from './CampoPdf';

const GUARDADO: PdfGuardadoInfo = {
  tamano: 850_000,
  subidoPor: { id: 1, nombre: 'Luis', apellido: 'Sosa', activo: false },
  subidoEn: '2026-10-01T15:00:00.000Z',
};

const pdfFile = (contenido = '%PDF-1.4 contenido') =>
  new File([contenido], 'escrito <final>.pdf', { type: 'application/pdf' });

/** El campo con su estado, como lo usa un formulario. */
function ConEstado({
  inicial,
  conVisibilidad = true,
  guardado = null,
}: {
  inicial: PdfFormState;
  conVisibilidad?: boolean;
  guardado?: PdfGuardadoInfo | null;
}) {
  const [estado, setEstado] = useState(inicial);
  return (
    <>
      <CampoPdf estado={estado} onChange={setEstado} conVisibilidad={conVisibilidad} guardado={guardado} />
      <output data-testid="estado">{JSON.stringify({ ...estado, archivo: estado.archivo !== null })}</output>
    </>
  );
}

const estado = () => JSON.parse(screen.getByTestId('estado').textContent ?? '{}');
const fileInput = () => screen.getByLabelText(/PDF$/, { selector: 'input[type="file"]' });

/** Spec 010, T30 (RF-9, RF-11, RF-15, RF-16). */
describe('CampoPdf', () => {
  it('el input acepta PDF, uno solo', () => {
    render(<ConEstado inicial={initialPdfState(null)} />);

    expect(fileInput().getAttribute('accept')).toBe('application/pdf,.pdf');
    expect(fileInput().hasAttribute('multiple')).toBe(false);
  });

  it('sin PDF dice "Sin PDF" y no muestra la casilla ni "Quitar PDF"', () => {
    render(<ConEstado inicial={initialPdfState(null)} />);

    screen.getByText('Sin PDF');
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Quitar PDF' })).toBeNull();
  });

  it('muestra el PDF guardado con su tamaño, autor (desactivado) y fecha', () => {
    render(<ConEstado inicial={initialPdfState({ visible: true })} guardado={GUARDADO} />);

    screen.getByText(/830 KB/);
    screen.getByText(/Sosa, Luis \(desactivado\)/);
    expect((screen.getByRole('checkbox', { name: 'PDF visible para el cliente' }) as HTMLInputElement).checked).toBe(true);
  });

  it('elegir un archivo válido lo toma, sin mostrar su nombre, con la casilla desmarcada (RF-16)', async () => {
    const user = userEvent.setup();
    render(<ConEstado inicial={initialPdfState({ visible: true })} guardado={GUARDADO} />);

    await user.upload(fileInput(), pdfFile());

    await waitFor(() => expect(estado().archivo).toBe(true));
    expect(estado().visible).toBe(false);
    screen.getByText(/PDF elegido/);
    expect(screen.queryByText(/escrito <final>/)).toBeNull();
    expect((screen.getByRole('checkbox', { name: 'PDF visible para el cliente' }) as HTMLInputElement).checked).toBe(false);
  });

  it('un archivo inválido muestra su mensaje y se descarta (RF-11)', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<ConEstado inicial={initialPdfState(null)} />);

    await user.upload(fileInput(), new File(['no soy un pdf'], 'foto.pdf'));

    expect((await screen.findByRole('alert')).textContent).toBe('El archivo debe ser un PDF');
    expect(estado().archivo).toBe(false);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('"Quitar PDF" quita el guardado y oculta la casilla (RF-15)', async () => {
    const user = userEvent.setup();
    render(<ConEstado inicial={initialPdfState({ visible: true })} guardado={GUARDADO} />);

    await user.click(screen.getByRole('button', { name: 'Quitar PDF' }));

    expect(estado().quitar).toBe(true);
    expect(screen.queryByRole('checkbox')).toBeNull();
    screen.getByText('El PDF se quitará al guardar.');
  });

  it('en un fallo no hay casilla de visibilidad', () => {
    render(<ConEstado inicial={initialPdfState({ visible: false })} guardado={GUARDADO} conVisibilidad={false} />);

    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('todo se usa con el teclado', async () => {
    const user = userEvent.setup();
    render(<ConEstado inicial={initialPdfState({ visible: false })} guardado={GUARDADO} />);

    await user.tab();
    expect(document.activeElement).toBe(fileInput());
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('checkbox'));
    await user.keyboard(' ');
    expect(estado().visible).toBe(true);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Quitar PDF' }));
  });
});
