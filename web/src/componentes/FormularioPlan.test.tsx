import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { testMovimientoDetalle } from '../pruebas/movimientos-de-prueba';
import { basicPlan, premiumPlan } from '../pruebas/plan-de-prueba';
import { renderWithPlan } from '../pruebas/plan-en-pantalla';
import { EMPTY_RULING_FORM } from '../servicios/formulario-fallo';
import { EMPTY_MOVEMENT_FORM, movementFormFrom } from '../servicios/formulario-movimiento';
import { initialPdfState } from '../servicios/formulario-pdf';
import type { MovimientoDetalle } from '../servicios/movimientos';
import { PLAN_TEXTS } from '../servicios/plan';
import { FormularioFallo } from './FormularioFallo';
import { FormularioMovimiento } from './FormularioMovimiento';

const SPACE_FULL =
  'Se completó el espacio para PDF del estudio (10 GB). Quitá algún PDF que no necesites o pedí más espacio a Bourder Web.';

function Movimiento({
  original,
  conPdf = true,
  apiProblems,
  onSubmit = vi.fn(),
}: {
  original?: MovimientoDetalle;
  conPdf?: boolean;
  apiProblems?: string[];
  onSubmit?: () => void;
}) {
  const [form, setForm] = useState(original ? movementFormFrom(original) : EMPTY_MOVEMENT_FORM);
  const [pdf, setPdf] = useState(initialPdfState(false));
  return (
    <FormularioMovimiento
      value={form}
      onChange={setForm}
      submitLabel="Guardar"
      onSubmit={onSubmit}
      original={original}
      apiProblems={apiProblems}
      {...(conPdf ? { pdf, onPdfChange: setPdf } : {})}
    />
  );
}

function Fallo() {
  const [form, setForm] = useState(EMPTY_RULING_FORM);
  const [pdf, setPdf] = useState(initialPdfState(false));
  return (
    <FormularioFallo
      value={form}
      onChange={setForm}
      submitLabel="Guardar"
      onSubmit={vi.fn()}
      pdf={pdf}
      onPdfChange={setPdf}
    />
  );
}

const fileInput = () => screen.queryByLabelText(/PDF$/, { selector: 'input[type="file"]' });

/** Spec 011, RF-10, RF-15, RF-28, RF-29 y RF-33: los formularios con el plan. */
describe('formularios según el plan', () => {
  describe('con el plan Básico', () => {
    it('el formulario de movimiento muestra T-3 con el contacto en lugar del PDF', async () => {
      renderWithPlan(<Movimiento />, basicPlan());

      const aviso = await screen.findByText(PLAN_TEXTS.pdfNotIncluded);
      expect(
        within(aviso.closest('[role="status"]') as HTMLElement).getByRole('link', {
          name: 'Escribir a Bourder Web por WhatsApp',
        }),
      ).toBeTruthy();
      expect(fileInput()).toBeNull();
      expect(screen.getByLabelText('Descripción')).toBeTruthy();
    });

    it('también muestra T-3 en el formulario que se abre desde un escrito, sin PDF', async () => {
      renderWithPlan(<Movimiento conPdf={false} />, basicPlan());

      expect(await screen.findByText(PLAN_TEXTS.pdfNotIncluded)).toBeTruthy();
    });

    it('al dejar visible un movimiento con PDF guardado, T-11, sin los avisos de la spec 010', async () => {
      const user = userEvent.setup();
      const original = testMovimientoDetalle({ visible: false, tienePdf: true, pdf: null });
      renderWithPlan(<Movimiento original={original} />, basicPlan());
      await screen.findByText(PLAN_TEXTS.pdfNotIncluded);

      await user.click(screen.getByLabelText('Visible para el cliente'));

      expect(screen.getByText(PLAN_TEXTS.pdfKeptHidden)).toBeTruthy();
      expect(screen.queryByText('El cliente también podrá ver y descargar el PDF')).toBeNull();
    });
  });

  describe('con el plan Premium', () => {
    it('desde el 90 %, T-8 junto al PDF del movimiento y del fallo', async () => {
      const { unmount } = renderWithPlan(<Movimiento />, premiumPlan(9.5));
      expect(await screen.findByText(/El estudio está usando 9,5 GB de los 10 GB/)).toBeTruthy();
      expect(fileInput()).toBeTruthy();
      unmount();

      renderWithPlan(<Fallo />, premiumPlan(9.5));
      expect(await screen.findByText(/El estudio está usando 9,5 GB de los 10 GB/)).toBeTruthy();
    });

    it('debajo del 90 %, sin T-8 ni T-3', async () => {
      renderWithPlan(<Movimiento />, premiumPlan(2));

      await waitFor(() => expect(fileInput()).toBeTruthy());
      expect(screen.queryByText(/El estudio está usando/)).toBeNull();
      expect(screen.queryByText(PLAN_TEXTS.pdfNotIncluded)).toBeNull();
    });

    it('un rechazo T-9 muestra el contacto debajo del error', async () => {
      renderWithPlan(<Movimiento apiProblems={[SPACE_FULL]} />, premiumPlan(2));

      expect(await screen.findByText(SPACE_FULL)).toBeTruthy();
      const whatsapp = screen.getByRole('link', { name: 'Escribir a Bourder Web por WhatsApp' });
      expect(new URL(whatsapp.getAttribute('href')!).searchParams.get('text')).toContain(
        'Necesitamos más espacio para PDF.',
      );
    });

    it('después de guardar un PDF, vuelve a pedir el plan', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const { plan } = renderWithPlan(
        <Movimiento original={testMovimientoDetalle()} onSubmit={onSubmit} />,
        premiumPlan(2),
      );
      await waitFor(() => expect(fileInput()).toBeTruthy());
      await waitFor(() => expect(plan.getPlan).toHaveBeenCalledTimes(1));
      await user.upload(fileInput()!, new File(['%PDF-1.4'], 'a.pdf', { type: 'application/pdf' }));
      await waitFor(() => screen.getByText(/PDF elegido/));

      await user.click(screen.getByRole('button', { name: 'Guardar' }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      await waitFor(() => expect(plan.getPlan).toHaveBeenCalledTimes(2));
    });
  });
});
