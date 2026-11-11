import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { canAccess } from '../servicios/sesion';
import { useSession } from './ProveedorSesion';

/**
 * Envuelve las rutas que dependen de la sesión y aplica canAccess, en este orden: cargando,
 * sin sesión, cambio de contraseña pendiente, sección de otro rol y, si no, la página
 * (RF-11, RF-17, RF-20). Es solo navegación: el control real lo hace la API.
 */
export function RutaProtegida() {
  const { usuario, cargando } = useSession();
  const { pathname } = useLocation();

  if (cargando) {
    return (
      <p role="status" className="p-8 text-center text-slate-500">
        Cargando…
      </p>
    );
  }

  const decision = canAccess(pathname, usuario);
  if (decision.allowed) return <Outlet />;
  // El aviso, si hay, lo muestra el inicio de la sección (spec 010, RF-37).
  const state = decision.notice ? { aviso: decision.notice } : undefined;
  return <Navigate to={decision.redirectTo} replace state={state} />;
}
