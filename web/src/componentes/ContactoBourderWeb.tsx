import { BOURDER_WEB, bourderWhatsappUrl, type MotivoContacto } from '../servicios/bourder-web';
import { STUDIO_CONTACT } from '../servicios/datos-estudio';
import { TEXT_LINK } from './estilos-aplicacion';

/** Enlaces externos: pestaña nueva, aislada (spec 005, RF-19). */
const EXTERNAL = { target: '_blank', rel: 'noopener noreferrer' } as const;

/**
 * El contacto de Bourder Web debajo de un aviso del plan (spec 011, RF-33, T-12): su WhatsApp, con
 * el mensaje T-13 del motivo y el nombre del estudio, y su sitio.
 */
export function ContactoBourderWeb({ motivo }: { motivo: MotivoContacto }) {
  return (
    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
      <a
        href={bourderWhatsappUrl(motivo, STUDIO_CONTACT.nombre)}
        aria-label="Escribir a Bourder Web por WhatsApp"
        className={TEXT_LINK}
        {...EXTERNAL}
      >
        WhatsApp: {BOURDER_WEB.whatsapp.visible}
      </a>
      <a
        href={BOURDER_WEB.sitioUrl}
        aria-label="Ir al sitio de Bourder Web"
        className={TEXT_LINK}
        {...EXTERNAL}
      >
        {BOURDER_WEB.sitioVisible}
      </a>
    </p>
  );
}
