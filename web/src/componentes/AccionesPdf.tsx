import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, type ArchivoDescargado, errorMessage } from '../servicios/cliente-http';
import { saveFile } from '../servicios/descarga-pdf';
import { PDF_NOT_FOUND_NOTICE } from '../servicios/sesion';
import { ERROR_ALERT, SECONDARY_BUTTON_SMALL } from './estilos-aplicacion';

interface AccionesPdfProps {
  /** La ruta de la web que abre el PDF (plan 010, D4). */
  verHref: string;
  /** El dato que identifica el PDF, para los nombres accesibles: "del movimiento del 24/10/2026". */
  etiqueta: string;
  descargar: () => Promise<ArchivoDescargado>;
  /** A dónde lleva si el PDF ya no se puede obtener (RF-37). */
  inicio: '/panel' | '/portal';
}

/** El nombre si la api no lo mandó; no debería pasar (RF-7). */
const NOMBRE_POR_DEFECTO = 'documento.pdf';

/**
 * "Ver PDF" y "Descargar PDF" (spec 010, RF-28). "Ver PDF" abre en una pestaña nueva y aislada la
 * página que muestra el PDF; "Descargar PDF" lo guarda sin cambiar de pantalla (plan 010, D5). Si
 * el PDF ya no existe o el usuario ya no puede verlo, lleva al inicio con el aviso (RF-37).
 */
export function AccionesPdf({ verHref, etiqueta, descargar, inicio }: AccionesPdfProps) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);

  async function handleDownload() {
    setError(null);
    setDescargando(true);
    try {
      const { blob, nombre } = await descargar();
      saveFile(blob, nombre ?? NOMBRE_POR_DEFECTO);
    } catch (caught) {
      if (caught instanceof ApiError && (caught.status === 404 || caught.status === 403)) {
        navigate(inicio, { state: { aviso: PDF_NOT_FOUND_NOTICE } });
        return;
      }
      setError(errorMessage(caught));
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <a
          href={verHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Ver el PDF ${etiqueta} (se abre en una pestaña nueva)`}
          className={SECONDARY_BUTTON_SMALL}
        >
          Ver PDF
        </a>
        <button
          type="button"
          onClick={handleDownload}
          disabled={descargando}
          aria-label={`Descargar el PDF ${etiqueta}`}
          className={SECONDARY_BUTTON_SMALL}
        >
          Descargar PDF
        </button>
      </div>
      {error && (
        <p role="alert" className={ERROR_ALERT}>
          {error}
        </p>
      )}
    </div>
  );
}
