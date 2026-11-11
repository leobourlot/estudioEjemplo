import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';

/**
 * La respuesta HTTP con un PDF (plan 010, "Entrega del PDF"). Siempre como descarga, nunca para
 * mostrarlo: abierto a mano desde el dominio de la api, se descarga y no se interpreta como página
 * (plan 010, D4). La web lo muestra con un Blob que arma ella (D4) y lee el nombre de
 * Content-Disposition (D5). El nombre es ASCII por construcción (RF-7), así que va sin codificar.
 */
export function toPdfResponse(response: Response, contenido: Buffer, nombre: string): StreamableFile {
  // Reemplaza el no-store global: además, que ningún intermediario guarde copia (RF-36).
  response.setHeader('Cache-Control', 'no-store, private');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  response.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  return new StreamableFile(contenido, {
    type: 'application/pdf',
    disposition: `attachment; filename="${nombre}"`,
    length: contenido.length,
  });
}
