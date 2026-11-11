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
import { CreateFalloDto } from './dto/crear-fallo.dto.js';
import { ListFallosQueryDto } from './dto/listar-fallos.dto.js';
import { UpdateFalloDto } from './dto/modificar-fallo.dto.js';
import { ReactivateFalloDto } from './dto/reactivar-fallo.dto.js';
import { SuggestionsQueryDto } from './dto/sugerencias.dto.js';
import type { FalloDetalle, PalabraClaveSugerencia } from './fallo-detalle.js';
import {
  type FalloPage,
  JURISPRUDENCIA_MESSAGES,
  JurisprudenciaService,
} from './jurisprudencia.service.js';
import { PalabrasClaveService } from './palabras-clave.service.js';

/** Un id que no es un número no puede ser un fallo existente: 404, como cualquier otro (RF-33). */
const FalloIdPipe = new ParseIntPipe({
  exceptionFactory: () => new NotFoundException(JURISPRUDENCIA_MESSAGES.notFound),
});

/** En la descarga del PDF, un id no numérico responde el 404 único (spec 010, RF-37). */
const PdfIdPipe = new ParseIntPipe({
  exceptionFactory: () => new NotFoundException(PDF_MESSAGES.notFound),
});

/**
 * Jurisprudencia del estudio (plan 005). Solo administradores y abogados: los guards
 * globales de la spec 001 rechazan a clientes (403), a visitantes (401) y a cuentas con
 * cambio de contraseña pendiente (403) antes de llegar acá (RF-34).
 */
@Roles('admin', 'abogado')
@Controller('panel/jurisprudencia')
export class JurisprudenciaController {
  constructor(
    private readonly jurisprudencia: JurisprudenciaService,
    private readonly palabrasClave: PalabrasClaveService,
  ) {}

  @Get()
  list(@Query() query: ListFallosQueryDto): Promise<FalloPage> {
    return this.jurisprudencia.list(query);
  }

  // Va antes de GET /:id, para que "palabras-clave" no se tome como un id.
  @Get('palabras-clave')
  suggestKeywords(@Query() query: SuggestionsQueryDto): Promise<PalabraClaveSugerencia[]> {
    return this.palabrasClave.suggest(query.buscar, query.para ?? 'carga');
  }

  /**
   * El PDF del fallo, como descarga (spec 010, RF-28; plan 010, "Entrega del PDF"). Un id no
   * numérico responde el mismo 404 que cualquier otro caso (RF-37).
   */
  @Get(':id/pdf')
  async downloadPdf(
    @Param('id', PdfIdPipe) id: number,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { contenido, nombre } = await this.jurisprudencia.getPdf(id);
    return toPdfResponse(response, contenido, nombre);
  }

  @Get(':id')
  findOne(@Param('id', FalloIdPipe) id: number): Promise<FalloDetalle> {
    return this.jurisprudencia.findOne(id);
  }

  /** JSON, o un formulario con `datos` y `pdf` (spec 010, plan 010, D2). */
  @Post()
  @UseInterceptors(FormularioConPdfInterceptor)
  create(
    @CurrentUser() actor: Usuario,
    @Body() body: CreateFalloDto,
    @ArchivoPdf() archivo: ArchivoPdfRecibido | null,
  ): Promise<FalloDetalle> {
    return this.jurisprudencia.create(actor, body, archivo);
  }

  /** JSON, o un formulario con `datos` y `pdf` (spec 010, plan 010, D2). */
  @Patch(':id')
  @UseInterceptors(FormularioConPdfInterceptor)
  update(
    @CurrentUser() actor: Usuario,
    @Param('id', FalloIdPipe) id: number,
    @Body() body: UpdateFalloDto,
    @ArchivoPdf() archivo: ArchivoPdfRecibido | null,
  ): Promise<FalloDetalle> {
    return this.jurisprudencia.update(actor, id, body, archivo);
  }

  @Post(':id/desactivar')
  @HttpCode(HttpStatus.OK)
  deactivate(
    @CurrentUser() actor: Usuario,
    @Param('id', FalloIdPipe) id: number,
  ): Promise<FalloDetalle> {
    return this.jurisprudencia.deactivate(actor, id);
  }

  @Post(':id/reactivar')
  @HttpCode(HttpStatus.OK)
  reactivate(
    @CurrentUser() actor: Usuario,
    @Param('id', FalloIdPipe) id: number,
    @Body() body: ReactivateFalloDto,
  ): Promise<FalloDetalle> {
    return this.jurisprudencia.reactivate(actor, id, body.confirmarRepetido === true);
  }
}
