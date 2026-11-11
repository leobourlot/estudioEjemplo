import { type ReactNode, useEffect, useId, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AccionesPdf } from '../componentes/AccionesPdf';
import { FormularioMovimiento } from '../componentes/FormularioMovimiento';
import { HistorialCambios } from '../componentes/HistorialCambios';
import { ListaDeErrores } from '../componentes/ListaDeErrores';
import { useMovimientosService } from '../componentes/ProveedorServicios';
import { TextoLiteral } from '../componentes/TextoLiteral';
import { formatPdfSize } from '../servicios/archivo-pdf';
import { ApiError, errorMessage } from '../servicios/cliente-http';
import {
  buildUpdateMovementData,
  clientViewSummary,
  type MovementForm,
  movementFormFrom,
  needsRestoreConfirmation,
  RESTORE_WITH_PDF_WARNING,
} from '../servicios/formulario-movimiento';
import { afterSaveError, initialPdfState, pdfChanges } from '../servicios/formulario-pdf';
import type { MovimientoDetalle } from '../servicios/movimientos';
import { EMPTY_VALUE, formatDateTime } from '../servicios/presentacion';
import {
  authorName,
  formatMovementDate,
  movementAuditLines,
  tipoMovimientoLabel,
} from '../servicios/presentacion-movimientos';
import {
  CARD,
  ERROR_ALERT,
  PAGE,
  PAGE_TITLE,
  SECONDARY_BUTTON_SMALL,
  SECTION_TITLE,
  TEXT_LINK,
} from '../componentes/estilos-aplicacion';

const secondaryButton = SECONDARY_BUTTON_SMALL;
const badgeClass = 'rounded px-2 py-0.5 text-xs font-medium';

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-slate-800">{children}</dd>
    </div>
  );
}

const messagesOf = (caught: unknown) =>
  caught instanceof ApiError ? caught.messages : [errorMessage(caught)];

/**
 * Detalle de un movimiento (RF-22): sus datos, el texto que ve el cliente con su origen, la
 * auditoría y el historial de cambios. Permite editarlo, anularlo y restaurarlo (RF-11, RF-16,
 * RF-18). Un movimiento anulado no se edita: se restaura (RF-15). En una causa desactivada
 * solo se consulta (RF-28). El control real lo hace la API.
 */
