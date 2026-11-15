import { Navigate, Outlet, useParams } from 'react-router-dom';
import { PLAN_TEXTS } from '../servicios/plan';
import { AvisoPlan } from './AvisoPlan';
import { PAGE_TITLE } from './estilos-aplicacion';
import { usePlan } from './ProveedorPlan';

/** Un id de la dirección que puede ser un fallo: un entero positivo. */
const isPositiveId = (id: string) => /^[1-9]\d*$/.test(id);

/** T-2: la jurisprudencia en el plan Básico, con el contacto de Bourder Web (spec 011, RF-7). */
export function PantallaPlanPremium() {
  return (
    <section className="space-y-4">
      <h1 className={PAGE_TITLE}>{PLAN_TEXTS.jurisprudenciaTitle}</h1>
      <AvisoPlan texto={PLAN_TEXTS.jurisprudenciaText} motivo="premium" />
    </section>
  );
}

/**
 * Las pantallas de la jurisprudencia según el plan (spec 011, RF-7; plan 011, "Pantallas"). Con el
 * plan Básico muestra T-2 y no monta la página, así no se consulta si el fallo existe. Un id que
 * no es un entero positivo lleva al inicio del panel, como cualquier dirección inexistente (spec
 * 007, RF-10). Mientras el plan no llegó, espera: la api decide de todos modos (RF-4).
 */
export function RutaPremium() {
  const { info } = usePlan();
  const { id } = useParams();

  if (info === null) return <p className="text-slate-600">Cargando…</p>;
  if (info.plan === 'premium') return <Outlet />;
  if (id !== undefined && !isPositiveId(id)) return <Navigate to="/panel" replace />;
  return <PantallaPlanPremium />;
}
