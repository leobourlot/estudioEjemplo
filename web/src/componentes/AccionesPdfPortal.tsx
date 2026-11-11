import { useParams } from 'react-router-dom';
import type { MovimientoCliente } from '../servicios/portal';
import { formatMovementDate } from '../servicios/presentacion-movimientos';
import { AccionesPdf } from './AccionesPdf';
import { usePortalService } from './ProveedorServicios';

/**
 * "PDF" con "Ver PDF" y "Descargar PDF" de un movimiento del portal, solo si el cliente puede
 * ver su PDF (spec 010, RF-34). Nunca muestra el tamaño (RF-35). La causa sale de la dirección:
 * las pantallas del portal que muestran movimientos van bajo /portal/causas/:id.
 */
export function AccionesPdfPortal({ movimiento }: { movimiento: MovimientoCliente }) {
  const { id: causaId = '' } = useParams();
  const portal = usePortalService();
  if (!movimiento.tienePdf) return null;
  const causa = encodeURIComponent(causaId);
  return (
    <div className="space-y-2">
      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">PDF</span>
      <AccionesPdf
        verHref={`/portal/causas/${causa}/movimientos/${movimiento.id}/pdf`}
        etiqueta={`del movimiento del ${formatMovementDate(movimiento.fecha)}`}
        descargar={() => portal.getPdf(causaId, movimiento.id)}
        inicio="/portal"
      />
    </div>
  );
}
