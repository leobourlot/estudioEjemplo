import { describe, expect, it } from 'vitest';
import type { Pdf } from '../pdfs/pdf.entity.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import { toMovimientoDetalle, toMovimientoResumen } from './movimiento-detalle.js';
import type { Movimiento } from './movimiento.entity.js';

const user = (id: number, activo = true) =>
  ({
    id,
    nombre: `Nombre${id}`,
    apellido: `Apellido${id}`,
    activo,
    email: `usuario${id}@estudio.com`,
    contrasenaHash: '$2b$10$hash',
  }) as unknown as Usuario;

const PDF = {
  id: 40,
  tamano: 850_000,
  codigo: 'K7Q2MX',
  subidoPorId: 3,
  subidoPor: user(3, false),
  subidoEn: new Date('2026-10-03T12:00:00Z'),
} as Pdf;

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
    creadoPorId: 1,
    creadoPor: user(1),
    creadoEn: new Date('2026-10-01T12:00:00Z'),
    modificadoPorId: null,
    modificadoPor: null,
    modificadoEn: null,
    pdfId: null,
    pdf: null,
    cambios: [],
    ...overrides,
  } as Movimiento;
}

/** Spec 010, RF-30, RF-31 y RF-40: el PDF en las respuestas del panel. */
describe('Respuestas del panel con el PDF', () => {
  it('el resumen dice si hay PDF, sin más datos (RF-30)', () => {
    expect(toMovimientoResumen(movement()).tienePdf).toBe(false);
    expect(toMovimientoResumen(movement({ pdfId: 40 })).tienePdf).toBe(true);
  });

  it('el detalle trae tamaño, código, quién lo subió y cuándo, sin visibilidad propia (RF-31, RF-40)', () => {
    const detalle = toMovimientoDetalle(movement({ pdfId: 40, pdf: PDF }), true);

    expect(detalle.pdf).toEqual({
      codigo: 'K7Q2MX',
      tamano: 850_000,
      subidoPor: { id: 3, nombre: 'Nombre3', apellido: 'Apellido3', activo: false },
      subidoEn: PDF.subidoEn,
    });
  });

  it('el detalle de un movimiento sin PDF lo trae en null', () => {
    expect(toMovimientoDetalle(movement(), true).pdf).toBeNull();
  });

  it('nunca incluye el contenido, el id del PDF ni datos de la cuenta del autor', () => {
    const conContenido = { ...PDF, contenido: Buffer.from('%PDF-SECRETO') } as Pdf;
    const detalle = toMovimientoDetalle(movement({ pdfId: 40, pdf: conContenido }), true);

    const texto = JSON.stringify(detalle.pdf);
    expect(texto).not.toMatch(/contenido|SECRETO|email|contrasena|"id":40/);
  });
});
