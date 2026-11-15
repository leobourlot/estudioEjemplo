import type { Usuario } from '../usuarios/usuario.entity.js';
import type { AccionMovimiento } from './cambio-movimiento.entity.js';
import type { Movimiento, TipoMovimiento } from './movimiento.entity.js';
import {
  type CambioCampo,
  isFutureDate,
  type OrigenTextoVisible,
  visibleText,
} from './reglas-movimientos.js';

/**
 * Respuestas de movimientos (plan 003, "Tipos"). Se arman campo por campo, nunca a partir de
 * la entidad completa: así no salen emails ni hashes de las cuentas unidas.
 */

/** Autor de un movimiento o de un cambio; `activo` permite mostrarlo como desactivado (RF-36). */
export interface AutorResumen {
  id: number;
  nombre: string;
  apellido: string;
  activo: boolean;
}

/** Fila del historial de movimientos de una causa (RF-24). */
export interface MovimientoResumen {
  id: number;
  fecha: string;
  tipo: TipoMovimiento;
  descripcion: string;
  visible: boolean;
  tieneTextoCliente: boolean;
  anulado: boolean;
  esFechaFutura: boolean;
  creadoPor: AutorResumen;
  creadoEn: Date;
  /** Si tiene PDF (spec 010, RF-30). El cliente lo ve si ve el movimiento (RF-33). */
  tienePdf: boolean;
}

/** El PDF en la consulta de un movimiento (spec 010, RF-31, RF-40). Nunca su contenido. */
export interface PdfDetalle {
  codigo: string;
  tamano: number;
  subidoPor: AutorResumen;
  subidoEn: Date;
}

/** Un cambio del historial de cambios de un movimiento (RF-20, RF-22). */
export interface CambioMovimientoDetalle {
  id: number;
  accion: AccionMovimiento;
  usuario: AutorResumen;
  fechaHora: Date;
  cambios: CambioCampo[];
}

/** Consulta de un movimiento (RF-22). */
export interface MovimientoDetalle extends MovimientoResumen {
  pdf: PdfDetalle | null;
  causaId: number;
  /** Permite a la interfaz ocultar las acciones en una causa desactivada (RF-28). */
  causaActiva: boolean;
  textoCliente: string | null;
  textoVisible: string;
  origenTextoVisible: OrigenTextoVisible;
  modificadoPor: AutorResumen | null;
  modificadoEn: Date | null;
  cambios: CambioMovimientoDetalle[];
}

/**
 * Lo único que se pone a disposición de un cliente de cada movimiento que puede ver
 * (RF-31). Nunca la descripción cuando hay texto para el cliente, ni autores, fechas de
 * registro o cambios. Lo usa la spec 004.
 */
export interface MovimientoCliente {
  id: number;
  fecha: string;
  tipo: TipoMovimiento;
  texto: string;
  /** Fecha posterior al día actual en Buenos Aires (spec 004, RF-21). */
  esFechaFutura: boolean;
  /**
   * Si tiene PDF: el cliente lo ve porque ve el movimiento (spec 010, RF-33, RF-35). Nada más del
   * PDF: ni su tamaño, ni su código, ni quién lo subió.
   */
  tienePdf: boolean;
}

/**
 * Con el plan Básico, el valor de cada cambio del PDF en el historial (spec 011, RF-16): la web
 * muestra T-15 en su lugar. Lo guardado en movimiento_cambios no cambia.
 */
export const PDF_HIDDEN_BY_PLAN = 'plan-premium';

/** Opciones del plan para las respuestas de movimientos (spec 011; plan 011, D8). */
export interface PlanOptions {
  /** Con false (plan Básico), ningún dato del PDF salvo `tienePdf` en el panel. */
  planPremium: boolean;
}

const PREMIUM: PlanOptions = { planPremium: true };

/** Los cambios de un movimiento con los valores del PDF reemplazados por la marca (RF-16). */
function hidePdfChanges(cambios: CambioCampo[]): CambioCampo[] {
  return cambios.map((cambio) =>
    cambio.campo === 'pdf'
      ? { ...cambio, anterior: PDF_HIDDEN_BY_PLAN, nuevo: PDF_HIDDEN_BY_PLAN }
      : cambio,
  );
}

export function toAutorResumen(usuario: Usuario): AutorResumen {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    activo: usuario.activo,
  };
}

/** Espera el movimiento con creadoPor cargado. */
export function toMovimientoResumen(
  movimiento: Movimiento,
  ahora: Date = new Date(),
): MovimientoResumen {
  return {
    id: movimiento.id,
    fecha: movimiento.fecha,
    tipo: movimiento.tipo,
    descripcion: movimiento.descripcion,
    visible: movimiento.visible,
    tieneTextoCliente: movimiento.textoCliente !== null,
    anulado: movimiento.anulado,
    esFechaFutura: isFutureDate(movimiento.fecha, ahora),
    creadoPor: toAutorResumen(movimiento.creadoPor),
    creadoEn: movimiento.creadoEn,
    tienePdf: movimiento.pdfId !== null,
  };
}

/**
 * Espera el movimiento con creadoPor, modificadoPor, cambios.usuario y pdf.subidoPor cargados.
 * Los cambios van del más reciente al más antiguo (RF-22). Con el plan Básico, `pdf` es null y los
 * cambios del PDF llevan la marca PDF_HIDDEN_BY_PLAN; `tienePdf` sigue, para el aviso T-11 (spec
 * 011, RF-12, RF-15, RF-16).
 */
export function toMovimientoDetalle(
  movimiento: Movimiento,
  causaActiva: boolean,
  ahora: Date = new Date(),
  { planPremium }: PlanOptions = PREMIUM,
): MovimientoDetalle {
  const { texto, origen } = visibleText(movimiento);
  return {
    ...toMovimientoResumen(movimiento, ahora),
    causaId: movimiento.causaId,
    causaActiva,
    textoCliente: movimiento.textoCliente,
    textoVisible: texto,
    origenTextoVisible: origen,
    modificadoPor: movimiento.modificadoPor ? toAutorResumen(movimiento.modificadoPor) : null,
    modificadoEn: movimiento.modificadoEn,
    pdf:
      planPremium && movimiento.pdf
        ? {
            codigo: movimiento.pdf.codigo,
            tamano: movimiento.pdf.tamano,
            subidoPor: toAutorResumen(movimiento.pdf.subidoPor),
            subidoEn: movimiento.pdf.subidoEn,
          }
        : null,
    cambios: [...movimiento.cambios]
      .sort((a, b) => b.id - a.id)
      .map((cambio) => ({
        id: cambio.id,
        accion: cambio.accion,
        usuario: toAutorResumen(cambio.usuario),
        fechaHora: cambio.fechaHora,
        cambios: planPremium ? cambio.cambios : hidePdfChanges(cambio.cambios),
      })),
  };
}

/**
 * Con el plan Básico, el cliente no recibe ninguna señal de un PDF: `tienePdf` es false (spec 011,
 * RF-13).
 */
export function toMovimientoCliente(
  movimiento: Movimiento,
  ahora: Date = new Date(),
  { planPremium }: PlanOptions = PREMIUM,
): MovimientoCliente {
  return {
    id: movimiento.id,
    fecha: movimiento.fecha,
    tipo: movimiento.tipo,
    texto: visibleText(movimiento).texto,
    esFechaFutura: isFutureDate(movimiento.fecha, ahora),
    tienePdf: planPremium && movimiento.pdfId !== null,
  };
}
