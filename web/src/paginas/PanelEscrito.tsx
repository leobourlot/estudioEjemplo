import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AvisosEscrito } from '../componentes/AvisosEscrito';
import { FormularioMovimiento } from '../componentes/FormularioMovimiento';
import { useModelosService, useMovimientosService } from '../componentes/ProveedorServicios';
import { TextoLiteral } from '../componentes/TextoLiteral';
import { useCierrePorInactividad } from '../componentes/useCierrePorInactividad';
import { useUsoDeSesion } from '../componentes/useUsoDeSesion';
import { ApiError, errorMessage } from '../servicios/cliente-http';
import { buildCreateMovementData, type MovementForm } from '../servicios/formulario-movimiento';
import type { EscritoCompletado } from '../servicios/modelos-escritos';
import {
  MOVEMENT_REGISTERED_MESSAGE,
  movementFormFromEscrito,
} from '../servicios/movimiento-escrito';
import { copyText } from '../servicios/portapapeles';
import {
  CLIPBOARD_LEGEND,
  COPIED_MESSAGE,
  COPY_FAILED_MESSAGE,
} from '../servicios/presentacion-modelos';
import { modelListStateFrom, toModelListLocationState } from '../servicios/sesion-escrito';
import {
  CARD,
  ERROR_ALERT,
  PAGE,
  PAGE_TITLE,
  PRIMARY_BUTTON_SMALL,
  SECONDARY_BUTTON_SMALL,
  SECTION_TITLE,
  TEXT_LINK,
} from '../componentes/estilos-aplicacion';

const linkClass = `text-sm ${TEXT_LINK}`;

/**
 * Escrito completado (RF-32): el texto de un modelo con los datos de una causa, que el servidor
 * arma en cada pedido. Muestra la carátula, el título del modelo, los avisos (RF-39, RF-40) y
 * el texto, como texto literal. El escrito vive solo en el estado de la página: no se guarda en
 * ningún lado (RF-46), y no hay opciones para descargarlo, imprimirlo, exportarlo, enviarlo ni
 * modificarlo (RF-47). Su única salida es "Copiar", que lo deja en el portapapeles (RF-44). El
 * uso de la pantalla mantiene la sesión, y sin uso la sesión vence y el escrito deja de
 * mostrarse (RF-48). "Registrar como movimiento" carga, solo si el integrante lo guarda, un
 * movimiento de la spec 003 con el título del modelo, nunca con el texto (RF-54, RF-55).
 */
