import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type FormEvent, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ListaDeErrores } from './ListaDeErrores';

/** Formulario mínimo: cada envío fija los problemas que se le indican. */
function Formulario({ problemsOnSubmit }: { problemsOnSubmit: string[][] }) {
  const [problems, setProblems] = useState<string[]>([]);
  const [sent, setSent] = useState(0);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProblems(problemsOnSubmit[Math.min(sent, problemsOnSubmit.length - 1)]);
    setSent(sent + 1);
  }

  return (
    <form aria-label="Formulario" onSubmit={handleSubmit} noValidate>
      {/* Lista nueva en cada render, como en los formularios reales. */}
      <ListaDeErrores messages={[...problems]} />
      <input aria-label="Dato" />
      <button type="submit">Guardar</button>
    </form>
  );
}

const PROBLEMS = ['Indicá la fecha del fallo', 'Indicá el sumario del fallo'];

const dialog = () => screen.queryByRole('dialog', { name: 'Revisá lo siguiente' });

async function submitWith(problemsOnSubmit: string[][]) {
  const user = userEvent.setup();
  render(<Formulario problemsOnSubmit={problemsOnSubmit} />);
  await user.click(screen.getByRole('button', { name: 'Guardar' }));
  return user;
}

describe('ListaDeErrores (spec 008, RF-29)', () => {
  it('sin problemas no muestra nada', () => {
    render(<Formulario problemsOnSubmit={[[]]} />);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(dialog()).toBeNull();
  });

  it('muestra los problemas en una ventana centrada, con el foco en ella', async () => {
    await submitWith([PROBLEMS]);

    const ventana = dialog()!;
    expect(ventana.getAttribute('aria-modal')).toBe('true');
    expect(
      within(ventana)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(PROBLEMS);
    // Fuera del formulario, para que se vea aunque se haya bajado en la página.
    expect(screen.getByRole('form').contains(ventana)).toBe(false);
    expect(document.activeElement).toBe(ventana);
    expect(document.body.style.overflow).toBe('hidden');
    // Los problemas se ven una sola vez: en la ventana.
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('con "Entendido" se cierra y los problemas quedan arriba del formulario', async () => {
    const user = await submitWith([PROBLEMS]);

    await user.click(within(dialog()!).getByRole('button', { name: 'Entendido' }));

    expect(dialog()).toBeNull();
    const form = within(screen.getByRole('form'));
    expect(form.getByRole('alert').textContent).toBe(PROBLEMS.join(''));
    expect(document.body.style.overflow).toBe('');
    // El foco vuelve a donde estaba.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Guardar' }));
  });

  it('se cierra con Esc', async () => {
    const user = await submitWith([PROBLEMS]);

    await user.keyboard('{Escape}');

    expect(dialog()).toBeNull();
    expect(within(screen.getByRole('form')).getByRole('alert')).toBeTruthy();
  });

  it('se cierra tocando fuera de la ventana, pero no tocando dentro', async () => {
    const user = await submitWith([PROBLEMS]);

    await user.click(within(dialog()!).getByText(PROBLEMS[0]));
    expect(dialog()).toBeTruthy();

    await user.click(dialog()!.parentElement!);
    expect(dialog()).toBeNull();
  });

  it('se vuelve a abrir al guardar de nuevo con los mismos problemas', async () => {
    const user = await submitWith([PROBLEMS, PROBLEMS]);
    await user.click(within(dialog()!).getByRole('button', { name: 'Entendido' }));

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(dialog()).toBeTruthy();
  });

  it('se vuelve a abrir cuando cambian los problemas', async () => {
    const user = await submitWith([PROBLEMS, [PROBLEMS[0]]]);
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(
      within(dialog()!)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([PROBLEMS[0]]);
  });

  it('no se vuelve a abrir mientras se escribe', async () => {
    const user = await submitWith([PROBLEMS]);
    await user.keyboard('{Escape}');

    await user.type(screen.getByLabelText('Dato'), 'abc');

    expect(dialog()).toBeNull();
  });

  it('con Tab el foco no sale de la ventana', async () => {
    const user = await submitWith([PROBLEMS]);
    const entendido = within(dialog()!).getByRole('button', { name: 'Entendido' });

    await user.tab();
    expect(document.activeElement).toBe(entendido);
    await user.tab();
    expect(document.activeElement).toBe(entendido);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(entendido);
  });

  it('fuera de un formulario se abre con cada lista nueva', () => {
    const { rerender } = render(<ListaDeErrores messages={[]} />);
    expect(dialog()).toBeNull();

    rerender(<ListaDeErrores messages={['No se pudo desactivar']} />);

    expect(within(dialog()!).getByRole('alert').textContent).toBe('No se pudo desactivar');
  });
});
