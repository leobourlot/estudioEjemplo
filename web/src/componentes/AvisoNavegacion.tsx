import { useLocation } from 'react-router-dom';
import { noticeFromState } from '../servicios/sesion';
import { STATUS_ALERT } from './estilos-aplicacion';

/**
 * El aviso que llega con la navegación, por ejemplo "No existe ese PDF" al llevar al usuario a
 * su inicio (spec 010, RF-37). Solo lo muestra.
 */
export function AvisoNavegacion() {
  const aviso = noticeFromState(useLocation().state);
  if (aviso === null) return null;
  return (
    <p role="status" className={STATUS_ALERT}>
      {aviso}
    </p>
  );
}
