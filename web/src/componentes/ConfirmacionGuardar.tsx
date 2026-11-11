import { useId } from 'react';
import { PRIMARY_BUTTON_SMALL, SECONDARY_BUTTON_SMALL } from './estilos-aplicacion';

interface ConfirmacionGuardarProps {
  mensaje: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmación antes de guardar un formulario que reemplaza o quita un PDF (spec 010, RF-13). Si
 * no se confirma, no se envía nada.
 */
export function ConfirmacionGuardar({ mensaje, onConfirm, onCancel }: ConfirmacionGuardarProps) {
  const id = useId();
  return (
    <div
      role="alertdialog"
      aria-labelledby={id}
      className="space-y-2 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <p id={id} className="font-medium">
        {mensaje}
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={onConfirm} className={PRIMARY_BUTTON_SMALL}>
          Sí, guardar
        </button>
        <button type="button" onClick={onCancel} className={SECONDARY_BUTTON_SMALL}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
