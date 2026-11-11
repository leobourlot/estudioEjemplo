import { describe, expect, it } from 'vitest';
import { PDF_UPLOAD_OPTIONS } from './formulario-con-pdf.interceptor.js';
import { MAX_PDF_BYTES, PDF_FORM_MARGIN_BYTES } from './reglas-pdf.js';

describe('Opciones de la recepción del PDF (plan 010, D3)', () => {
  it('guarda el archivo en memoria: sin dest ni storage, nunca en el disco (RF-2)', () => {
    expect(PDF_UPLOAD_OPTIONS).not.toHaveProperty('dest');
    expect(PDF_UPLOAD_OPTIONS).not.toHaveProperty('storage');
  });

  it('corta en 5 MB, un solo archivo y una sola parte de datos (RF-3, RF-4)', () => {
    expect(PDF_UPLOAD_OPTIONS.limits).toEqual({
      fileSize: MAX_PDF_BYTES,
      files: 1,
      fields: 1,
      fieldSize: PDF_FORM_MARGIN_BYTES,
    });
  });
});
