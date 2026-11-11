import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, type EntityManager, QueryFailedError } from 'typeorm';
import type { Environment } from '../configuracion/validar-entorno.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import { Pdf } from './pdf.entity.js';
import { DEMO_PDF_LIMIT, generateCode, PDF_MESSAGES, validatePdfContent } from './reglas-pdf.js';

/** Cuántas veces se genera un código nuevo si choca con uno guardado (RF-6). */
const CODE_ATTEMPTS = 5;

/** Un PDF guardado, sin su contenido. */
export type PdfGuardado = Omit<Pdf, 'contenido' | 'subidoPor'>;

const isCodeCollision = (error: unknown) =>
  error instanceof QueryFailedError &&
  (error.driverError as { code?: string } | undefined)?.code === 'ER_DUP_ENTRY' &&
  error.message.includes('UQ_pdfs_codigo');

/**
 * Los PDF de movimientos y fallos (plan 010, "PdfsService"). Guardar y borrar corren dentro de
 * la transacción de quien los llama, así el PDF y los datos del formulario se guardan todo o nada
 * (RF-10). Solo findContent lee el contenido (plan 010, D1).
 */
@Injectable()
export class PdfsService {
  /** Entero al azar en [0, max), para el código. Los tests lo reemplazan. */
  protected random: (max: number) => number = randomInt;

  private readonly demoMode: boolean;

  constructor(
    private readonly dataSource: DataSource,
    config: ConfigService<Environment, true>,
  ) {
    this.demoMode = config.get('MODO_DEMO', { infer: true });
  }

  /**
   * Guarda un PDF ya validado (validatePdfContent), tal como llegó (RF-5), con un código nuevo
   * (RF-6), su tamaño, su autor y el momento (RF-9). Si el código choca con uno guardado, prueba
   * con otro, hasta 5 veces: en MySQL, un INSERT rechazado no deshace la transacción.
   *
   * Con el modo demo, la base tiene a lo sumo 4 PDF (RF-41). La lectura con FOR UPDATE bloquea
   * las filas y el hueco del final del índice (REPEATABLE READ), así que una segunda subida
   * simultánea espera a que termine esta transacción y después cuenta el PDF nuevo. Un reemplazo
   * no suma: quien llama borra el anterior antes de guardar el nuevo.
   */
  async create(manager: EntityManager, contenido: Buffer, actor: Usuario): Promise<PdfGuardado> {
    if (this.demoMode) {
      const guardados: unknown[] = await manager.query('SELECT id FROM pdfs FOR UPDATE');
      if (guardados.length >= DEMO_PDF_LIMIT) throw new ConflictException(PDF_MESSAGES.demoLimit);
    }
    for (let intento = 1; ; intento++) {
      const datos = {
        tamano: contenido.length,
        codigo: generateCode(this.random),
        subidoPorId: actor.id,
        subidoEn: new Date(),
      };
      try {
        const { identifiers } = await manager.insert(Pdf, { ...datos, contenido });
        return { id: identifiers[0].id as number, ...datos };
      } catch (error) {
        if (!isCodeCollision(error) || intento === CODE_ATTEMPTS) throw error;
      }
    }
  }

  /**
   * Rechaza un contenido que no es un PDF aceptable (RF-3, RF-4), antes de abrir la transacción.
   * El tamaño ya lo cortó el interceptor; se repite como segunda barrera, con el mismo 413.
   */
  assertValid(contenido: Buffer): void {
    const message = validatePdfContent(contenido);
    if (message === PDF_MESSAGES.tooLarge) throw new PayloadTooLargeException(message);
    if (message !== null) throw new BadRequestException(message);
  }

  /** Borra un PDF que ya no está en ningún movimiento ni fallo (RF-14). */
  async remove(manager: EntityManager, pdfId: number): Promise<void> {
    await manager.delete(Pdf, pdfId);
  }

  /** El PDF con su contenido, o null si no existe. La única consulta que lo lee (plan 010, D1). */
  findContent(pdfId: number): Promise<Pdf | null> {
    return this.dataSource
      .getRepository(Pdf)
      .createQueryBuilder('pdf')
      .addSelect('pdf.contenido')
      .where('pdf.id = :pdfId', { pdfId })
      .getOne();
  }
}
