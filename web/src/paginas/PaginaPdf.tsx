import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ERROR_ALERT, PAGE } from '../componentes/estilos-aplicacion';
import { useTituloDocumento } from '../componentes/useTituloDocumento';
import { ApiError, type ArchivoDescargado, errorMessage } from '../servicios/cliente-http';
import { openPdfInPlace } from '../servicios/descarga-pdf';
import { APP_TITLES } from '../servicios/rutas-sitio';
import { PDF_NOT_FOUND_NOTICE } from '../servicios/sesion';

interface PaginaPdfProps {
  cargar: () => Promise<ArchivoDescargado>;
  /** El inicio de la sección, a donde lleva si el PDF no se puede obtener (RF-37). */
  inicio: '/panel' | '/portal';
}

/**
 * La pestaña que abre "Ver PDF" (spec 010, RF-28; plan 010, D4): pide el PDF con el cliente
 * HTTP de siempre, que renueva la sesión si hace falta, y reemplaza la pestaña por el PDF, que el
 * navegador muestra con su visor. Si el PDF no existe o el usuario no puede verlo, lleva a su
 * inicio con el aviso (RF-37). Sin sesión, RutaProtegida ya llevó a la pantalla de ingreso.
 */
export function PaginaPdf({ cargar, inicio }: PaginaPdfProps) {
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
        if (caught instanceof ApiError && (caught.status === 404 || caught.status === 403)) {
          navigate(inicio, { replace: true, state: { aviso: PDF_NOT_FOUND_NOTICE } });
          return;
        }
        setError(errorMessage(caught));
      });
    return () => {
      active = false;
    };
  }, [cargar, inicio, navigate]);

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
