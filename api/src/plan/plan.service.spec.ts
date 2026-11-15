import { Logger } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlanService } from './plan.service.js';

function serviceWith(transaction: ReturnType<typeof vi.fn>): PlanService {
  const dataSource = { transaction } as unknown as DataSource;
  return new PlanService({ plan: 'basico', espacioPdfBytes: 1 }, dataSource);
}

/** Plan 011, D5: el ajuste de las cuentas no frena el arranque y se reintenta si falla. */
describe('PlanService.ensureApplied', () => {
  afterEach(() => vi.restoreAllMocks());

  it('si el ajuste falla, el arranque termina igual y lo registra sin datos de cuentas', async () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const service = serviceWith(
      vi.fn().mockRejectedValue(new Error("Unknown column 'fueraDelPlan'")),
    );

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(
      "No se pudo aplicar el plan a las cuentas: Unknown column 'fueraDelPlan'",
    );
  });

  it('la siguiente llamada lo vuelve a intentar, y cuando termina bien no lo repite', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const transaction = vi
      .fn()
      .mockRejectedValueOnce(new Error('sin columna'))
      .mockResolvedValue(undefined);
    const service = serviceWith(transaction);

    await service.onApplicationBootstrap();
    await expect(service.ensureApplied()).resolves.toBeUndefined();
    await service.ensureApplied();

    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it('dos llamadas simultáneas esperan el mismo ajuste', async () => {
    let finish: () => void = () => undefined;
    const transaction = vi.fn().mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const service = serviceWith(transaction);

    const first = service.ensureApplied();
    const second = service.ensureApplied();
    finish();
    await Promise.all([first, second]);

    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
