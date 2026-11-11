import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { formatValidationErrors } from '../../configuracion/errores-de-validacion.js';
import { PDF_MESSAGES } from '../../pdfs/reglas-pdf.js';
import { CreateMovimientoDto } from './crear-movimiento.dto.js';
import { UpdateMovimientoDto } from './modificar-movimiento.dto.js';
import { MOVIMIENTO_MESSAGES } from './reglas-movimiento.js';

type DtoClass<T> = new () => T;

/** Transforma y valida igual que el ValidationPipe global (whitelist + forbidNonWhitelisted). */
async function check<T extends object>(dto: DtoClass<T>, plain: object) {
  const instance = plainToInstance(dto, plain);
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
  return { instance, messages: formatValidationErrors(errors) };
}

const MINIMAL = { fecha: '2024-03-01', tipo: 'providencia', descripcion: 'Se fija audiencia.' };

/** Spec 010, RF-15 y RF-16: los campos del PDF en los DTO de movimientos. */
describe('DTO de movimientos con PDF', () => {
  it.each([true, false])('la carga acepta pdfVisible %s', async (pdfVisible) => {
    const { instance, messages } = await check(CreateMovimientoDto, { ...MINIMAL, pdfVisible });

    expect(messages).toEqual([]);
    expect(instance.pdfVisible).toBe(pdfVisible);
  });

  it.each([true, false])('la modificación acepta pdfVisible %s', async (pdfVisible) => {
    expect((await check(UpdateMovimientoDto, { pdfVisible })).messages).toEqual([]);
  });

  it('la modificación acepta quitarPdf: true', async () => {
    const { instance, messages } = await check(UpdateMovimientoDto, { quitarPdf: true });

    expect(messages).toEqual([]);
    expect(instance.quitarPdf).toBe(true);
  });

  it.each([
    ['como texto', 'si'],
    ['como número', 1],
    ['null', null],
  ])('rechaza pdfVisible %s', async (_caso, pdfVisible) => {
    expect((await check(CreateMovimientoDto, { ...MINIMAL, pdfVisible })).messages).toEqual([
      MOVIMIENTO_MESSAGES.pdfVisible,
    ]);
    expect((await check(UpdateMovimientoDto, { pdfVisible })).messages).toEqual([
      MOVIMIENTO_MESSAGES.pdfVisible,
    ]);
  });

  it.each([
    ['false', false],
    ['como texto', 'true'],
    ['null', null],
  ])('rechaza quitarPdf %s', async (_caso, quitarPdf) => {
    expect((await check(UpdateMovimientoDto, { quitarPdf })).messages).toEqual([
      PDF_MESSAGES.quitarPdf,
    ]);
  });

  it('la carga no acepta quitarPdf: no hay PDF que quitar', async () => {
    expect((await check(CreateMovimientoDto, { ...MINIMAL, quitarPdf: true })).messages).toEqual([
      'El campo quitarPdf no está permitido',
    ]);
  });

  it('se siguen rechazando la causa, la anulación, el id del PDF y otros campos', async () => {
    for (const campo of ['causaId', 'anulado', 'pdfId', 'pdf', 'otro']) {
      expect((await check(UpdateMovimientoDto, { [campo]: 1 })).messages).toEqual([
        `El campo ${campo} no está permitido`,
      ]);
    }
  });

  it('ningún mensaje repite el valor recibido (RNF de registros)', async () => {
    const mark = 'MARCA-QUE-NO-SE-REPITE';
    const { messages } = await check(UpdateMovimientoDto, { pdfVisible: mark, quitarPdf: mark });

    expect(messages).toHaveLength(2);
    for (const message of messages) expect(message).not.toContain(mark);
  });
});
