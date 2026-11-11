import { createHash } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Body, Controller, HttpCode, Post, UseInterceptors } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { IsString } from 'class-validator';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Public } from '../src/autenticacion/decoradores.js';
import { ArchivoPdf, type ArchivoPdfRecibido } from '../src/pdfs/archivo-pdf.decorator.js';
import { FormularioConPdfInterceptor } from '../src/pdfs/formulario-con-pdf.interceptor.js';
import { createTestApp } from './utilidades/aplicacion-de-tests.js';
import { bufferOfSize, minimalPdf } from './utilidades/pdfs-de-prueba.js';

class DatosDePrueba {
  @IsString()
  nombre: string;
}

let llamadas = 0;

const sha256 = (contenido: Buffer) => createHash('sha256').update(contenido).digest('hex');

/** Una ruta solo para el test, con el interceptor del formulario (plan 010, D3). */
@Public()
@Controller('prueba-pdf')
class FormularioDePruebaController {
  @Post()
  @HttpCode(200)
  @UseInterceptors(FormularioConPdfInterceptor)
  recibir(@Body() datos: DatosDePrueba, @ArchivoPdf() archivo: ArchivoPdfRecibido | null) {
    llamadas++;
    return {
      datos,
      tamano: archivo?.contenido.length ?? null,
      sha: archivo ? sha256(archivo.contenido) : null,
    };
  }
}

const RUTA = '/api/prueba-pdf';
const DATOS = JSON.stringify({ nombre: 'Ana' });