export function PanelMovimientoDetalle() {
  const params = useParams();
  const causaId = Number(params.id);
  const movimientoId = Number(params.movimientoId);
  const movimientos = useMovimientosService();
  const confirmTitleId = useId();

  const [movimiento, setMovimiento] = useState<MovimientoDetalle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<MovementForm | null>(null);
  const [confirmingAnnul, setConfirmingAnnul] = useState(false);
  const [confirmingRestore, setConfirmingRestore] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [pdf, setPdf] = useState(() => initialPdfState(null));
  const restoreTitleId = useId();

  useEffect(() => {
    let active = true;
    movimientos
      .getMovement(causaId, movimientoId)
      .then((loaded) => {
        if (active) setMovimiento(loaded);
      })
      .catch((caught: unknown) => {
        if (active) setLoadError(errorMessage(caught));
      });
    return () => {
      active = false;
    };
  }, [movimientos, causaId, movimientoId]);

  async function run(action: () => Promise<MovimientoDetalle>) {
    setEnviando(true);
    setProblems([]);
    try {
      setMovimiento(await action());
      setEditing(false);
    } catch (caught) {
      setProblems(messagesOf(caught));
    } finally {
      setEnviando(false);
    }
  }

  function startEditing(current: MovimientoDetalle) {
    setForm(movementFormFrom(current));
    setPdf(initialPdfState(current.pdf ? { visible: current.pdf.visible } : null));
    setProblems([]);
    setEditing(true);
  }

  /** Los cambios con los del PDF, en un solo pedido (spec 010, RF-10, RF-11, RF-12). */
  async function save(current: MovimientoDetalle, values: MovementForm) {
    setEnviando(true);
    setProblems([]);
    try {
      const { archivo, datos } = pdfChanges(pdf, { conVisibilidad: true });
      const changes = { ...buildUpdateMovementData(values, current), ...datos };
      setMovimiento(
        await (archivo
          ? movimientos.updateMovement(causaId, movimientoId, changes, archivo)
          : movimientos.updateMovement(causaId, movimientoId, changes)),
      );
      setEditing(false);
    } catch (caught) {
      const result = afterSaveError(caught, pdf);
      setProblems(result.problems);
      setPdf(result.estado);
    } finally {
      setEnviando(false);
    }
  }

  const annul = () => {
    setConfirmingAnnul(false);
    return run(() => movimientos.annulMovement(causaId, movimientoId));
  };

  const restore = () => {
    setConfirmingRestore(false);
    return run(() => movimientos.restoreMovement(causaId, movimientoId));
  };

  /** Con un PDF visible, restaurar pide confirmación (spec 010, RF-19). */
  const askRestore = (current: MovimientoDetalle) =>
    needsRestoreConfirmation(current) ? setConfirmingRestore(true) : void restore();

  const backLink = (
    <Link to={`/panel/causas/${causaId}`} className={`text-sm ${TEXT_LINK}`}>
      Volver a la causa
    </Link>
  );

  if (!movimiento) {
    return (
      <main className={PAGE}>
        <h1 className={PAGE_TITLE}>Movimiento</h1>
        {loadError ? (
          <p role="alert" className={ERROR_ALERT}>
            {loadError}
          </p>
        ) : (
          <p className="text-slate-600">Cargando…</p>
        )}
        {backLink}
      </main>
    );
  }

  const canChange = movimiento.causaActiva;

  return (
    <main className={PAGE}>
      {backLink}
      <div className="space-y-2">
        <h1 className={PAGE_TITLE}>Movimiento</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-700">
            {formatMovementDate(movimiento.fecha)} · {tipoMovimientoLabel(movimiento.tipo)}
          </span>
          {movimiento.visible ? (
            <span className={`${badgeClass} bg-sky-100 text-sky-900`}>Visible</span>
          ) : (
            <span className={`${badgeClass} bg-slate-100 text-slate-700`}>Oculto</span>
          )}
          {movimiento.anulado && (
            <span className={`${badgeClass} bg-red-100 text-red-800`}>Anulado</span>
          )}
          {movimiento.esFechaFutura && (
            <span className={`${badgeClass} bg-amber-100 text-amber-900`}>Fecha futura</span>
          )}
        </div>
      </div>

      {!canChange && (
        <p className={SECONDARY_BUTTON_SMALL}>
          La causa está desactivada: sus movimientos solo se pueden consultar.
        </p>
      )}

      <ListaDeErrores messages={editing ? [] : problems} />

      <section aria-label="Datos del movimiento" className={`space-y-4 p-6 ${CARD}`}>
        <div className="flex items-center justify-between">
          <h2 className={SECTION_TITLE}>Datos</h2>
          {canChange && !editing && (
            <div className="flex gap-2">
              {movimiento.anulado ? (
                !confirmingRestore && (
                  <button
                    type="button"
                    disabled={enviando}
                    onClick={() => askRestore(movimiento)}
                    className={secondaryButton}
                  >
                    Restaurar
                  </button>
                )
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => startEditing(movimiento)}
                    className={secondaryButton}
                  >
                    Editar
                  </button>
                  {!confirmingAnnul && (
                    <button
                      type="button"
                      disabled={enviando}
                      onClick={() => setConfirmingAnnul(true)}
                      className={secondaryButton}
                    >
                      Anular
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {confirmingAnnul && (
          <div
            role="alertdialog"
            aria-labelledby={confirmTitleId}
            className="space-y-2 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          >
            <p id={confirmTitleId} className="font-medium">
              ¿Anular este movimiento?
            </p>
            <p>
              No se borra: queda en el historial marcado como anulado y se puede restaurar. El
              cliente deja de verlo, aunque sea visible.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void annul()}
                className="rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
              >
                Sí, anular
              </button>
              <button
                type="button"
                onClick={() => setConfirmingAnnul(false)}
                className={secondaryButton}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {confirmingRestore && (
          <div
            role="alertdialog"
            aria-labelledby={restoreTitleId}
            className="space-y-2 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            <p id={restoreTitleId} className="font-medium">
              {RESTORE_WITH_PDF_WARNING}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => void restore()} className={secondaryButton}>
                Sí, restaurar
              </button>
              <button
                type="button"
                onClick={() => setConfirmingRestore(false)}
                className={secondaryButton}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {editing && form ? (
          <FormularioMovimiento
            value={form}
            onChange={setForm}
            submitLabel="Guardar cambios"
            onSubmit={() => save(movimiento, form)}
            onCancel={() => setEditing(false)}
            original={movimiento}
            apiProblems={problems}
            enviando={enviando}
            pdf={pdf}
            onPdfChange={setPdf}
            pdfGuardado={movimiento.pdf}
          />
        ) : (
          <dl className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Dato label="Fecha">{formatMovementDate(movimiento.fecha)}</Dato>
              <Dato label="Tipo">{tipoMovimientoLabel(movimiento.tipo)}</Dato>
              <Dato label="Visible para el cliente">{movimiento.visible ? 'Sí' : 'No'}</Dato>
            </div>
            <Dato label="Descripción">
              <TextoLiteral texto={movimiento.descripcion} />
            </Dato>
            <Dato label="Texto para el cliente">
              <TextoLiteral texto={movimiento.textoCliente ?? EMPTY_VALUE} />
            </Dato>
            <Dato label="PDF">
              {movimiento.pdf ? (
                <div className="space-y-2">
                  <p>
                    {formatPdfSize(movimiento.pdf.tamano)}, subido por{' '}
                    {authorName(movimiento.pdf.subidoPor)} el{' '}
                    {formatDateTime(movimiento.pdf.subidoEn)}.{' '}
                    {movimiento.pdf.visible ? 'Visible para el cliente.' : 'Oculto para el cliente.'}
                  </p>
                  <AccionesPdf
                    verHref={`/panel/causas/${causaId}/movimientos/${movimientoId}/pdf`}
                    etiqueta={`del movimiento del ${formatMovementDate(movimiento.fecha)}`}
                    descargar={() => movimientos.getPdf(causaId, movimientoId)}
                    inicio="/panel"
                  />
                </div>
              ) : (
                'Sin PDF'
              )}
            </Dato>
          </dl>
        )}
      </section>

      <section aria-label="Lo que ve el cliente" className={`space-y-2 p-6 ${CARD}`}>
        <h2 className={SECTION_TITLE}>Lo que ve el cliente</h2>
        <p className="text-sm text-slate-600">{clientViewSummary(movimiento)}</p>
        <TextoLiteral texto={movimiento.textoVisible} className="text-slate-800" />
      </section>

      <section aria-label="Historial de cambios del movimiento" className="space-y-3">
        <h2 className={SECTION_TITLE}>Historial de cambios</h2>
        <HistorialCambios cambios={movimiento.cambios} />
      </section>

      <section aria-label="Registro" className="text-sm text-slate-600">
        {movementAuditLines(movimiento).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>
    </main>
  );
}
