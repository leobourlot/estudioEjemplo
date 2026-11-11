import {
  BadRequestException,
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerExceptions } from '@nestjs/platform-express/multer/multer/multer.constants.js';
import type { Response } from 'express';
import { lastValueFrom, type Observable, of } from 'rxjs';
import type { RequestConPdf } from './archivo-pdf.decorator.js';
import { MAX_PDF_BYTES, PDF_FORM_MARGIN_BYTES, PDF_MESSAGES } from './reglas-pdf.js';

/** Las opciones que acepta FileInterceptor (el paquete no exporta su tipo desde la raíz). */
type MulterOptions = NonNullable<Parameters<typeof FileInterceptor>[1]>;

/** Las partes de un formulario con archivo: el JSON del DTO y el PDF (plan 010, D2). */
export const DATOS_FIELD = 'datos';
export const PDF_FIELD = 'pdf';

/**
 * Opciones de multer (plan 010, D3). Sin `dest` ni `storage`, multer guarda el archivo en
 * memoria: nunca lo escribe en el disco del servidor (RF-2). Los límites cortan la recepción en
 * cuanto se superan (RF-4). No se limita la cantidad de partes: un segundo archivo tiene que
 * llegar al límite de archivos, para responder "Podés adjuntar un solo PDF".
 */
export const PDF_UPLOAD_OPTIONS = {
  limits: {
    fileSize: MAX_PDF_BYTES,
    files: 1,
    fields: 1,
    fieldSize: PDF_FORM_MARGIN_BYTES,
  },
} satisfies MulterOptions;

const UploadInterceptor = FileInterceptor(PDF_FIELD, PDF_UPLOAD_OPTIONS);

/**
 * Los errores de multer, que @nestjs/platform-express ya convirtió en HttpException con su texto
 * en inglés, pasados a los mensajes de la spec 010 (RF-4). Los textos se comparan con las
 * constantes del mismo paquete.
 */
function translateUploadError(error: unknown): unknown {
  if (error instanceof PayloadTooLargeException) {
    return new PayloadTooLargeException(PDF_MESSAGES.tooLarge);
  }
  if (error instanceof BadRequestException) {
    const message = error.message;
    const secondPdf =
      message.startsWith(multerExceptions.LIMIT_FILE_COUNT) ||
      (message.startsWith(multerExceptions.LIMIT_UNEXPECTED_FILE) &&
        message.endsWith(`- ${PDF_FIELD}`));
    return new BadRequestException(secondPdf ? PDF_MESSAGES.onlyOne : PDF_MESSAGES.invalidForm);
  }
  return error;
}

/** El JSON de la parte `datos`, que pasa a ser el cuerpo del pedido. */
function parseDatos(body: unknown): Record<string, unknown> {
  const campos = body !== null && typeof body === 'object' ? Object.keys(body) : [];
  const datos = (body as Record<string, unknown> | null)?.[DATOS_FIELD];
  if (campos.length !== 1 || typeof datos !== 'string') {
    throw new BadRequestException(PDF_MESSAGES.invalidForm);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(datos);
  } catch {
    throw new BadRequestException(PDF_MESSAGES.invalidForm);
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BadRequestException(PDF_MESSAGES.invalidForm);
  }
  return parsed as Record<string, unknown>;
}

/**
 * Recibe los formularios con PDF (plan 010, D2 y D3). Un pedido JSON pasa sin cambios. Uno
 * `multipart/form-data`:
 * - con un Content-Length mayor que 5 MB más el margen, responde 413 sin leer el cuerpo y cierra
 *   la conexión;
 * - si no, lo recibe en memoria con multer, reemplaza el cuerpo por el JSON de `datos` (así el
 *   ValidationPipe global valida los DTO de siempre, porque los interceptores corren antes que los
 *   pipes) y deja el contenido del PDF para @ArchivoPdf().
 *
 * Nunca guarda, muestra ni registra el nombre del archivo ni el tipo informado (RF-8): descarta
 * `request.file` y solo conserva el contenido.
 */
@Injectable()
export class FormularioConPdfInterceptor implements NestInterceptor {
  private readonly upload: NestInterceptor = new UploadInterceptor();

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestConPdf & { file?: { buffer: Buffer } }>();
    request.archivoPdf = null;
    if (!request.is('multipart/form-data')) return next.handle();

    const declared = Number(request.headers['content-length']);
    if (declared > MAX_PDF_BYTES + PDF_FORM_MARGIN_BYTES) {
      http.getResponse<Response>().setHeader('Connection', 'close');
      throw new PayloadTooLargeException(PDF_MESSAGES.tooLarge);
    }

    try {
      await lastValueFrom(await this.upload.intercept(context, { handle: () => of(null) }));
    } catch (error) {
      throw translateUploadError(error);
    }

    const archivo = request.file;
    delete request.file;
    request.body = parseDatos(request.body);
    request.archivoPdf = archivo ? { contenido: archivo.buffer } : null;
    return next.handle();
  }
}
