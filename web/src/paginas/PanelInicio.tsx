import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AparecerAlCargar } from '../componentes/AparecerAlCargar';
import { AvisoNavegacion } from '../componentes/AvisoNavegacion';
import { AvisoPlan } from '../componentes/AvisoPlan';
import {
  CARD,
  FOCUS_RING,
  PAGE,
  PAGE_TITLE,
  STATUS_BADGE,
} from '../componentes/estilos-aplicacion';
import { IconoMenu } from '../componentes/IconosMenu';
import { usePlan } from '../componentes/ProveedorPlan';
import { useSession } from '../componentes/ProveedorSesion';
import { PANEL_MENU } from '../servicios/menu-aplicacion';
import { isNearPdfLimit, nearLimitText, planSummary, withPlanBadge } from '../servicios/plan';
import { greeting } from '../servicios/textos-aplicacion';

/** Las opciones del menú del panel, salvo "Inicio", que es esta pantalla (spec 008, RF-25). */
const ACCESOS = PANEL_MENU.filter((option) => !option.end);

/**
 * Inicio del panel: el saludo como título principal y un acceso por cada opción del menú, en
 * tarjetas con su ícono y su nombre (spec 008, RF-25). Sin contadores ni resúmenes, que quedan
 * fuera de alcance. El usuario siempre está: la pantalla va dentro de RutaProtegida.
 *
 * Spec 011: debajo del saludo, el plan del estudio (T-10, RF-31) y, desde el 90 % del espacio para
 * PDF, el aviso T-8 (RF-29). Al entrar se vuelve a pedir el plan, para que el espacio esté al día.
 * Con el plan Básico, el acceso a la jurisprudencia lleva la etiqueta "Premium" (RF-7).
 */
export function PanelInicio() {
  const { usuario } = useSession();
  const { info, refresh } = usePlan();
  useEffect(() => refresh(), [refresh]);
  const accesos = withPlanBadge(ACCESOS, info?.plan ?? null);

  return (
    <main className={PAGE}>
      {usuario && <h1 className={PAGE_TITLE}>{greeting(usuario.nombre)}</h1>}
      {info && <p className="text-slate-700">{planSummary(info)}</p>}
      <AvisoNavegacion />
      {info && isNearPdfLimit(info) && <AvisoPlan texto={nearLimitText(info)} motivo="espacio" />}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accesos.map((option, index) => (
          <AparecerAlCargar key={option.to} como="li" indice={index}>
            <Link
              to={option.to}
              aria-label={option.ariaLabel}
              className={`flex min-h-20 items-center gap-4 p-5 font-titulos text-xl font-semibold text-estudio-oscuro transition motion-safe:hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none ${CARD} ${FOCUS_RING}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-estudio-claro/10">
                <IconoMenu nombre={option.icon} className="h-6 w-6" />
              </span>
              {option.label}
              {option.badge && <span className={`ml-auto ${STATUS_BADGE}`}>{option.badge}</span>}
            </Link>
          </AparecerAlCargar>
        ))}
      </ul>
    </main>
  );
}
