import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import type { PlanInfo } from '../servicios/plan';
import { usePlanService } from './ProveedorServicios';

interface PlanContextValue {
  /** El plan del estudio, o null mientras no llegó (o fuera del panel). */
  info: PlanInfo | null;
  /** Vuelve a pedir el plan, por ejemplo después de guardar un PDF (espacio usado). */
  refresh: () => void;
}

// Sin proveedor (el portal y el sitio público), no hay plan: nada del plan se muestra (RF-32).
const PlanContext = createContext<PlanContextValue>({ info: null, refresh: () => undefined });

/**
 * El plan del estudio para el panel (spec 011, RF-7, RF-29, RF-31; plan 011, "Plan en el panel").
 * Solo lo monta DisenoPanel: ninguna pantalla del portal pide el plan (RF-32). Lo pide al entrar
 * y, si el pedido falla, lo vuelve a pedir al navegar. Mientras no llega, el menú y los
 * formularios se muestran sin los avisos: la api decide de todos modos (RF-4).
 */
export function ProveedorPlan({ children }: { children: ReactNode }) {
  const service = usePlanService();
  const { pathname } = useLocation();
  const [info, setInfo] = useState<PlanInfo | null>(null);

  const refresh = useCallback(() => {
    service.getPlan().then(setInfo, () => undefined);
  }, [service]);

  useEffect(() => {
    if (info === null) refresh();
    // Se reintenta en cada navegación mientras el plan no llegó.
  }, [pathname, info, refresh]);

  const value = useMemo(() => ({ info, refresh }), [info, refresh]);
  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

/** El plan del estudio en el panel; fuera del panel, null. */
export const usePlan = () => useContext(PlanContext);
