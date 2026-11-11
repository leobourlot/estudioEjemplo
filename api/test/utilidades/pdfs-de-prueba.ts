import { readFileSync } from 'node:fs';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';

/**
 * Vacía la tabla pdfs y desvincula los PDF de movimientos y fallos. clearTables
 * (aplicacion-de-tests.ts) no la incluye: la llaman las suites de la spec 010.
 */
export async function clearPdfTables(app: NestExpressApplication): Promise<void> {
  const queryRunner = app.get(DataSource).createQueryRunner();
  try {
    await queryRunner.query('UPDATE movimientos SET pdfId = NULL, pdfVisible = 0');
    await queryRunner.query('UPDATE fallos SET pdfId = NULL');
    await queryRunner.query('DELETE FROM pdfs');
  } finally {
    await queryRunner.release();
  }
}

/**
 * Archivos para los tests de la spec 010 (plan, "Estrategia de tests"). Los PDF se arman a
 * mano, con texto ASCII y una tabla xref correcta, para no depender de ninguna biblioteca.
 */

/** Escapa un texto para usarlo como cadena literal de PDF. */
const pdfString = (texto: string) => texto.replace(/[\\()]/g, (c) => `\\${c}`);

/** Arma un PDF de una página. `relleno` va como comentario después del encabezado. */
function buildPdf(texto: string, relleno = ''): Buffer {
  const contenido = `BT /F1 16 Tf 60 780 Td (${pdfString(texto)}) Tj ET`;
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
  ];
  let pdf = `%PDF-1.4\n${relleno}`;
  const offsets: number[] = [];
  objetos.forEach((objeto, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objeto}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

/** Un PDF válido de una página, con un texto ASCII. */
export function minimalPdf(texto = 'PDF de prueba'): Buffer {
  return buildPdf(texto);
}

/**
 * Un PDF válido de exactamente `size` bytes, completado con un comentario después del
 * encabezado. Como el largo de `startxref` depende del relleno, se ajusta hasta que coincide.
 */
export function bufferOfSize(size: number): Buffer {
  let relleno = 0;
  for (let intento = 0; intento < 5; intento++) {
    const pdf = buildPdf('PDF de prueba', relleno > 0 ? `%${'A'.repeat(relleno - 2)}\n` : '');
    if (pdf.length === size) return pdf;
    relleno += size - pdf.length;
    if (relleno < 2) throw new Error(`No se puede armar un PDF de ${size} bytes`);
  }
  throw new Error(`No se pudo armar un PDF de ${size} bytes`);
}

/** Un PDF válido con `prefijo` antes de la marca `%PDF-` (lo hacen ciertos programas). */
export function pdfWithPrefix(prefijo: Buffer): Buffer {
  return Buffer.concat([prefijo, minimalPdf()]);
}

/** Un PDF con la marca `%PDF-` empezando en el byte `posicion`. */
export function pdfWithMarkerAt(posicion: number): Buffer {
  return pdfWithPrefix(Buffer.alloc(posicion, '.'));
}

/** Los primeros bytes de un JPG: un archivo que no es PDF. */
export function notAPdf(): Buffer {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
    Buffer.from('JFIF\0', 'latin1'),
    Buffer.alloc(200, 0x11),
  ]);
}

/**
 * Un PDF con una firma digital real (CMS separada) hecha con un certificado autofirmado de
 * prueba, sin datos reales (plan 010, riesgo 7).
 */
export function signedPdf(): Buffer {
  return readFileSync(new URL('../archivos/firmado.pdf', import.meta.url));
}
