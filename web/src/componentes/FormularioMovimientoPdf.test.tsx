import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { testMovimientoDetalle } from '../pruebas/movimientos-de-prueba';
import { initialPdfState, type PdfFormState } from '../servicios/formulario-pdf';
import { movementFormFrom, PDF_NOTICES } from '../servicios/formulario-movimiento';
import type { MovimientoDetalle } from '../servicios/movimientos';
import { FormularioMovimiento } from './FormularioMovimiento';

const PDF_GUARDADO = {
  codigo: 'K7Q2MX',
  tamano: 850_000,
  subidoPor: { id: 1, nombre: 'Luis', apellido: 'Sosa', activo: true },
  subidoEn: '2026-10-01T15:00:00.000Z',
};

function Editar({
  original,
  onSubmit,
  enviando = false,
}: {
  original: MovimientoDetalle;
  onSubmit: (pdf: PdfFormState) => void | Promise<void>;
  enviando?: boolean;
}) {
  const [form, setForm] = useState(movementFormFrom(original));
  const [pdf, setPdf] = useState(initialPdfState(original.pdf !== null));
  return (
    <FormularioMovimiento
      value={form}
      onChange={setForm}
      submitLabel="Guardar cambios"
      onSubmit={() => onSubmit(pdf)}
      original={original}
      pdf={pdf}
      onPdfChange={setPdf}
      pdfGuardado={original.pdf}
      enviando={enviando}
    />
  );
}

const fileInput = () => screen.getByLabelText(/PDF$/, { selector: 'input[type="file"]' });
const pdfFile = () => new File(['%PDF-1.4'], 'nuevo.pdf', { type: 'application/pdf' });

/** Spec 010, T33 (RF-10 a RF-13, RF-16, RF-18). */
describe('FormularioMovimiento con PDF', () => {
  it('mientras se envía, el botón queda deshabilitado y se lee "Guardando…" (RF-12)', () => {
    render(<Editar original={testMovimientoDetalle()} onSubmit={vi.fn()} enviando />);

    expect((screen.getByRole('button', { name: 'Guardar cambios' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Guardando…').getAttribute('role')).toBe('status');
  });

  it('reemplazar pide confirmación; sin aceptar no se envía nada (RF-13)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Editar original={testMovimientoDetalle({ pdf: PDF_GUARDADO })} onSubmit={onSubmit} />);

    await user.upload(fileInput(), pdfFile());
    await waitFor(() => screen.getByText(/PDF elegido/));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    const dialogo = screen.getByRole('alertdialog');
    expect(dialogo.textContent).toContain(
      'El PDF actual se borrará definitivamente y será reemplazado por el nuevo. No se puede deshacer',
    );
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('quitar pide confirmación y, al aceptar, envía', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Editar original={testMovimientoDetalle({ pdf: PDF_GUARDADO })} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Quitar PDF' }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(screen.getByRole('alertdialog').textContent).toContain(
      'El PDF se borrará definitivamente. No se puede deshacer',
    );
    await user.click(screen.getByRole('button', { name: 'Sí, guardar' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].quitar).toBe(true);
  });

  it('con un archivo rechazado, "Guardar" no envía y avisa; con "Descartar", sí (RF-11)', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onSubmit = vi.fn();
    render(<Editar original={testMovimientoDetalle({ pdf: PDF_GUARDADO })} onSubmit={onSubmit} />);

    await user.upload(fileInput(), new File(['no soy un pdf'], 'foto.pdf'));
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(onSubmit).not.toHaveBeenCalled();
    screen.getByText(
      'El PDF elegido no se adjuntó: El archivo debe ser un PDF. Elegí otro archivo o descartalo',
    );

    await user.click(screen.getByRole('button', { name: 'Descartar' }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    // El PDF guardado no cambia: ni archivo nuevo ni quitado.
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ archivo: null, quitar: false, rechazo: null });
  });

  it('adjuntar el primer PDF no pide confirmación', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Editar original={testMovimientoDetalle()} onSubmit={onSubmit} />);

    await user.upload(fileInput(), pdfFile());
    await waitFor(() => screen.getByText(/PDF elegido/));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].archivo).not.toBeNull();
  });

  describe('avisos (RF-17, RF-18)', () => {
    it('no hay casilla de visibilidad del PDF: solo la del movimiento', () => {
      render(<Editar original={testMovimientoDetalle({ visible: true, pdf: PDF_GUARDADO })} onSubmit={vi.fn()} />);

      expect(screen.getAllByRole('checkbox')).toHaveLength(1);
      screen.getByRole('checkbox', { name: 'Visible para el cliente' });
    });

    it('adjuntar un PDF a un movimiento visible avisa que el cliente lo podrá ver', async () => {
      const user = userEvent.setup();
      render(<Editar original={testMovimientoDetalle({ visible: true })} onSubmit={vi.fn()} />);

      await user.upload(fileInput(), pdfFile());

      await waitFor(() => screen.getByText(PDF_NOTICES.newPdf));
    });

    it('adjuntar un PDF a un movimiento oculto no avisa nada', async () => {
      const user = userEvent.setup();
      render(<Editar original={testMovimientoDetalle({ visible: false })} onSubmit={vi.fn()} />);

      await user.upload(fileInput(), pdfFile());

      await waitFor(() => screen.getByText(/PDF elegido/));
      for (const aviso of Object.values(PDF_NOTICES)) expect(screen.queryByText(aviso)).toBeNull();
    });

    it('marcar visible el movimiento con PDF suma el agregado al aviso de la spec 003', async () => {
      const user = userEvent.setup();
      render(<Editar original={testMovimientoDetalle({ visible: false, pdf: PDF_GUARDADO })} onSubmit={vi.fn()} />);

      await user.click(screen.getByRole('checkbox', { name: 'Visible para el cliente' }));

      const aviso = screen.getByRole('status', { name: 'Lo que verá el cliente' });
      expect(aviso.textContent).toContain(PDF_NOTICES.alsoPdf);
    });

    it('sin cambios no hay aviso del PDF', () => {
      render(<Editar original={testMovimientoDetalle({ visible: true, pdf: PDF_GUARDADO })} onSubmit={vi.fn()} />);

      for (const aviso of Object.values(PDF_NOTICES)) expect(screen.queryByText(aviso)).toBeNull();
    });
  });
});
