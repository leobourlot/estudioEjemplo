import { type ChangeEvent, useId, useState } from 'react';
import { formatPdfSize, validatePdfFile } from '../servicios/archivo-pdf';
import {
  choosePdf,
  dismissRejection,
  hasPdf,
  type PdfFormState,
  rejectPdf,
  removePdf,
  setPdfVisible,
  showsVisibilityOption,
} from '../servicios/formulario-pdf';
import type { AutorResumen } from '../servicios/movimientos';
import { formatDateTime } from '../servicios/presentacion';
import { authorName } from '../servicios/presentacion-movimientos';
import { ERROR_ALERT, INPUT, LABEL, SECONDARY_BUTTON_SMALL } from './estilos-aplicacion';

/** Los datos del PDF guardado que se muestran en el formulario (spec 010, RF-9). */
export interface PdfGuardadoInfo {
  tamano: number;
  subidoPor: AutorResumen;
  subidoEn: string;
}

interface CampoPdfProps {
  estado: PdfFormState;
  onChange: (estado: PdfFormState) => void;
  /** Movimientos sí; fallos no, que nunca llegan al cliente (RF-27). */
  conVisibilidad: boolean;
  guardado?: PdfGuardadoInfo | null;
}

/**
 * El PDF dentro del formulario de un movimiento o de un fallo (spec 010, RF-10 a RF-16). Valida
 * el archivo elegido antes de enviarlo, con los mensajes de la api, y lo descarta si no sirve
 * (RF-11). No muestra el nombre del archivo (RF-8). Las reglas viven en formulario-pdf.ts.
 */
export function CampoPdf({ estado, onChange, conVisibilidad, guardado = null }: CampoPdfProps) {
  const id = useId();
  // Cambiar la clave vacía el input, así se puede volver a elegir el mismo archivo.
  const [inputKey, setInputKey] = useState(0);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0];
    if (!archivo) return;
    const problema = await validatePdfFile(archivo);
    if (problema) {
      setInputKey((key) => key + 1);
      // Queda pendiente: el formulario no se envía hasta elegir otro o descartarlo (RF-11).
      onChange(rejectPdf(estado, problema));
      return;
    }
    onChange(choosePdf(estado, archivo));
  }

  function handleRemove() {
    setInputKey((key) => key + 1);
    onChange(removePdf(estado));
  }

  function descripcion() {
    if (estado.archivo) return `PDF elegido: ${formatPdfSize(estado.archivo.size)}`;
    if (guardado && estado.guardado && !estado.quitar) {
      return `PDF actual: ${formatPdfSize(guardado.tamano)}, subido por ${authorName(guardado.subidoPor)} el ${formatDateTime(guardado.subidoEn)}`;
    }
    if (estado.guardado && estado.quitar) return 'El PDF se quitará al guardar.';
    return 'Sin PDF';
  }

  return (
    <fieldset className="space-y-2">
      <legend className={LABEL}>PDF</legend>
      <p className="text-sm text-slate-700">{descripcion()}</p>
      <div className="space-y-1">
        <label htmlFor={`${id}-archivo`} className={LABEL}>
          {hasPdf(estado) ? 'Reemplazar PDF' : 'Elegir PDF'}
        </label>
        <input
          key={inputKey}
          id={`${id}-archivo`}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFile}
          className={INPUT}
        />
      </div>
      {estado.rechazo && (
        <div className="flex flex-wrap items-center gap-2">
          <p role="alert" className={ERROR_ALERT}>
            {estado.rechazo}
          </p>
          <button
            type="button"
            onClick={() => onChange(dismissRejection(estado))}
            className={SECONDARY_BUTTON_SMALL}
          >
            Descartar
          </button>
        </div>
      )}
      {conVisibilidad && showsVisibilityOption(estado) && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={estado.visible}
            onChange={(event) => onChange(setPdfVisible(estado, event.target.checked))}
          />
          PDF visible para el cliente
        </label>
      )}
      {hasPdf(estado) && (
        <button type="button" onClick={handleRemove} className={SECONDARY_BUTTON_SMALL}>
          Quitar PDF
        </button>
      )}
    </fieldset>
  );
}
