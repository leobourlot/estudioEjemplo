import { describe, expect, it, vi } from 'vitest';
import { pdfForm } from './archivo-pdf';
import type { HttpClient } from './cliente-http';
import { createJurisprudenciaService } from './jurisprudencia';
import { createMovimientosService } from './movimientos';
import { createPortalService } from './portal';

const fakeHttp = () =>
  ({
    get: vi.fn(async () => ({})),
    post: vi.fn(async () => ({})),
    put: vi.fn(async () => ({})),
    patch: vi.fn(async () => ({})),
    sendForm: vi.fn(async () => ({})),
    getFile: vi.fn(async () => ({ blob: new Blob(), nombre: 'x.pdf' })),
  }) as unknown as HttpClient & {
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    sendForm: ReturnType<typeof vi.fn>;
    getFile: ReturnType<typeof vi.fn>;
  };

const PDF = new File(['%PDF-1.4'], 'escrito.pdf', { type: 'application/pdf' });

const DATOS = { fecha: '2024-03-01', tipo: 'resolucion' as const, descripcion: 'Texto.' };

/** Lo que tiene un FormData: `datos` como objeto y `pdf` como archivo. */
const contenidoDe = (form: FormData) => ({
  datos: JSON.parse(form.get('datos') as string) as unknown,
  pdf: form.get('pdf'),
  partes: [...form.keys()],
});

/** Spec 010, T27 (RF-10, RF-28 a RF-35). */
describe('servicios con PDF', () => {
  it('pdfForm arma un formulario con `datos` en JSON y `pdf`', () => {
    expect(contenidoDe(pdfForm({ a: 1 }, PDF))).toEqual({
      datos: { a: 1 },
      pdf: PDF,
      partes: ['datos', 'pdf'],
    });
  });

  describe('movimientos', () => {
    it('sin archivo, carga y modifica con JSON como siempre', async () => {
      const http = fakeHttp();
      const service = createMovimientosService(http);

      await service.createMovement(3, { ...DATOS, visible: true });
      await service.updateMovement(3, 8, { visible: true });
      await service.updateMovement(3, 8, { quitarPdf: true });

      expect(http.post).toHaveBeenCalledWith('/panel/causas/3/movimientos', { ...DATOS, visible: true });
      expect(http.patch).toHaveBeenNthCalledWith(1, '/panel/causas/3/movimientos/8', { visible: true });
      expect(http.patch).toHaveBeenNthCalledWith(2, '/panel/causas/3/movimientos/8', { quitarPdf: true });
      expect(http.sendForm).not.toHaveBeenCalled();
    });

    it('con archivo, envía un formulario con `datos` y `pdf`', async () => {
      const http = fakeHttp();
      const service = createMovimientosService(http);

      await service.createMovement(3, { ...DATOS, visible: true }, PDF);
      await service.updateMovement(3, 8, { descripcion: 'Otro.' }, PDF);

      expect(http.sendForm.mock.calls.map(([method, path, form]) => [method, path, contenidoDe(form)])).toEqual([
        ['POST', '/panel/causas/3/movimientos', { datos: { ...DATOS, visible: true }, pdf: PDF, partes: ['datos', 'pdf'] }],
        ['PATCH', '/panel/causas/3/movimientos/8', { datos: { descripcion: 'Otro.' }, pdf: PDF, partes: ['datos', 'pdf'] }],
      ]);
      expect(http.post).not.toHaveBeenCalled();
    });

    it('getPdf pide el archivo del movimiento', async () => {
      const http = fakeHttp();

      await createMovimientosService(http).getPdf(3, 8);

      expect(http.getFile).toHaveBeenCalledWith('/panel/causas/3/movimientos/8/pdf');
    });
  });

  describe('jurisprudencia', () => {
    const FALLO = {
      caratula: 'Pérez c/ Gómez',
      tribunal: 'CNCiv., Sala A',
      fuero: 'civil' as const,
      fecha: '2019-05-12',
      sumario: 'Sumario.',
      palabrasClave: ['daño moral'],
    };

    it('carga y modifica con archivo como formulario, y sin él como JSON', async () => {
      const http = fakeHttp();
      const service = createJurisprudenciaService(http);

      await service.createRuling({ ...FALLO, confirmarRepetido: true }, PDF);
      await service.updateRuling(5, { quitarPdf: true });

      expect(http.sendForm).toHaveBeenCalledTimes(1);
      const [method, path, form] = http.sendForm.mock.calls[0];
      expect([method, path]).toEqual(['POST', '/panel/jurisprudencia']);
      expect(contenidoDe(form).datos).toEqual({ ...FALLO, confirmarRepetido: true });
      expect(http.patch).toHaveBeenCalledWith('/panel/jurisprudencia/5', { quitarPdf: true });
    });

    it('getPdf pide el archivo del fallo', async () => {
      const http = fakeHttp();

      await createJurisprudenciaService(http).getPdf(5);

      expect(http.getFile).toHaveBeenCalledWith('/panel/jurisprudencia/5/pdf');
    });
  });

  describe('portal', () => {
    it('getPdf pide el archivo por la causa y el movimiento, con los ids codificados', async () => {
      const http = fakeHttp();

      await createPortalService(http).getPdf('3', 'a/b');

      expect(http.getFile).toHaveBeenCalledWith('/portal/causas/3/movimientos/a%2Fb/pdf');
    });
  });
});
