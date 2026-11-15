import { describe, expect, it } from 'vitest';
import type { Pdf } from '../pdfs/pdf.entity.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import type { CambioMovimiento } from './cambio-movimiento.entity.js';
import {
  PDF_HIDDEN_BY_PLAN,
  toMovimientoCliente,
  toMovimientoDetalle,
} from './movimiento-detalle.js';
import type { Movimiento } from './movimiento.entity.js';

const NOW = new Date('2026-10-06T15:00:00Z');
const BASICO = { planPremium: false };
const PREMIUM = { planPremium: true };

const user = (id: number) =>
  ({ id, nombre: `Nombre${id}`, apellido: `Apellido${id}`, activo: true }) as Usuario;

const PDF = {
  id: 9,
  codigo: 'K7Q2MX',
  tamano: 850_000,
  subidoPor: user(1),
  subidoEn: new Date('2026-10-02T12:00:00Z'),
} as Pdf;

const changes = [
  {
    id: 2,
    accion: 'modificacion',
    usuario: user(2),
    fechaHora: new Date('2026-10-03T12:00:00Z'),
    cambios: [
      { campo: 'descripcion', anterior: 'Antes', nuevo: 'Después' },
      { campo: 'pdf', anterior: null, nuevo: { codigo: 'K7Q2MX', tamano: 850_000 } },
    ],
  },
] as unknown as CambioMovimiento[];

function movement(overrides: Partial<Movimiento> = {}): Movimiento {
  return {
    id: 7,
    causaId: 3,
    fecha: '2026-10-06',
    tipo: 'providencia',
    descripcion: 'Descripción.',
    textoCliente: null,
    visible: true,
    anulado: false,
    creadoPor: user(1),
    creadoEn: new Date('2026-10-01T12:00:00Z'),
    modificadoPor: null,
    modificadoEn: null,
    pdfId: 9,
    pdf: PDF,
    cambios: changes,
    ...overrides,
  } as Movimiento;
}

/** Spec 011, RF-12, RF-13 y RF-16 (plan 011, D8). */
describe('respuestas de movimientos según el plan', () => {
  it('con el plan Básico, el detalle no trae el PDF pero sí si lo tiene', () => {
    const detalle = toMovimientoDetalle(movement(), true, NOW, BASICO);

    expect(detalle.pdf).toBeNull();
    expect(detalle.tienePdf).toBe(true);
  });

  it('con el plan Básico, los valores del PDF en el historial llevan la marca, el resto igual', () => {
    const [cambio] = toMovimientoDetalle(movement(), true, NOW, BASICO).cambios;

    expect(cambio.cambios).toEqual([
      { campo: 'descripcion', anterior: 'Antes', nuevo: 'Después' },
      { campo: 'pdf', anterior: PDF_HIDDEN_BY_PLAN, nuevo: PDF_HIDDEN_BY_PLAN },
    ]);
    expect(cambio.usuario.id).toBe(2);
    expect(JSON.stringify(cambio)).not.toContain('K7Q2MX');
    expect(PDF_HIDDEN_BY_PLAN).toBe('plan-premium');
  });

  it('con el plan Premium, el PDF y el historial como en la spec 010', () => {
    const detalle = toMovimientoDetalle(movement(), true, NOW, PREMIUM);

    expect(detalle.pdf).toMatchObject({ codigo: 'K7Q2MX', tamano: 850_000 });
    expect(detalle.cambios[0].cambios[1]).toEqual({
      campo: 'pdf',
      anterior: null,
      nuevo: { codigo: 'K7Q2MX', tamano: 850_000 },
    });
  });

  it('sin indicar el plan, como en la spec 010', () => {
    expect(toMovimientoDetalle(movement(), true, NOW).pdf).not.toBeNull();
  });

  it('con el plan Básico, el cliente nunca ve tienePdf', () => {
    expect(toMovimientoCliente(movement(), NOW, BASICO).tienePdf).toBe(false);
    expect(toMovimientoCliente(movement(), NOW, PREMIUM).tienePdf).toBe(true);
  });
});
