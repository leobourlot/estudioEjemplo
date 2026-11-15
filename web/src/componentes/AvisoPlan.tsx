import type { MotivoContacto } from '../servicios/bourder-web';
import { ContactoBourderWeb } from './ContactoBourderWeb';
import { ERROR_ALERT, STATUS_ALERT } from './estilos-aplicacion';

interface AvisoPlanProps {
  texto: string;
  /** Qué mensaje lleva el WhatsApp: el del plan Premium o el de espacio (T-13). */
  motivo: MotivoContacto;
  /** T-9 se anuncia como error; los demás avisos, como texto informativo (RNF de accesibilidad). */
  error?: boolean;
}

/** Un aviso del plan con el contacto de Bourder Web debajo (spec 011, RF-33). */
export function AvisoPlan({ texto, motivo, error = false }: AvisoPlanProps) {
  return (
    <div role={error ? 'alert' : 'status'} className={error ? ERROR_ALERT : STATUS_ALERT}>
      <p>{texto}</p>
      <ContactoBourderWeb motivo={motivo} />
    </div>
  );
}
