import { describe, expect, it } from 'vitest';
import {
  bufferOfSize,
  minimalPdf,
  notAPdf,
  pdfWithMarkerAt,
  pdfWithPrefix,
  signedPdf,
} from './utilidades/pdfs-de-prueba.js';

const MARKER = Buffer.from('%PDF-', 'latin1');

/**
 * Archivos de prueba de la spec 010 (T2). No usa la base: está entre los e2e porque las
 * utilidades viven en test/, donde solo corren los *.e2e-spec.ts.
 */
describe('Archivos de prueba de los PDF', () => {
  it('minimalPdf arma un PDF que empieza con la marca y termina con %%EOF', () => {
    const pdf = minimalPdf('Hola (prueba)');
    expect(pdf.subarray(0, 5).equals(MARKER)).toBe(true);
    expect(pdf.toString('latin1').trimEnd().endsWith('%%EOF')).toBe(true);
    expect(pdf.toString('latin1')).toContain('(Hola \\(prueba\\)) Tj');
  });

  it('minimalPdf tiene una tabla xref que apunta al inicio de cada objeto', () => {
    const texto = minimalPdf().toString('latin1');
    const xref = Number(/startxref\n(\d+)/.exec(texto)?.[1]);
    expect(texto.startsWith('xref', xref)).toBe(true);
    const offsets = [...texto.matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    offsets.forEach((offset, i) => expect(texto.startsWith(`${i + 1} 0 obj`, offset)).toBe(true));
  });

  it('bufferOfSize arma un PDF válido de exactamente el tamaño pedido', () => {
    for (const size of [2_000, 5_242_880, 5_242_881]) {
      const pdf = bufferOfSize(size);
      expect(pdf.length).toBe(size);
      expect(pdf.subarray(0, 5).equals(MARKER)).toBe(true);
      const texto = pdf.toString('latin1');
      const xref = Number(/startxref\n(\d+)/.exec(texto)?.[1]);
      expect(texto.startsWith('xref', xref)).toBe(true);
    }
  });

  it('pdfWithMarkerAt pone la marca en la posición pedida', () => {
    for (const posicion of [0, 1019, 1020]) {
      expect(pdfWithMarkerAt(posicion).indexOf(MARKER)).toBe(posicion);
    }
  });

  it('pdfWithPrefix agrega los bytes antes de la marca', () => {
    const prefijo = Buffer.from([0xef, 0xbb, 0xbf, 0x0a]);
    const pdf = pdfWithPrefix(prefijo);
    expect(pdf.subarray(0, 4).equals(prefijo)).toBe(true);
    expect(pdf.indexOf(MARKER)).toBe(4);
  });

  it('notAPdf es el comienzo de un JPG, sin la marca', () => {
    const archivo = notAPdf();
    expect([...archivo.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
    expect(archivo.indexOf(MARKER)).toBe(-1);
  });

  it('signedPdf es un PDF con una firma digital', () => {
    const pdf = signedPdf();
    expect(pdf.subarray(0, 5).equals(MARKER)).toBe(true);
    const texto = pdf.toString('latin1');
    expect(texto).toContain('/ByteRange');
    expect(texto).toContain('/Sig');
  });
});
