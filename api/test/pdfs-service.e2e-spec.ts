import { ConflictException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import type { Environment } from '../src/configuracion/validar-entorno.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Pdf } from '../src/pdfs/pdf.entity.js';
import { PdfsService } from '../src/pdfs/pdfs.service.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { clearPdfTables, minimalPdf, signedPdf } from './utilidades/pdfs-de-prueba.js';

/** Una configuración con solo MODO_DEMO, para construir el service a mano. */
const configCon = (modoDemo: boolean) =>
  ({ get: () => modoDemo }) as unknown as ConfigService<Environment, true>;

/** Un PdfsService con el azar del código bajo control del test. */
class PdfsServiceConAzar extends PdfsService {
  valores: number[] = [];
  protected override random = (max: number) => {
    const valor = this.valores.shift();
    if (valor === undefined) throw new Error('El test no dio más valores al azar');
    return valor % max;
  };
}

/** Los 6 valores que arman `codigo` con el alfabeto de reglas-pdf.ts. */
const valoresDe = (codigo: string) =>
  [...codigo].map((letra) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.indexOf(letra));

/** Plan 010, "PdfsService" (spec 010, RF-5, RF-6, RF-9, RF-14). */
describe('PdfsService', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let service: PdfsService;
  let actor: Usuario;

  const create = (contenido: Buffer, servicio: PdfsService = service) =>
    dataSource.transaction((manager) => servicio.create(manager, contenido, actor));

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
    service = app.get(PdfsService);
    actor = await createTestUser(app);
  });

  beforeEach(async () => {
    await clearPdfTables(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('guarda el contenido sin cambios, con su tamaño, su autor y su fecha', async () => {
    const contenido = signedPdf();
    const antes = Date.now();

    const pdf = await create(contenido);

    expect(pdf).toMatchObject({ tamano: contenido.length, subidoPorId: actor.id });
    expect(pdf.codigo).toMatch(/^[A-Z0-9]{6}$/);
    expect(pdf.subidoEn.getTime()).toBeGreaterThanOrEqual(antes - 1_000);
    expect(pdf).not.toHaveProperty('contenido');
    const leido = await service.findContent(pdf.id);
    expect(Buffer.compare(leido!.contenido, contenido)).toBe(0);
  });

  it('un find común no trae el contenido (plan 010, D1)', async () => {
    const pdf = await create(minimalPdf());

    const fila = await dataSource.getRepository(Pdf).findOneByOrFail({ id: pdf.id });
    expect(fila.contenido).toBeUndefined();
    expect(fila.codigo).toBe(pdf.codigo);
  });

  it('findContent devuelve null si el PDF no existe', async () => {
    expect(await service.findContent(999_999)).toBeNull();
  });

  it('si el código choca con uno guardado, genera otro (RF-6)', async () => {
    const conAzar = new PdfsServiceConAzar(dataSource, configCon(false));
    conAzar.valores = valoresDe('AAAAAA');
    await create(minimalPdf(), conAzar);

    conAzar.valores = [...valoresDe('AAAAAA'), ...valoresDe('BBBBBB')];
    const segundo = await create(minimalPdf(), conAzar);

    expect(segundo.codigo).toBe('BBBBBB');
  });

  it('después de 5 choques, falla sin guardar nada', async () => {
    const conAzar = new PdfsServiceConAzar(dataSource, configCon(false));
    conAzar.valores = valoresDe('CCCCCC');
    await create(minimalPdf(), conAzar);

    conAzar.valores = Array.from({ length: 5 }, () => valoresDe('CCCCCC')).flat();
    await expect(create(minimalPdf(), conAzar)).rejects.toThrow();
    expect(await dataSource.getRepository(Pdf).count()).toBe(1);
  });

  describe('tope de la demo (RF-41)', () => {
    const conModoDemo = (modoDemo: boolean) => new PdfsService(dataSource, configCon(modoDemo));

    const guardarVarios = async (cantidad: number) => {
      for (let i = 0; i < cantidad; i++) await create(minimalPdf());
    };

    it('con el modo demo y 4 PDF, rechaza el quinto con 409', async () => {
      await guardarVarios(4);

      const error = await create(minimalPdf(), conModoDemo(true)).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).message).toBe(
        'En la demo se pueden tener hasta 4 PDF. Quitá uno para subir otro',
      );
      expect(await dataSource.getRepository(Pdf).count()).toBe(4);
    });

    it('con el modo demo y 3 PDF, dos subidas a la vez dejan 4', async () => {
      await guardarVarios(3);
      const demo = conModoDemo(true);

      const resultados = await Promise.allSettled([
        create(minimalPdf(), demo),
        create(minimalPdf(), demo),
      ]);

      expect(resultados.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
      const rechazo = resultados.find((r) => r.status === 'rejected');
      expect(rechazo?.reason).toBeInstanceOf(ConflictException);
      expect(await dataSource.getRepository(Pdf).count()).toBe(4);
    });

    it('con el modo demo apagado, no hay tope', async () => {
      await guardarVarios(4);

      await create(minimalPdf(), conModoDemo(false));

      expect(await dataSource.getRepository(Pdf).count()).toBe(5);
    });
  });

  it('remove borra la fila (RF-14)', async () => {
    const pdf = await create(minimalPdf());

    await dataSource.transaction((manager) => service.remove(manager, pdf.id));

    expect(await dataSource.getRepository(Pdf).countBy({ id: pdf.id })).toBe(0);
  });
});
