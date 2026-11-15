import { type CallHandler, type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import type { PlanService } from '../plan/plan.service.js';
import { PLAN_MESSAGES } from '../plan/reglas-plan.js';
import { FormularioConPdfInterceptor } from './formulario-con-pdf.interceptor.js';

function contextFor(multipart: boolean, body: object = {}) {
  const setHeader = vi.fn();
  const request = {
    body,
    headers: { 'content-length': '100' },
    is: (type: string) => (multipart && type === 'multipart/form-data' ? type : false),
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => ({ setHeader }) }),
  } as unknown as ExecutionContext;
  return { context, setHeader };
}

const interceptorFor = (isPremium: boolean) =>
  new FormularioConPdfInterceptor({ isPremium } as PlanService);

/** Spec 011, RF-11 (plan 011, D8): el formulario con PDF con el plan Básico. */
describe('FormularioConPdfInterceptor con el plan Básico', () => {
  it('un multipart responde 403 T-4 sin leer el cuerpo ni llegar al handler, y cierra la conexión', async () => {
    const { context, setHeader } = contextFor(true);
    const handle = vi.fn(() => of(null));

    const result = interceptorFor(false).intercept(context, { handle } as CallHandler);

    await expect(result).rejects.toThrow(ForbiddenException);
    await expect(result).rejects.toThrow(PLAN_MESSAGES.featureNotIncluded);
    expect(handle).not.toHaveBeenCalled();
    expect(setHeader).toHaveBeenCalledWith('Connection', 'close');
  });

  it('un JSON con quitarPdf responde 403 T-4', async () => {
    const { context } = contextFor(false, { quitarPdf: true });
    const handle = vi.fn(() => of(null));

    await expect(
      interceptorFor(false).intercept(context, { handle } as CallHandler),
    ).rejects.toThrow(PLAN_MESSAGES.featureNotIncluded);
    expect(handle).not.toHaveBeenCalled();
  });

  it('un JSON sin quitarPdf pasa', async () => {
    const { context } = contextFor(false, { descripcion: 'Escrito' });
    const handle = vi.fn(() => of(null));

    await interceptorFor(false).intercept(context, { handle } as CallHandler);

    expect(handle).toHaveBeenCalled();
  });

  it('con el plan Premium, un JSON con quitarPdf pasa', async () => {
    const { context } = contextFor(false, { quitarPdf: true });
    const handle = vi.fn(() => of(null));

    await interceptorFor(true).intercept(context, { handle } as CallHandler);

    expect(handle).toHaveBeenCalled();
  });
});
