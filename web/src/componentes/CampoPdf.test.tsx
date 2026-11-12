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
  guardado = null,
}: {
  inicial: PdfFormState;
  guardado?: PdfGuardadoInfo | null;
}) {
  const [estado, setEstado] = useState(inicial);
  return (
    <>
      <CampoPdf estado={estado} onChange={setEstado} guardado={guardado} />
      <output data-testid="estado">{JSON.stringify({ ...estado, archivo: estado.archivo !== null })}</output>
    </>
  );
}

const estado = () => JSON.parse(screen.getByTestId('estado').textContent ?? '{}');
const fileInput = () => screen.getByLabelText(/PDF$/, { selector: 'input[type="file"]' });

/** Spec 010, T30 (RF-9, RF-11, RF-17). */
describe('CampoPdf', () => {
  it('el input acepta PDF, uno solo', () => {
    render(<ConEstado inicial={initialPdfState(false)} />);

    expect(fileInput().getAttribute('accept')).toBe('application/pdf,.pdf');
    expect(fileInput().hasAttribute('multiple')).toBe(false);
  });

  it('sin PDF dice "Sin PDF" y no muestra "Quitar PDF"', () => {
    render(<ConEstado inicial={initialPdfState(false)} />);

    screen.getByText('Sin PDF');
    expect(screen.queryByRole('button', { name: 'Quitar PDF' })).toBeNull();
  });

  it('muestra el PDF guardado con su tamaño, autor (desactivado) y fecha, sin casilla de visibilidad (RF-17)', () => {
    render(<ConEstado inicial={initialPdfState(true)} guardado={GUARDADO} />);

    screen.getByText(/830 KB/);
    screen.getByText(/Sosa, Luis \(desactivado\)/);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('elegir un archivo válido lo toma, sin mostrar su nombre', async () => {
    const user = userEvent.setup();
    render(<ConEstado inicial={initialPdfState(true)} guardado={GUARDADO} />);

    await user.upload(fileInput(), pdfFile());

    await waitFor(() => expect(estado().archivo).toBe(true));
    screen.getByText(/PDF elegido/);
    expect(screen.queryByText(/escrito <final>/)).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('un archivo inválido muestra su mensaje y se descarta (RF-11)', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<ConEstado inicial={initialPdfState(false)} />);

    await user.upload(fileInput(), new File(['no soy un pdf'], 'foto.pdf'));

    expect((await screen.findByRole('alert')).textContent).toBe('El archivo debe ser un PDF');
    expect(estado().archivo).toBe(false);
  });

  it('"Quitar PDF" quita el guardado', async () => {
    const user = userEvent.setup();
    render(<ConEstado inicial={initialPdfState(true)} guardado={GUARDADO} />);

    await user.click(screen.getByRole('button', { name: 'Quitar PDF' }));

    expect(estado().quitar).toBe(true);
    screen.getByText('El PDF se quitará al guardar.');
  });

  it('todo se usa con el teclado', async () => {
    const user = userEvent.setup();
    render(<ConEstado inicial={initialPdfState(true)} guardado={GUARDADO} />);

    await user.tab();
    expect(document.activeElement).toBe(fileInput());
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Quitar PDF' }));
  });
});