export function PanelEscrito() {
  const params = useParams();
  const causaId = Number(params.id);
  const modeloId = Number(params.modeloId);
  const location = useLocation();
  const modelos = useModelosService();
  const movimientos = useMovimientosService();
  // Dónde estaba la lista de modelos al elegir este: se devuelve tal cual para volver (RF-32).
  const listState = modelListStateFrom(location.state);

  const [escrito, setEscrito] = useState<EscritoCompletado | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copyResult, setCopyResult] = useState<'copied' | 'failed' | null>(null);

  // Formulario de "Registrar como movimiento": null mientras está cerrado (RF-54).
  const [movementForm, setMovementForm] = useState<MovementForm | null>(null);
  const [apiProblems, setApiProblems] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  // El movimiento ya registrado desde esta pantalla: no se vuelve a ofrecer la opción.
  const [registeredId, setRegisteredId] = useState<number | null>(null);

  // Sin pedidos al servidor durante una hora, la sesión ya venció: el escrito deja de mostrarse
  // en ese momento (RF-48).
  useCierrePorInactividad();
  const notifyUse = useUsoDeSesion();

  // Recorrer la pantalla, usar el teclado, seleccionar texto o copiarlo cuenta como uso de la
  // sesión, para que no venza mientras se lee o se corrige el escrito (RF-48).
  useEffect(() => {
    const documentEvents = ['keydown', 'pointerdown', 'selectionchange', 'copy'] as const;
    window.addEventListener('scroll', notifyUse, { passive: true });
    for (const event of documentEvents) document.addEventListener(event, notifyUse);
    return () => {
      window.removeEventListener('scroll', notifyUse);
      for (const event of documentEvents) document.removeEventListener(event, notifyUse);
    };
  }, [notifyUse]);

  useEffect(() => {
    let active = true;
    modelos
      .completeModel(causaId, modeloId)
      .then((loaded) => {
        if (active) setEscrito(loaded);
      })
      .catch((caught: unknown) => {
        if (active) setLoadError(errorMessage(caught));
      });
    return () => {
      active = false;
    };
  }, [modelos, causaId, modeloId]);

  /** Copia solo el texto del escrito, sin el título, la carátula ni los avisos (RF-44). */
  async function copy(texto: string) {
    notifyUse();
    setCopyResult((await copyText(texto)) ? 'copied' : 'failed');
  }

  function startRegistering(tituloModelo: string) {
    setMovementForm(movementFormFromEscrito(tituloModelo));
    setApiProblems([]);
  }

  /** Carga el movimiento en la causa del escrito, como cualquier carga de la spec 003 (RF-54). */
  async function registerMovement(form: MovementForm) {
    setEnviando(true);
    try {
      const movimiento = await movimientos.createMovement(causaId, buildCreateMovementData(form));
      setMovementForm(null);
      setRegisteredId(movimiento.id);
    } catch (caught) {
      setApiProblems(caught instanceof ApiError ? caught.messages : [errorMessage(caught)]);
    } finally {
      setEnviando(false);
    }
  }

  const backLinks = (
    <nav aria-label="Volver" className="flex flex-wrap gap-4">
      <Link
        to={`/panel/causas/${causaId}/modelos`}
        state={listState ? toModelListLocationState(listState) : null}
        className={linkClass}
      >
        Volver a la lista de modelos
      </Link>
      <Link to={`/panel/causas/${causaId}`} className={linkClass}>
        Volver a la causa
      </Link>
    </nav>
  );

  if (!escrito) {
    return (
      <main className={PAGE}>
        <h1 className={PAGE_TITLE}>Escrito</h1>
        {loadError ? (
          <p role="alert" className={ERROR_ALERT}>
            {loadError}
          </p>
        ) : (
          <p className="text-slate-600">Cargando…</p>
        )}
        {backLinks}
      </main>
    );
  }

  return (
    <main className={PAGE}>
      {backLinks}

      <div className="space-y-1">
        <h1 className={PAGE_TITLE}>Escrito</h1>
        <dl className="text-sm text-slate-700">
          <div className="flex flex-wrap gap-1">
            <dt className="text-slate-500">Causa:</dt>
            <dd className="break-words">{escrito.causa.caratula}</dd>
          </div>
          <div className="flex flex-wrap gap-1">
            <dt className="text-slate-500">Modelo:</dt>
            <dd className="break-words">{escrito.modelo.titulo}</dd>
          </div>
        </dl>
      </div>

      <AvisosEscrito escrito={escrito} />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void copy(escrito.texto)}
            className={PRIMARY_BUTTON_SMALL}
          >
            Copiar
          </button>
          <p className="text-xs text-slate-500">{CLIPBOARD_LEGEND}</p>
        </div>
        {copyResult === 'copied' && (
          <p role="status" className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {COPIED_MESSAGE}
          </p>
        )}
        {copyResult === 'failed' && (
          <p role="alert" className={ERROR_ALERT}>
            {COPY_FAILED_MESSAGE}
          </p>
        )}
      </div>

      {registeredId !== null && (
        <p
          role="status"
          className="flex flex-wrap gap-x-3 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
        >
          <span>{MOVEMENT_REGISTERED_MESSAGE}</span>
          <Link to={`/panel/causas/${causaId}/movimientos/${registeredId}`} className={linkClass}>
            Ver el movimiento
          </Link>
        </p>
      )}
      {registeredId === null && movementForm === null && (
        <div>
          <button
            type="button"
            onClick={() => startRegistering(escrito.modelo.titulo)}
            className={SECONDARY_BUTTON_SMALL}
          >
            Registrar como movimiento
          </button>
        </div>
      )}
      {movementForm !== null && (
        <section aria-label="Registrar como movimiento" className={`space-y-3 p-6 ${CARD}`}>
          <h2 className={SECTION_TITLE}>Registrar como movimiento</h2>
          <FormularioMovimiento
            value={movementForm}
            onChange={setMovementForm}
            submitLabel="Guardar movimiento"
            onSubmit={() => registerMovement(movementForm)}
            onCancel={() => setMovementForm(null)}
            apiProblems={apiProblems}
            enviando={enviando}
          />
        </section>
      )}

      <section aria-label="Escrito completado" className={`p-6 ${CARD}`}>
        <TextoLiteral texto={escrito.texto} className="font-mono text-sm text-slate-800" />
      </section>
    </main>
  );
}
