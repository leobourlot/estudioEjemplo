import { pdfForm } from './archivo-pdf';
import { httpClient, type HttpClient } from './cliente-http';

/**
 * Movimientos de una causa (plan 003, `/api/panel/causas/:id/movimientos`). Una función por
 * endpoint; los errores llegan como ApiError con los mensajes de la API. No importa React.
 */

export type TipoMovimiento =
  | 'escrito_presentado'
  | 'providencia'
  | 'resolucion'
  | 'sentencia'
  | 'notificacion'
  | 'audiencia'
  | 'pericia'
  | 'oficio'
  | 'otro';

export type AccionMovimiento = 'carga' | 'modificacion' | 'anulacion' | 'restauracion';

export type CampoMovimiento =
  'fecha' | 'tipo' | 'descripcion' | 'textoCliente' | 'visible' | 'anulado' | 'pdf';

export type FiltroVisibilidad = 'todos' | 'visibles' | 'ocultos';

export type OrigenTextoVisible = 'textoCliente' | 'descripcion';

/** Autor de un movimiento o de un cambio; `activo` en false si dejó el estudio (RF-36). */
export interface AutorResumen {
  id: number;
  nombre: string;
  apellido: string;
  activo: boolean;
}

/** Fila del historial. `fecha` es AAAA-MM-DD; las fechas de registro, ISO. */
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
  creadoEn: string;
  /** Si tiene PDF (spec 010, RF-30). El cliente lo ve si ve el movimiento (RF-33). */
  tienePdf: boolean;
}

/** El PDF en la consulta de un movimiento (spec 010, RF-31). `subidoEn` es ISO. */
export interface PdfDetalle {
  codigo: string;
  tamano: number;
  subidoPor: AutorResumen;
  subidoEn: string;
}

/**
 * El PDF como lo registra el historial de cambios (spec 010, RF-21). Los cambios anteriores a que
 * el PDF dejara de tener visibilidad propia traen además `visible`, que no se muestra.
 */
export interface PdfCambio {
  codigo: string;
  tamano: number;
}

export interface CambioCampo {
  campo: CampoMovimiento;
  anterior: string | boolean | PdfCambio | null;
  nuevo: string | boolean | PdfCambio | null;
}

export interface CambioMovimiento {
  id: number;
  accion: AccionMovimiento;
  usuario: AutorResumen;
  fechaHora: string;
  cambios: CambioCampo[];
}

export interface MovimientoDetalle extends MovimientoResumen {
  pdf: PdfDetalle | null;
  causaId: number;
  causaActiva: boolean;
  textoCliente: string | null;
  textoVisible: string;
  origenTextoVisible: OrigenTextoVisible;
  modificadoPor: AutorResumen | null;
  modificadoEn: string | null;
  /** Del más reciente al más antiguo (RF-22). */
  cambios: CambioMovimiento[];
}

export interface MovimientoPage {
  items: MovimientoResumen[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface ListMovimientosQuery {
  pagina?: number;
  buscar?: string;
  tipo?: TipoMovimiento;
  visibilidad?: FiltroVisibilidad;
  /** AAAA-MM-DD, inclusive. */
  desde?: string;
  hasta?: string;
  ocultarAnulados?: boolean;
}

export interface CreateMovimientoData {
  fecha: string;
  tipo: TipoMovimiento;
  descripcion: string;
  textoCliente?: string | null;
  visible?: boolean;
}

/** Solo los datos que cambian; null borra el texto para el cliente. */
export interface UpdateMovimientoData {
  fecha?: string;
  tipo?: TipoMovimiento;
  descripcion?: string;
  textoCliente?: string | null;
  visible?: boolean;
  /** Quita el PDF guardado (spec 010, RF-14). */
  quitarPdf?: true;
}

const base = (causaId: number) => `/panel/causas/${causaId}/movimientos`;

/** Los textos vacíos, "todos" y la casilla desmarcada no se envían: no filtran. */
function toQueryString(query: ListMovimientosQuery): string {
  const params = new URLSearchParams();
  if (query.pagina !== undefined) params.set('pagina', String(query.pagina));
  const search = query.buscar?.trim();
  if (search) params.set('buscar', search);
  if (query.tipo !== undefined) params.set('tipo', query.tipo);
  if (query.visibilidad !== undefined && query.visibilidad !== 'todos') {
    params.set('visibilidad', query.visibilidad);
  }
  if (query.desde) params.set('desde', query.desde);
  if (query.hasta) params.set('hasta', query.hasta);
  if (query.ocultarAnulados) params.set('ocultarAnulados', 'true');
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function createMovimientosService(http: HttpClient) {
  return {
    listMovements: (causaId: number, query: ListMovimientosQuery = {}) =>
      http.get<MovimientoPage>(`${base(causaId)}${toQueryString(query)}`),

    getMovement: (causaId: number, movimientoId: number) =>
      http.get<MovimientoDetalle>(`${base(causaId)}/${movimientoId}`),

    /** Con un PDF, el pedido es un formulario con `datos` y `pdf` (spec 010, plan 010, D2). */
    createMovement: (causaId: number, data: CreateMovimientoData, pdf?: File) =>
      pdf
        ? http.sendForm<MovimientoDetalle>('POST', base(causaId), pdfForm(data, pdf))
        : http.post<MovimientoDetalle>(base(causaId), data),

    /** Con un PDF nuevo, el pedido es un formulario con `datos` y `pdf` (plan 010, D2). */
    updateMovement: (
      causaId: number,
      movimientoId: number,
      changes: UpdateMovimientoData,
      pdf?: File,
    ) =>
      pdf
        ? http.sendForm<MovimientoDetalle>(
            'PATCH',
            `${base(causaId)}/${movimientoId}`,
            pdfForm(changes, pdf),
          )
        : http.patch<MovimientoDetalle>(`${base(causaId)}/${movimientoId}`, changes),

    /** El PDF del movimiento, con su nombre (spec 010, RF-28). */
    getPdf: (causaId: number, movimientoId: number) =>
      http.getFile(`${base(causaId)}/${movimientoId}/pdf`),

    annulMovement: (causaId: number, movimientoId: number) =>
      http.post<MovimientoDetalle>(`${base(causaId)}/${movimientoId}/anular`),

    restoreMovement: (causaId: number, movimientoId: number) =>
      http.post<MovimientoDetalle>(`${base(causaId)}/${movimientoId}/restaurar`),
  };
}

export type MovimientosService = ReturnType<typeof createMovimientosService>;

export const movimientosService = createMovimientosService(httpClient);
