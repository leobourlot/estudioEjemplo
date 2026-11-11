import { describe, expect, it } from 'vitest';
import {
  formatPdfSize,
  isPdfFileError,
  MAX_PDF_BYTES,
  PDF_FILE_MESSAGES,
  validatePdfFile,
} from './archivo-pdf';

const MARKER = '%PDF-1.4\n';

/** Un archivo de `size` bytes que empieza con la marca de PDF. */
const pdfOfSize = (size: number) => {
  const bytes = new Uint8Array(size).fill(0x2e);
  bytes.set(new TextEncoder().encode(MARKER));
  return new File([bytes], 'escrito.pdf', { type: 'application/pdf' });
};

/** Un archivo con la marca empezando en el byte `posicion`. */
const markerAt = (posicion: number) =>
  new File(['.'.repeat(posicion), `${MARKER}resto`], 'escrito.pdf');

describe('validatePdfFile (spec 010, RF-3, RF-4)', () => {
  it('rechaza un archivo vacío', async () => {
    expect(await validatePdfFile(new File([], 'vacio.pdf'))).toBe(PDF_FILE_MESSAGES.empty);
  });

  it('acepta 5.242.880 bytes y rechaza uno más', async () => {
    expect(MAX_PDF_BYTES).toBe(5_242_880);
    expect(await validatePdfFile(pdfOfSize(5_242_880))).toBeNull();
    expect(await validatePdfFile(pdfOfSize(5_242_881))).toBe(PDF_FILE_MESSAGES.tooLarge);
  });

  it('acepta la marca después de algunos bytes, hasta el byte 1.019, y la rechaza en el 1.020', async () => {
    expect(await validatePdfFile(markerAt(0))).toBeNull();
    expect(await validatePdfFile(markerAt(3))).toBeNull();
    expect(await validatePdfFile(markerAt(1019))).toBeNull();
    expect(await validatePdfFile(markerAt(1020))).toBe(PDF_FILE_MESSAGES.notPdf);
  });

  it('rechaza un JPG renombrado como ".pdf"', async () => {
    const jpg = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])], 'foto.pdf');
    expect(await validatePdfFile(jpg)).toBe(PDF_FILE_MESSAGES.notPdf);
  });

  it('usa los mismos mensajes que la api', () => {
    expect(PDF_FILE_MESSAGES).toEqual({
      notPdf: 'El archivo debe ser un PDF',
      empty: 'El archivo está vacío',
      tooLarge: 'El archivo no puede superar los 5 MB',
      onlyOne: 'Podés adjuntar un solo PDF',
    });
  });
});

describe('formatPdfSize (spec 010, RF-9)', () => {
  it.each([
    [300, '1 KB'],
    [850_000, '830 KB'],
    [1_048_000, '1023 KB'],
    [1_048_500, '1 MB'],
    [2_300_000, '2 MB'],
    [5_242_880, '5 MB'],
  ])('%i bytes se muestran como %s', (bytes, texto) => {
    expect(formatPdfSize(bytes)).toBe(texto);
  });
});

describe('isPdfFileError', () => {
  it.each(Object.values(PDF_FILE_MESSAGES))('reconoce "%s"', (mensaje) => {
    expect(isPdfFileError(mensaje)).toBe(true);
  });

  it('no confunde otro mensaje con uno del archivo', () => {
    expect(isPdfFileError('Indicá la descripción del movimiento')).toBe(false);
  });
});
