import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { testMember } from '../pruebas/causas-de-prueba';
import { SelectorIntegrantes } from './SelectorIntegrantes';

const juan = testMember({ id: 1, nombre: 'Juan', apellido: 'Álvarez' });
const fuera = testMember({ id: 2, nombre: 'Lucía', apellido: 'Benítez', fueraDelPlan: true });
const carla = testMember({ id: 4, nombre: 'Carla', apellido: 'Robledo', rol: 'admin' });
const MEMBERS = [juan, fuera, carla];

const responsableOptions = () =>
  within(screen.getByLabelText('Responsable'))
    .getAllByRole('option')
    .map((option) => option.textContent);

const collaboratorLabels = () =>
  within(screen.getByRole('group', { name: 'Colaboradores' }))
    .getAllByRole('checkbox')
    .map((checkbox) => checkbox.closest('label')?.textContent);

/** Spec 011, RF-26: los integrantes fuera del plan no se agregan a una causa. */
describe('SelectorIntegrantes con integrantes fuera del plan', () => {
  it('no los ofrece en el alta', () => {
    render(
      <SelectorIntegrantes
        members={MEMBERS}
        value={{ responsableId: null, colaboradorIds: [] }}
        onChange={vi.fn()}
      />,
    );

    expect(responsableOptions()).toEqual([
      'Elegí el responsable',
      'Álvarez, Juan',
      'Robledo, Carla',
    ]);
    expect(collaboratorLabels()).toEqual(['Álvarez, Juan', 'Robledo, Carla']);
  });

  it('lo sigue mostrando donde ya figuraba, sin marcarlo', () => {
    render(
      <SelectorIntegrantes
        members={MEMBERS}
        value={{ responsableId: 1, colaboradorIds: [2] }}
        assigned={{ responsableId: 1, colaboradorIds: [2] }}
        onChange={vi.fn()}
      />,
    );

    expect(collaboratorLabels()).toEqual(['Benítez, Lucía', 'Robledo, Carla']);
    expect(responsableOptions()).not.toContain('Benítez, Lucía');
  });
});
