import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useJurisprudenciaService, useMovimientosService } from '../componentes/ProveedorServicios';
import { PaginaPdf } from './PaginaPdf';

/** "Ver PDF" de un movimiento, en el panel (spec 010, RF-28; plan 010, "Rutas"). */
export function PanelMovimientoPdf() {
  const { id, movimientoId } = useParams();
  const movimientos = useMovimientosService();
  const cargar = useCallback(
    () => movimientos.getPdf(Number(id), Number(movimientoId)),
    [movimientos, id, movimientoId],
  );
  return <PaginaPdf cargar={cargar} inicio="/panel" />;
}

/**
 * "Ver PDF" de un fallo, solo en el panel (spec 010, RF-27, RF-28). Con el plan Básico, lleva a
 * la jurisprudencia, que muestra T-2 (spec 011, RF-7).
 */
export function PanelFalloPdf() {
  const { id } = useParams();
  const jurisprudencia = useJurisprudenciaService();
  const cargar = useCallback(() => jurisprudencia.getPdf(Number(id)), [jurisprudencia, id]);
  return <PaginaPdf cargar={cargar} inicio="/panel" destinoPlan="/panel/jurisprudencia" />;
}
