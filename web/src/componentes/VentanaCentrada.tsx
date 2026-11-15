import { type ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface VentanaCentradaProps {
  /** "dialog" para un aviso; "alertdialog" para una pregunta que hay que responder. */
  role: 'dialog' | 'alertdialog';
  /** Id del título o del mensaje que nombra la ventana. */
  labelledBy: string;
  /** Cierre con Esc o tocando fuera de la ventana. Sin él, solo se cierra con sus botones. */
  onClose?: () => void;
  children: ReactNode;
}

/**
 * Ventana centrada sobre la página, con el fondo oscurecido (spec 008, RF-29): se ve aunque
 * se haya bajado en la página. Va en el body para que ninguna animación la desplace. Al
 * abrirse toma el foco y no deja salir de ella con Tab; al cerrarse lo devuelve.
 */
export function VentanaCentrada({ role, labelledBy, onClose, children }: VentanaCentradaProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && onClose) {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel.current) return;
      const focusables = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (!first || !last) {
        event.preventDefault();
      } else if (event.shiftKey && (active === first || active === panel.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={(event) => {
        if (onClose && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-xl focus:outline-none"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
