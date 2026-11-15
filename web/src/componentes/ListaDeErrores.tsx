import { useEffect, useId, useRef, useState } from 'react';
import { ERROR_ALERT, PRIMARY_BUTTON_SMALL } from './estilos-aplicacion';
import { VentanaCentrada } from './VentanaCentrada';

function Mensajes({ messages, className = '' }: { messages: string[]; className?: string }) {
  return (
    <div role="alert" className={`${ERROR_ALERT} ${className}`}>
      <ul className="list-inside list-disc space-y-0.5">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Problemas de un formulario o de la respuesta de la API (spec 008, RF-29). Primero aparecen
 * en una ventana centrada, para que se vean aunque se haya bajado en la página; al cerrarla
 * ("Entendido", Esc o tocando fuera) quedan en el aviso de siempre, arriba del formulario,
 * para consultarlos mientras se corrige. La ventana vuelve a abrirse con cada lista nueva y,
 * dentro de un formulario, cada vez que se lo envía y siguen los mismos problemas.
 */
export function ListaDeErrores({ messages }: { messages: string[] }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const titleId = useId();
  const content = messages.join('\n');
  const [submits, setSubmits] = useState(0);
  // Los problemas y el envío para los que se cerró la ventana: si cambia alguno, se abre.
  const [closedFor, setClosedFor] = useState<string | null>(null);
  const current = `${submits}\n${content}`;
  const open = content !== '' && closedFor !== current;

  useEffect(() => {
    const form = anchor.current?.closest('form');
    if (!form) return;
    const onSubmit = () => setSubmits((count) => count + 1);
    form.addEventListener('submit', onSubmit);
    return () => form.removeEventListener('submit', onSubmit);
  }, []);

  const close = () => setClosedFor(current);

  return (
    <>
      <span ref={anchor} hidden />
      {messages.length > 0 &&
        (open ? (
          <VentanaCentrada role="dialog" labelledBy={titleId} onClose={close}>
            <h2 id={titleId} className="font-titulos text-lg font-semibold text-estudio-oscuro">
              Revisá lo siguiente
            </h2>
            <Mensajes messages={messages} className="mt-3" />
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={close} className={PRIMARY_BUTTON_SMALL}>
                Entendido
              </button>
            </div>
          </VentanaCentrada>
        ) : (
          <Mensajes messages={messages} />
        ))}
    </>
  );
}
