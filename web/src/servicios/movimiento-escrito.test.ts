import { describe, expect, it } from 'vitest';
import { buildCreateMovementData, validateMovementForm } from './formulario-movimiento';
import { movementFormFromEscrito, todayInBuenosAires } from './movimiento-escrito';

// 30/10/2026 a las 15:00 en Buenos Aires.
const NOW = new Date('2026-10-30T18:00:00Z');

describe('todayInBuenosAires (RF-54)', () => {
  it('devuelve el día de Buenos Aires como AAAA-MM-DD', () => {
    expect(todayInBuenosAires(NOW)).toBe('2026-10-30');
  });

  it('cambia de día a las 03:00 UTC', () => {
    expect(todayInBuenosAires(new Date('2026-10-31T02:59:00Z'))).toBe('2026-10-30');
    expect(todayInBuenosAires(new Date('2026-10-31T03:00:00Z'))).toBe('2026-10-31');
  });
});

describe('movementFormFromEscrito (RF-54, RF-55)', () => {
  it('pone el día de hoy, Escrito presentado y el título del modelo, oculto para el cliente', () => {
    expect(movementFormFromEscrito('Oficio al Registro de la Propiedad', NOW)).toEqual({
      fecha: '2026-10-30',
      tipo: 'escrito_presentado',
      descripcion: 'Escrito: Oficio al Registro de la Propiedad',
      textoCliente: '',
      visible: false,
    });
  });

  it('la carga lleva solo esos datos, sin texto para el cliente', () => {
    expect(buildCreateMovementData(movementFormFromEscrito('Cédula', NOW))).toEqual({
      fecha: '2026-10-30',
      tipo: 'escrito_presentado',
      descripcion: 'Escrito: Cédula',
      textoCliente: null,
      visible: false,
    });
  });

  it('con un título de 150 caracteres y todos sus símbolos, el formulario es válido', () => {
    // Los caracteres del título de un modelo (RF-4) están todos permitidos en la descripción.
    const symbols = 'Ññ Áü 123 . , ; : / - _ ( ) " \' $ & # ° º ª';
    const titulo = symbols + 'a'.repeat(150 - [...symbols].length);
    expect([...titulo]).toHaveLength(150);

    expect(validateMovementForm(movementFormFromEscrito(titulo, NOW))).toEqual([]);
  });
});
