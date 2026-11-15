import { describe, expect, it } from 'vitest';
import {
  BYTES_PER_GB,
  exceedsPdfSpace,
  MAX_STAFF_BASICO,
  NEAR_LIMIT_RATIO,
  PLAN_MESSAGES,
  selectOutsidePlan,
  type StaffMember,
} from './reglas-plan.js';

function member(id: number, creadoEn: string, esPrincipal = false): StaffMember {
  return { id, esPrincipal, creadoEn: new Date(creadoEn) };
}

describe('selectOutsidePlan (spec 011, RF-20)', () => {
  it('con 1 o 2 integrantes no marca a nadie', () => {
    expect(selectOutsidePlan([member(1, '2020-01-01', true)])).toEqual([]);
    expect(selectOutsidePlan([member(1, '2020-01-01', true), member(2, '2021-01-01')])).toEqual([]);
  });

  it('con 3 deja al principal y al más antiguo de los demás', () => {
    const integrantes = [
      member(1, '2020-01-01', true),
      member(2, '2023-01-01'),
      member(3, '2021-06-01'),
    ];
    expect(selectOutsidePlan(integrantes)).toEqual([2]);
  });

  it('con 4 marca a los dos más nuevos, sin importar el orden recibido', () => {
    const integrantes = [
      member(4, '2024-01-01'),
      member(2, '2022-01-01'),
      member(1, '2020-01-01', true),
      member(3, '2023-01-01'),
    ];
    expect(selectOutsidePlan(integrantes).sort()).toEqual([3, 4]);
  });

  it('el principal más nuevo que los demás igual queda, con el más antiguo de los otros', () => {
    const integrantes = [
      member(5, '2025-01-01', true),
      member(2, '2019-01-01'),
      member(3, '2018-01-01'),
    ];
    expect(selectOutsidePlan(integrantes)).toEqual([2]);
  });

  it('con la misma fecha de creación gana la cuenta creada primero (id menor)', () => {
    const integrantes = [
      member(1, '2020-01-01', true),
      member(8, '2021-01-01T10:00:00Z'),
      member(6, '2021-01-01T10:00:00Z'),
    ];
    expect(selectOutsidePlan(integrantes)).toEqual([8]);
  });

  it('nunca devuelve al principal', () => {
    const integrantes = [
      member(9, '2026-01-01', true),
      member(1, '2010-01-01'),
      member(2, '2011-01-01'),
      member(3, '2012-01-01'),
    ];
    expect(selectOutsidePlan(integrantes)).not.toContain(9);
    expect(selectOutsidePlan(integrantes)).toHaveLength(integrantes.length - MAX_STAFF_BASICO);
  });
});

describe('exceedsPdfSpace (spec 011, RF-28)', () => {
  const total = 10 * BYTES_PER_GB;

  it('llegar justo al total no lo supera', () => {
    expect(exceedsPdfSpace(total - 100, 100, total)).toBe(false);
  });

  it('un byte más lo supera', () => {
    expect(exceedsPdfSpace(total - 100, 101, total)).toBe(true);
  });

  it('en un reemplazo, el usado ya no cuenta el anterior: 4 MB por 5 MB con 1 MB libre entra', () => {
    const mb = 1_048_576;
    const usadoConAnterior = total - mb;
    const usadoSinAnterior = usadoConAnterior - 4 * mb;
    expect(exceedsPdfSpace(usadoSinAnterior, 5 * mb, total)).toBe(false);
  });
});

describe('constantes y textos (spec 011, anexo A)', () => {
  it('el plan Básico admite 2 integrantes y el aviso es desde el 90 %', () => {
    expect(MAX_STAFF_BASICO).toBe(2);
    expect(NEAR_LIMIT_RATIO).toBe(0.9);
    expect(BYTES_PER_GB).toBe(1_073_741_824);
  });

  it('los mensajes coinciden letra por letra con la spec', () => {
    expect(PLAN_MESSAGES.featureNotIncluded).toBe(
      'Tu plan no incluye esta función. Está disponible en el plan Premium.',
    );
    expect(PLAN_MESSAGES.staffLimit).toBe(
      'El plan Básico incluye hasta 2 integrantes del estudio habilitados. Para sumar otro, desactivá uno o pasá al plan Premium.',
    );
    expect(PLAN_MESSAGES.outsidePlanLogin).toBe(
      'Tu cuenta no está habilitada en el plan actual del estudio. Consultá con quien administra el estudio.',
    );
    expect(PLAN_MESSAGES.outsidePlanAccount).toBe(
      'Esta cuenta está fuera del plan Básico. Habilitala para modificarla.',
    );
    expect(PLAN_MESSAGES.updating).toBe(
      'El sistema se está actualizando. Probá de nuevo en unos minutos',
    );
  });

  it('T-9 lleva el total en GB enteros', () => {
    expect(PLAN_MESSAGES.pdfSpaceFull(10 * BYTES_PER_GB)).toBe(
      'Se completó el espacio para PDF del estudio (10 GB). Quitá algún PDF que no necesites o pedí más espacio a Bourder Web.',
    );
    expect(PLAN_MESSAGES.pdfSpaceFull(20 * BYTES_PER_GB)).toContain('(20 GB)');
  });
});
