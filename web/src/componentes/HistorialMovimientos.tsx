import { useEffect, useState } from 'react';
import { errorMessage } from '../servicios/cliente-http';
import {
  buildCreateMovementData,
  EMPTY_MOVEMENT_FILTERS,
  EMPTY_MOVEMENT_FORM,
  type MovementFilters,
  toListQuery,
} from '../servicios/formulario-movimiento';
import { afterSaveError, initialPdfState, pdfChanges } from '../servicios/formulario-pdf';
import type { MovimientoPage } from '../servicios/movimientos';
import { FilaMovimiento } from './FilaMovimiento';
import { FiltrosMovimientos } from './FiltrosMovimientos';
import { FormularioMovimiento } from './FormularioMovimiento';
import { useMovimientosService } from './ProveedorServicios';
import {
  CARD,
  ERROR_ALERT,
  PRIMARY_BUTTON_SMALL,
  SECONDARY_BUTTON_SMALL,
  SECTION_TITLE,
} from './estilos-aplicacion';

/**
 * Historial de movimientos de una causa (RF-23 a RF-27), con el alta (RF-8). Los filtros y la
 * página viven en el estado del componente, no en el navegador (principio 5). En una causa
 * desactivada solo se consulta: no se ofrece "Nuevo movimiento" (RF-28); el control real lo
 * hace la API.
 */
export function HistorialMovimientos({
  causaId,
  causaActiva,
}: {
  causaId: number;
  causaActiva: boolean;
}) {
  const movimientos = useMovimientosService();
  const [filters, setFilters] = useState<MovementFilters>(EMPTY_MOVEMENT_FILTERS);
  const [pagina, setPagina] = useState(1);
  const [reloads, setReloads] = useState(0);
  const [result, setResult] = useState<MovimientoPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_MOVEMENT_FORM);
  const [pdf, setPdf] = useState(() => initialPdfState(null));
  const [apiProblems, setApiProblems] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let active = true;
    movimientos
      .listMovements(causaId, toListQuery(filters, pagina))
      .then((page) => {
        if (!active) return;
        setResult(page);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught));
      });
    return () => {
      active = false;
    };
  }, [movimientos, causaId, filters, pagina, reloads]);

  /** Cambia los filtros y vuelve a la primera página. */
  function filterBy(next: MovementFilters) {
    setFilters(next);
    setPagina(1);
  }

  function startCreating() {
    setForm(EMPTY_MOVEMENT_FORM);
    setPdf(initialPdfState(null));
    setApiProblems([]);
    setCreating(true);
  }

  /** La carga con su PDF, si hay, en un solo pedido (spec 010, RF-10). */
  async function create() {
    setEnviando(true);
    setApiProblems([]);
    try {
      const { archivo, datos } = pdfChanges(pdf, { conVisibilidad: true });
      const data = { ...buildCreateMovementData(form), ...datos };
      await (archivo
        ? movimientos.createMovement(causaId, data, archivo)
        : movimientos.createMovement(causaId, data));
      setCreating(false);
      setPagina(1);
      setReloads((count) => count + 1);
    } catch (caught) {
      const { problems, estado } = afterSaveError(caught, pdf);
      setApiProblems(problems);
      setPdf(estado);
    } finally {
      setEnviando(false);
    }
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.porPagina)) : 1;
  const filtered = JSON.stringify(filters) !== JSON.stringify(EMPTY_MOVEMENT_FILTERS);

  return (
    <section aria-label="Movimientos" className={`space-y-4 p-6 ${CARD}`}>
      <div className="flex items-center justify-between">
        <h2 className={SECTION_TITLE}>Movimientos</h2>
        {causaActiva && !creating && (
          <button type="button" onClick={startCreating} className={PRIMARY_BUTTON_SMALL}>
            Nuevo movimiento
          </button>
        )}
      </div>

      {creating && (
        <div className="rounded border border-slate-200 p-4">
          <h3 className="mb-3 font-medium text-slate-800">Nuevo movimiento</h3>
          <FormularioMovimiento
            value={form}
            onChange={setForm}
            submitLabel="Guardar movimiento"
            onSubmit={create}
            onCancel={() => setCreating(false)}
            apiProblems={apiProblems}
            enviando={enviando}
            pdf={pdf}
            onPdfChange={setPdf}
          />
        </div>
      )}

      <FiltrosMovimientos value={filters} onChange={filterBy} />

      {error && (
        <p role="alert" className={ERROR_ALERT}>
          {error}
        </p>
      )}

      {result && result.items.length === 0 && (
        <p className="text-slate-600">
          {filtered ? 'No hay movimientos que coincidan.' : 'Todavía no hay movimientos.'}
        </p>
      )}

      {result && result.items.length > 0 && (
        <>
          <ul aria-label="Lista de movimientos" className="space-y-4">
            {result.items.map((movimiento) => (
              <FilaMovimiento key={movimiento.id} movimiento={movimiento} causaId={causaId} />
            ))}
          </ul>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>
              Página {pagina} de {totalPages} · {result.total}{' '}
              {result.total === 1 ? 'movimiento' : 'movimientos'}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina(pagina - 1)}
                className={SECONDARY_BUTTON_SMALL}
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={pagina >= totalPages}
                onClick={() => setPagina(pagina + 1)}
                className={SECONDARY_BUTTON_SMALL}
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
