import { describe, expect, it } from 'vitest';
import { MOVEMENT_TYPES } from '../movimientos/movimiento.entity.js';
import {
  CODE_ALPHABET,
  generateCode,
  MAX_PDF_BYTES,
  movementPdfName,
  PDF_MESSAGES,
  rulingPdfName,
  TYPE_NAMES_WITHOUT_ACCENTS,
  validatePdfContent,
} from './reglas-pdf.js';

const MARKER = '%PDF-1.4\n';

/** Un contenido de `size` bytes que empieza con la marca de PDF. */
const pdfOfSize = (size: number) => {
  const buffer = Buffer.alloc(size, 0x2e);
  buffer.write(MARKER, 0, 'latin1');
  return buffer;
};

/** Un contenido con la marca empezando en el byte `posicion`. */
const markerAt = (posicion: number) =>
  Buffer.concat([Buffer.alloc(posicion, 0x2e), Buffer.from(`${MARKER}resto`, 'latin1')]);

describe('validatePdfContent (RF-3, RF-4)', () => {
  it('rechaza un archivo vacío', () => {
    expect(validatePdfContent(Buffer.alloc(0))).toBe(PDF_MESSAGES.empty);
  });

  it('acepta 5.242.880 bytes y rechaza uno más', () => {
    expect(MAX_PDF_BYTES).toBe(5_242_880);
    expect(validatePdfContent(pdfOfSize(5_242_880))).toBeNull();
    expect(validatePdfContent(pdfOfSize(5_242_881))).toBe(PDF_MESSAGES.tooLarge);
  });

  it('controla el tamaño antes que la marca', () => {
    expect(validatePdfContent(Buffer.alloc(5_242_881, 0x2e))).toBe(PDF_MESSAGES.tooLarge);
  });

  it('acepta la marca en el byte 0 y en el 1.019, y la rechaza en el 1.020', () => {
    expect(validatePdfContent(markerAt(0))).toBeNull();
    expect(validatePdfContent(markerAt(1019))).toBeNull();
    expect(validatePdfContent(markerAt(1020))).toBe(PDF_MESSAGES.notPdf);
  });

  it('rechaza un JPG', () => {
    const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100, 0x11)]);
    expect(validatePdfContent(jpg)).toBe(PDF_MESSAGES.notPdf);
  });

  it('tiene los mensajes de la spec', () => {
    expect(PDF_MESSAGES.notPdf).toBe('El archivo debe ser un PDF');
    expect(PDF_MESSAGES.empty).toBe('El archivo está vacío');
    expect(PDF_MESSAGES.tooLarge).toBe('El archivo no puede superar los 5 MB');
    expect(PDF_MESSAGES.onlyOne).toBe('Podés adjuntar un solo PDF');
    expect(PDF_MESSAGES.notFound).toBe('No existe ese PDF');
    expect(PDF_MESSAGES.demoLimit).toBe(
      'En la demo se pueden tener hasta 4 PDF. Quitá uno para subir otro',
    );
  });
});

describe('generateCode (RF-6)', () => {
  it('arma 6 caracteres con el azar que recibe', () => {
    const valores = [0, 25, 26, 35, 1, 10];
    let i = 0;
    expect(generateCode(() => valores[i++])).toBe('AZ09BK');
  });

  it('pide números entre 0 y el largo del alfabeto', () => {
    const maximos: number[] = [];
    generateCode((max) => {
      maximos.push(max);
      return 0;
    });
    expect(maximos).toEqual(Array(6).fill(CODE_ALPHABET.length));
  });

  it('con el azar del sistema nunca sale del alfabeto', () => {
    for (let i = 0; i < 1_000; i++) {
      expect(generateCode()).toMatch(/^[A-Z0-9]{6}$/);
    }
  });
});

describe('Nombres de los archivos (RF-7)', () => {
  it('tiene un nombre sin tildes para cada tipo de movimiento', () => {
    expect(Object.keys(TYPE_NAMES_WITHOUT_ACCENTS).sort()).toEqual([...MOVEMENT_TYPES].sort());
    for (const nombre of Object.values(TYPE_NAMES_WITHOUT_ACCENTS)) {
      expect(nombre).toMatch(/^[A-Za-z ]+$/);
    }
  });

  it('arma el nombre del PDF de un movimiento', () => {
    expect(movementPdfName({ fecha: '2026-10-24', tipo: 'resolucion' }, 'K7Q2MX')).toBe(
      '2026-10-24 Resolucion K7Q2MX.pdf',
    );
    expect(movementPdfName({ fecha: '2026-10-24', tipo: 'escrito_presentado' }, 'K7Q2MX')).toBe(
      '2026-10-24 Escrito presentado K7Q2MX.pdf',
    );
    expect(movementPdfName({ fecha: '2026-10-24', tipo: 'notificacion' }, 'K7Q2MX')).toBe(
      '2026-10-24 Notificacion K7Q2MX.pdf',
    );
  });

  it('arma el nombre del PDF de un fallo', () => {
    expect(rulingPdfName({ fecha: '2019-05-12' }, 'P4N8RC')).toBe('Fallo 2019-05-12 P4N8RC.pdf');
  });

  it('todos los nombres son ASCII', () => {
    for (const tipo of MOVEMENT_TYPES) {
      expect(movementPdfName({ fecha: '2026-10-24', tipo }, 'ABC123')).toMatch(/^[\x20-\x7e]+$/);
    }
  });
});
