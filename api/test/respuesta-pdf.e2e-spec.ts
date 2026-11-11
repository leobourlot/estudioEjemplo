import { Controller, Get, Res, type StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Public } from '../src/autenticacion/decoradores.js';
import type { Environment } from '../src/configuracion/validar-entorno.js';
import { toPdfResponse } from '../src/pdfs/respuesta-pdf.js';
import { createTestApp } from './utilidades/aplicacion-de-tests.js';
import { signedPdf } from './utilidades/pdfs-de-prueba.js';

const NOMBRE = '2026-10-24 Resolucion K7Q2MX.pdf';

/** Una ruta solo para el test, que entrega un PDF con toPdfResponse. */
@Public()
@Controller('prueba-respuesta-pdf')
class RespuestaDePruebaController {
  @Get()
  entregar(@Res({ passthrough: true }) response: Response): StreamableFile {
    return toPdfResponse(response, signedPdf(), NOMBRE);
  }
}

/** Plan 010, "Entrega del PDF" (spec 010, RF-5, RF-7, RF-36, RNF de seguridad y de copias). */
describe('Entrega del PDF', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp({ extraControllers: [RespuestaDePruebaController] });
  });

  afterAll(async () => {
    await app?.close();
  });

  // responseType('blob'): en Node, el cuerpo llega como Buffer, sin interpretarlo.
  const pedir = () =>
    request(app.getHttpServer()).get('/api/prueba-respuesta-pdf').responseType('blob');

  it('entrega el PDF idéntico al guardado (RF-5)', async () => {
    const response = await pedir();

    expect(response.status).toBe(200);
    expect(Buffer.compare(response.body as Buffer, signedPdf())).toBe(0);
    expect(response.headers['content-length']).toBe(String(signedPdf().length));
  });

  it('lo entrega como descarga con su nombre, y el navegador no adivina otro tipo (plan 010, D4)', async () => {
    const { headers } = await pedir();

    expect(headers['content-type']).toBe('application/pdf');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['content-disposition']).toBe(`attachment; filename="${NOMBRE}"`);
  });

  it('nadie guarda copia: ni el navegador ni un intermediario (RF-36)', async () => {
    const { headers } = await pedir();

    expect(headers['cache-control']).toBe('no-store, private');
  });

  it('si se abriera a mano, no puede ejecutar nada ni cargarse desde otro sitio', async () => {
    const { headers } = await pedir();

    expect(headers['content-security-policy']).toBe("default-src 'none'; sandbox");
    expect(headers['cross-origin-resource-policy']).toBe('same-site');
  });

  it('CORS deja leer el nombre a la web (plan 010, D5)', async () => {
    const config = app.get<ConfigService<Environment, true>>(ConfigService);
    const origen = config.get('FRONTEND_ORIGINS', { infer: true })[0];

    const { headers } = await pedir().set('Origin', origen);

    expect(headers['access-control-allow-origin']).toBe(origen);
    expect(headers['access-control-expose-headers']).toBe('Content-Disposition');
  });
});
