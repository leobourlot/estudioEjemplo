import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  type StreamableFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, Roles } from '../autenticacion/decoradores.js';
import { ArchivoPdf, type ArchivoPdfRecibido } from '../pdfs/archivo-pdf.decorator.js';
import { FormularioConPdfInterceptor } from '../pdfs/formulario-con-pdf.interceptor.js';
import { PDF_MESSAGES } from '../pdfs/reglas-pdf.js';
import { toPdfResponse } from '../pdfs/respuesta-pdf.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import { CreateMovimientoDto } from './dto/crear-movimiento.dto.js';
import { ListMovimientosQueryDto } from './dto/listar-movimientos.dto.js';
import { UpdateMovimientoDto } from './dto/modificar-movimiento.dto.js';
import type { MovimientoDetalle } from './movimiento-detalle.js';
import {
  MOVIMIENTOS_MESSAGES,
  type MovimientoPage,
  MovimientosService,
} from './movimientos.service.js';

/** Un id que no es un número no puede ser una causa existente: 404, como cualquier otro. */
const CausaIdPipe = new ParseIntPipe({
  exceptionFactory: () => new NotFoundException(MOVIMIENTOS_MESSAGES.causaNotFound),
});

/** Un movimiento con id no numérico no existe en la causa (RF-34). */
const MovimientoIdPipe = new ParseIntPipe({
  exceptionFactory: () => new NotFoundException(MOVIMIENTOS_MESSAGES.notFound),
});

/** En la descarga del PDF, cualquier id no numérico responde el 404 único (spec 010, RF-37). */
const PdfIdPipe = new ParseIntPipe({
  exceptionFactory: () => new NotFoundException(PDF_MESSAGES.notFound),
});

/**
 * Movimientos de una causa (plan 003). Solo administradores y abogados: los guards globales
 * de la spec 001 rechazan a clientes (403) y visitantes (401) antes de llegar acá (RF-35).
 * Las rutas se anidan bajo la causa, como las partes en la spec 002.
 */
@Roles('admin', 'abogado')
@Controller('panel/causas/:causaId/movimientos')
export class MovimientosController {
  constructor(private readonly movimientos: MovimientosService) {}

  @Get()
  list(
    @Param('causaId', CausaIdPipe) causaId: number,
    @Query() query: ListMovimientosQueryDto,
  ): Promise<MovimientoPage> {
    return this.movimientos.list(causaId, query);
  }

  /**
   * El PDF del movimiento, como descarga (spec 010, RF-28; plan 010, "Entrega del PDF"). Ids no
   * numéricos responden el mismo 404 que cualquier otro caso (RF-37).
   */
  @Get(':movimientoId/pdf')
  async downloadPdf(
    @Param('causaId', PdfIdPipe) causaId: number,
    @Param('movimientoId', PdfIdPipe) movimientoId: number,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { contenido, nombre } = await this.movimientos.getPdf(causaId, movimientoId);
    return toPdfResponse(response, contenido, nombre);
  }

  @Get(':movimientoId')
  findOne(
    @Param('causaId', CausaIdPipe) causaId: number,
    @Param('movimientoId', MovimientoIdPipe) movimientoId: number,
  ): Promise<MovimientoDetalle> {
    return this.movimientos.findOne(causaId, movimientoId);
  }

  /** JSON, o un formulario con `datos` y `pdf` (spec 010, plan 010, D2). */
  @Post()
  @UseInterceptors(FormularioConPdfInterceptor)
  create(
    @CurrentUser() actor: Usuario,
    @Param('causaId', CausaIdPipe) causaId: number,
    @Body() body: CreateMovimientoDto,
    @ArchivoPdf() archivo: ArchivoPdfRecibido | null,
  ): Promise<MovimientoDetalle> {
    return this.movimientos.create(actor, causaId, body, archivo);
  }

  /** JSON, o un formulario con `datos` y `pdf` (spec 010, plan 010, D2). */
  @Patch(':movimientoId')
  @UseInterceptors(FormularioConPdfInterceptor)
  update(
    @CurrentUser() actor: Usuario,
    @Param('causaId', CausaIdPipe) causaId: number,
    @Param('movimientoId', MovimientoIdPipe) movimientoId: number,
    @Body() body: UpdateMovimientoDto,
    @ArchivoPdf() archivo: ArchivoPdfRecibido | null,
  ): Promise<MovimientoDetalle> {
    return this.movimientos.update(actor, causaId, movimientoId, body, archivo);
  }

  @Post(':movimientoId/anular')
  @HttpCode(HttpStatus.OK)
  annul(
    @CurrentUser() actor: Usuario,
    @Param('causaId', CausaIdPipe) causaId: number,
    @Param('movimientoId', MovimientoIdPipe) movimientoId: number,
  ): Promise<MovimientoDetalle> {
    return this.movimientos.annul(actor, causaId, movimientoId);
  }

  @Post(':movimientoId/restaurar')
  @HttpCode(HttpStatus.OK)
  restore(
    @CurrentUser() actor: Usuario,
    @Param('causaId', CausaIdPipe) causaId: number,
    @Param('movimientoId', MovimientoIdPipe) movimientoId: number,
  ): Promise<MovimientoDetalle> {
    return this.movimientos.restore(actor, causaId, movimientoId);
  }
}
