import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { usePortalService } from '../componentes/ProveedorServicios';
import { PaginaPdf } from './PaginaPdf';

/**
 * "Ver PDF" de un movimiento, en el portal (spec 010, RF-28, RF-33). Los ids van tal como están
 * en la dirección: la api responde el mismo 404 para cualquier caso (RF-37).
 */
export function PortalMovimientoPdf() {
  const { id = '', movimientoId = '' } = useParams();
  const portal = usePortalService();
  const cargar = useCallback(() => portal.getPdf(id, movimientoId), [portal, id, movimientoId]);
  return <PaginaPdf cargar={cargar} inicio="/portal" />;
}