/** Plan 010, D3 (spec 010, RF-2, RF-4, RF-10). */
describe('Formulario con PDF', () => {
  let app: NestExpressApplication;
  let port: number;

  beforeAll(async () => {
    app = await createTestApp({ extraControllers: [FormularioDePruebaController] });
    await app.listen(0);
    port = (app.getHttpServer().address() as AddressInfo).port;
  });

  beforeEach(() => {
    llamadas = 0;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('un pedido JSON llega igual que siempre, sin archivo', async () => {
    const response = await request(app.getHttpServer()).post(RUTA).send({ nombre: 'Ana' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ datos: { nombre: 'Ana' }, tamano: null, sha: null });
  });

  it('un formulario con datos y pdf llega validado y con el contenido idéntico', async () => {
    const pdf = minimalPdf('Contenido de prueba');

    const response = await request(app.getHttpServer())
      .post(RUTA)
      .field('datos', DATOS)
      .attach('pdf', pdf, 'escrito.pdf');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ datos: { nombre: 'Ana' }, tamano: pdf.length, sha: sha256(pdf) });
  });

  it('un formulario con datos y sin archivo llega con el archivo en null', async () => {
    const response = await request(app.getHttpServer()).post(RUTA).field('datos', DATOS);

    expect(response.status).toBe(200);
    expect(response.body.tamano).toBeNull();
  });

  it('los datos pasan por el ValidationPipe global: un campo desconocido se rechaza', async () => {
    const response = await request(app.getHttpServer())
      .post(RUTA)
      .field('datos', JSON.stringify({ nombre: 'Ana', otro: 1 }))
      .attach('pdf', minimalPdf(), 'escrito.pdf');

    expect(response.status).toBe(400);
    expect(llamadas).toBe(0);
  });

  it.each([
    ['sin datos', (r: request.Test) => r.attach('pdf', minimalPdf(), 'escrito.pdf')],
    ['con un JSON inválido', (r: request.Test) => r.field('datos', '{nombre')],
    ['con datos que no son un objeto', (r: request.Test) => r.field('datos', '[1, 2]')],
    ['con una parte de datos de más', (r: request.Test) => r.field('datos', DATOS).field('otro', 'x')],
    [
      'con un archivo en otra parte',
      (r: request.Test) => r.field('datos', DATOS).attach('archivo', minimalPdf(), 'escrito.pdf'),
    ],
  ])('un formulario %s responde 400 "Los datos del formulario no son válidos"', async (_caso, armar) => {
    const response = await armar(request(app.getHttpServer()).post(RUTA));

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Los datos del formulario no son válidos');
    expect(llamadas).toBe(0);
  });

  it('un Content-Length de más de 5 MB más el margen responde 413 sin leer el cuerpo', async () => {
    const respuesta = await new Promise<{ status: number; connection?: string; body: string }>(
      (resolve, reject) => {
        const pedido = httpRequest(
          {
            port,
            method: 'POST',
            path: RUTA,
            headers: {
              'Content-Type': 'multipart/form-data; boundary=limite',
              'Content-Length': String(6 * 1024 * 1024),
            },
          },
          (response) => {
            let body = '';
            response.on('data', (chunk: Buffer) => (body += chunk.toString()));
            response.on('end', () =>
              resolve({ status: response.statusCode ?? 0, connection: response.headers.connection, body }),
            );
          },
        );
        pedido.on('error', reject);
        // Solo el comienzo del cuerpo: si el servidor esperara el resto, el test vencería.
        pedido.write('--limite\r\n');
      },
    );

    expect(respuesta.status).toBe(413);
    expect(respuesta.connection).toBe('close');
    expect(JSON.parse(respuesta.body).message).toBe('El archivo no puede superar los 5 MB');
    expect(llamadas).toBe(0);
  });

  describe('errores del archivo y registros (T9, RF-4, RF-8)', () => {
    const LIMITE = 'limite-de-prueba';

    /** Un formulario multipart armado a mano, para enviarlo por partes, sin Content-Length. */
    const multipart = (pdf: Buffer, nombre = 'escrito.pdf', tipo = 'application/pdf') =>
      Buffer.concat([
        Buffer.from(
          `--${LIMITE}\r\nContent-Disposition: form-data; name="datos"\r\n\r\n${DATOS}\r\n` +
            `--${LIMITE}\r\nContent-Disposition: form-data; name="pdf"; filename="${nombre}"\r\n` +
            `Content-Type: ${tipo}\r\n\r\n`,
          'latin1',
        ),
        pdf,
        Buffer.from(`\r\n--${LIMITE}--\r\n`, 'latin1'),
      ]);

    /** Envía el cuerpo por partes (Transfer-Encoding: chunked) y espera la respuesta. */
    const sendChunked = (cuerpo: Buffer) =>
      new Promise<{ status: number; body: string }>((resolve, reject) => {
        let respondido = false;
        const pedido = httpRequest(
          {
            port,
            method: 'POST',
            path: RUTA,
            headers: { 'Content-Type': `multipart/form-data; boundary=${LIMITE}` },
          },
          (response) => {
            respondido = true;
            let body = '';
            response.on('data', (chunk: Buffer) => (body += chunk.toString()));
            response.on('end', () => resolve({ status: response.statusCode ?? 0, body }));
          },
        );
        // Si el servidor ya respondió, que corte la conexión mientras se escribe no es un error.
        pedido.on('error', (error) => {
          if (!respondido) reject(error);
        });
        for (let inicio = 0; inicio < cuerpo.length; inicio += 65_536) {
          pedido.write(cuerpo.subarray(inicio, inicio + 65_536));
        }
        pedido.end();
      });

    /** Lo que se escribe en stdout y stderr mientras corre `accion`. */
    async function capturarSalida(accion: () => Promise<unknown>): Promise<string> {
      let salida = '';
      const capturar = (chunk: unknown) => {
        salida += String(chunk);
        return true;
      };
      const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(capturar);
      const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(capturar);
      try {
        await accion();
      } finally {
        stdout.mockRestore();
        stderr.mockRestore();
      }
      return salida;
    }

    it('un archivo de 5.242.881 bytes enviado por partes responde 413 con el mensaje de la spec', async () => {
      const respuesta = await sendChunked(multipart(bufferOfSize(5_242_881)));

      expect(respuesta.status).toBe(413);
      expect(JSON.parse(respuesta.body).message).toBe('El archivo no puede superar los 5 MB');
      expect(llamadas).toBe(0);
    });

    it('uno de 5.242.880 bytes enviado por partes llega completo', async () => {
      const pdf = bufferOfSize(5_242_880);

      const respuesta = await sendChunked(multipart(pdf));

      expect(respuesta.status).toBe(200);
      expect(JSON.parse(respuesta.body).sha).toBe(sha256(pdf));
    });

    it('dos archivos responden 400 "Podés adjuntar un solo PDF"', async () => {
      const response = await request(app.getHttpServer())
        .post(RUTA)
        .field('datos', DATOS)
        .attach('pdf', minimalPdf(), 'uno.pdf')
        .attach('pdf', minimalPdf(), 'dos.pdf');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Podés adjuntar un solo PDF');
      expect(llamadas).toBe(0);
    });

    const NOMBRE = 'escrito <final> {v2}.pdf';
    const TIPO = 'text/html';
    const conNombre = (r: request.Test) => r.attach('pdf', minimalPdf(), { filename: NOMBRE, contentType: TIPO });

    it.each([
      ['con éxito', (r: request.Test) => conNombre(r.field('datos', DATOS))],
      ['con datos inválidos', (r: request.Test) => conNombre(r.field('datos', '{nombre'))],
      ['con un campo desconocido', (r: request.Test) => conNombre(r.field('datos', '{"x":1}'))],
      [
        'con dos archivos',
        (r: request.Test) =>
          conNombre(r.field('datos', DATOS)).attach('pdf', minimalPdf(), {
            filename: NOMBRE,
            contentType: TIPO,
          }),
      ],
    ])('el nombre y el tipo del archivo no aparecen en la respuesta ni en los registros: %s', async (_caso, armar) => {
      let texto = '';
      const salida = await capturarSalida(async () => {
        const response = await armar(request(app.getHttpServer()).post(RUTA));
        texto = response.text;
      });

      for (const dato of ['<final>', '{v2}', TIPO]) {
        expect(texto).not.toContain(dato);
        expect(salida).not.toContain(dato);
      }
    });

    it('un archivo demasiado grande con ese nombre tampoco los deja en los registros', async () => {
      let texto = '';
      const salida = await capturarSalida(async () => {
        texto = (await sendChunked(multipart(bufferOfSize(5_242_881), NOMBRE, TIPO))).body;
      });

      for (const dato of ['<final>', '{v2}', TIPO]) {
        expect(texto).not.toContain(dato);
        expect(salida).not.toContain(dato);
      }
    });
  });

  it('acepta un PDF de exactamente 5 MB', async () => {
    const pdf = bufferOfSize(5_242_880);

    const response = await request(app.getHttpServer())
      .post(RUTA)
      .field('datos', DATOS)
      .attach('pdf', pdf, 'escrito.pdf');

    expect(response.status).toBe(200);
    expect(response.body.sha).toBe(sha256(pdf));
  });
});
