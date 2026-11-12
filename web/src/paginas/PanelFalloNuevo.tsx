import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormularioFallo } from '../componentes/FormularioFallo';
import { PreguntaFalloRepetido } from '../componentes/PreguntaFalloRepetido';
import { useJurisprudenciaService } from '../componentes/ProveedorServicios';
import { useMantenerSesion } from '../componentes/useMantenerSesion';
import { errorMessage } from '../servicios/cliente-http';
import { buildCreateRulingData, EMPTY_RULING_FORM } from '../servicios/formulario-fallo';
import { afterSaveError, initialPdfState, pdfChanges } from '../servicios/formulario-pdf';
import { pendingQuestion, type PendingQuestion, type QuestionOption } from '../servicios/preguntas';
import { CARD, PAGE, PAGE_TITLE } from '../componentes/estilos-aplicacion';

/**
 * Carga de un fallo (RF-16). Si la API pregunta por un fallo repetido (RF-18), muestra con
 * cuál coincide: "Guardar igual" repite la carga con la confirmación, y "Cancelar" deja el
 * formulario como estaba. Al guardarlo lleva a su ficha. Lo escrito vive solo en el estado
 * del componente (principio 5).
 */
export function PanelFalloNuevo() {
  const jurisprudencia = useJurisprudenciaService();
  const navigate = useNavigate();
  const notifyTyping = useMantenerSesion();
  const [form, setForm] = useState(EMPTY_RULING_FORM);
  const [pdf, setPdf] = useState(() => initialPdfState(false));
  const [question, setQuestion] = useState<PendingQuestion | null>(null);
  const [apiProblems, setApiProblems] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  /**
   * La carga con su PDF, si hay, en un solo pedido (spec 010, RF-24). La respuesta a la pregunta
   * de repetido vuelve a enviar el mismo archivo, sin elegirlo de nuevo (RF-25).
   */
  async function save(confirmarRepetido: boolean) {
    setEnviando(true);
    setApiProblems([]);
    setQuestion(null);
    try {
      const { archivo, datos } = pdfChanges(pdf);
      const data = {
        ...buildCreateRulingData(form),
        ...datos,
        ...(confirmarRepetido ? { confirmarRepetido: true } : {}),
      };
      const fallo = await (archivo
        ? jurisprudencia.createRuling(data, archivo)
        : jurisprudencia.createRuling(data));
      navigate(`/panel/jurisprudencia/${fallo.id}`);
    } catch (caught) {
      const pending = pendingQuestion(caught);
      if (pending) setQuestion(pending);
      else {
        const { problems, estado } = afterSaveError(caught, pdf);
        setApiProblems(problems.length > 0 ? problems : [errorMessage(caught)]);
        setPdf(estado);
      }
      setEnviando(false);
    }
  }

  function answer(option: QuestionOption) {
    if (option.kind === 'confirm') void save(true);
    else setQuestion(null);
  }

  return (
    <main className={PAGE}>
      <h1 className={PAGE_TITLE}>Nuevo fallo</h1>

      {question && <PreguntaFalloRepetido question={question} onAnswer={answer} />}

      <div className={`p-6 ${CARD}`}>
        <FormularioFallo
          value={form}
          onChange={setForm}
          submitLabel="Guardar fallo"
          onSubmit={() => save(false)}
          onCancel={() => navigate('/panel/jurisprudencia')}
          apiProblems={apiProblems}
          enviando={enviando}
          onTyping={notifyTyping}
          pdf={pdf}
          onPdfChange={setPdf}
        />
      </div>
    </main>
  );
}
