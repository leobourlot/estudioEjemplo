import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ERROR_ALERT, PAGE } from '../componentes/estilos-aplicacion';
import { useTituloDocumento } from '../componentes/useTituloDocumento';
import { ApiError, type ArchivoDescargado, errorMessage } from '../servicios/cliente-http';
import { openPdfInPlace } from '../servicios/descarga-pdf';
import { PLAN_TEXTS } from '../servicios/plan';
import { APP_TITLES } from '../servicios/rutas-sitio';
import { PDF_NOT_FOUND_NOTICE } from '../servicios/sesion';

/** El 403 de una función del plan Premium con el plan Básico (spec 011, T-4). */
const isPlanRejection = (error: ApiError) =>
  error.status === 403 && errorMessage(error) === PLAN_TEXTS.featureNotIncluded;

interface PaginaPdfProps {
  cargar: () => Promise<ArchivoDescargado>;
  /** El inicio de la sección, a donde lleva si el PDF no se puede obtener (RF-37). */
  inicio: '/panel' | '/portal';
  /**
   * A dónde lleva el rechazo del plan Básico (403 T-4): por defecto, al inicio con T-4 como aviso
   * (spec 011, RF-12); el PDF de un fallo lleva a la jurisprudencia, que muestra T-2 (RF-7).
   */
  destinoPlan?: string;
}

/**
 * La pestaña que abre "Ver PDF" (spec 010, RF-28; plan 010, D4): pide el PDF con el cliente
 * HTTP de siempre, que renueva la sesión si hace falta, y reemplaza la pestaña por el PDF, que el
 * navegador muestra con su visor. Si el PDF no existe o el usuario no puede verlo, lleva a su
 * inicio con el aviso (RF-37). Sin sesión, RutaProtegida ya llevó a la pantalla de ingreso.
 */
export function PaginaPdf({ cargar, inicio, destinoPlan }: PaginaPdfProps) {
  useTituloDocumento(inicio === '/panel' ? APP_TITLES.panel : APP_TITLES.portal);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    cargar()
      .then(({ blob }) => {
        if (active) openPdfInPlace(blob);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        if (caught instanceof ApiError && isPlanRejection(caught)) {
          navigate(destinoPlan ?? inicio, {
            replace: true,
            state: destinoPlan ? undefined : { aviso: PLAN_TEXTS.featureNotIncluded },
          });
          return;
        }
        if (caught instanceof ApiError && (caught.status === 404 || caught.status === 403)) {
          navigate(inicio, { replace: true, state: { aviso: PDF_NOT_FOUND_NOTICE } });
          return;
        }
        setError(errorMessage(caught));
      });
    return () => {
      active = false;
    };
  }, [cargar, inicio, destinoPlan, navigate]);

  return (
    <main className={PAGE}>
      {error ? (
        <p role="alert" className={ERROR_ALERT}>
          {error}
        </p>
      ) : (
        <p role="status" className="text-slate-500">
          Abriendo el PDF…
        </p>
      )}
    </main>
  );
}
