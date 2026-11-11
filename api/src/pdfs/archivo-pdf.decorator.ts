import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * El PDF recibido en un formulario (plan 010, D3): solo su contenido. Nada del nombre con el que
 * se subió ni del tipo que informó el navegador llega más allá del interceptor (spec 010, RF-8).
 */
export interface ArchivoPdfRecibido {
  contenido: Buffer;
}

/** Un pedido después de FormularioConPdfInterceptor. */
export interface RequestConPdf extends Request {
  archivoPdf?: ArchivoPdfRecibido | null;
}

/** El PDF del formulario, o null si el pedido no trae uno (o es JSON). */
export const ArchivoPdf = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ArchivoPdfRecibido | null =>
    context.switchToHttp().getRequest<RequestConPdf>().archivoPdf ?? null,
);
