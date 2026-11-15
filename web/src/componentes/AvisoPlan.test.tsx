import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BOURDER_WEB, contactMessage } from '../servicios/bourder-web';
import { STUDIO_CONTACT } from '../servicios/datos-estudio';
import { PLAN_TEXTS } from '../servicios/plan';
import { AvisoPlan } from './AvisoPlan';

const whatsappMessage = () => {
  const href = screen
    .getByRole('link', { name: 'Escribir a Bourder Web por WhatsApp' })
    .getAttribute('href')!;
  return new URL(href).searchParams.get('text');
};

/** Spec 011, RF-33 y RNF de accesibilidad: los avisos del plan con el contacto de Bourder Web. */
describe('AvisoPlan y ContactoBourderWeb', () => {
  it('muestra el texto y el contacto T-12, con los dos enlaces aislados en una pestaña nueva', () => {
    render(<AvisoPlan texto={PLAN_TEXTS.pdfNotIncluded} motivo="premium" />);

    const aviso = screen.getByRole('status');
    expect(within(aviso).getByText(PLAN_TEXTS.pdfNotIncluded)).toBeTruthy();
    const whatsapp = screen.getByRole('link', { name: 'Escribir a Bourder Web por WhatsApp' });
    const sitio = screen.getByRole('link', { name: 'Ir al sitio de Bourder Web' });
    expect(whatsapp.textContent).toBe(`WhatsApp: ${BOURDER_WEB.whatsapp.visible}`);
    expect(sitio.textContent).toBe(BOURDER_WEB.sitioVisible);
    expect(sitio.getAttribute('href')).toBe(BOURDER_WEB.sitioUrl);
    for (const link of [whatsapp, sitio]) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('el WhatsApp lleva el mensaje del plan Premium con el nombre del estudio', () => {
    render(<AvisoPlan texto="Aviso" motivo="premium" />);

    expect(whatsappMessage()).toBe(contactMessage('premium', STUDIO_CONTACT.nombre));
  });

  it('el aviso de espacio lleva el mensaje de espacio', () => {
    render(<AvisoPlan texto="Aviso" motivo="espacio" />);

    expect(whatsappMessage()).toBe(contactMessage('espacio', STUDIO_CONTACT.nombre));
  });

  it('T-9 se anuncia como error', () => {
    render(<AvisoPlan texto="Se completó el espacio" motivo="espacio" error />);

    expect(screen.getByRole('alert').textContent).toContain('Se completó el espacio');
    expect(screen.queryByRole('status')).toBeNull();
  });
});
