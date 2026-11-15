import { APP_TITLES } from '../servicios/rutas-sitio';
import { DisenoSeccion } from './DisenoSeccion';
import { ProveedorPlan } from './ProveedorPlan';
import { useTituloDocumento } from './useTituloDocumento';

/**
 * Diseño del panel del estudio: administradores y abogados (causas, jurisprudencia, modelos de
 * escritos y cuentas son para ambos), con el menú lateral del panel (spec 008, RF-5 y RF-6). El
 * plan del estudio se pide solo acá: el portal nunca lo recibe (spec 011, RF-32).
 */
export function DisenoPanel() {
  useTituloDocumento(APP_TITLES.panel);
  return (
    <ProveedorPlan>
      <DisenoSeccion section="panel" />
    </ProveedorPlan>
  );
}
