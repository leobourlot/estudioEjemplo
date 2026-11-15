import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, type EntityManager, In } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity.js';
import {
  exceedsPdfSpace,
  MAX_STAFF_BASICO,
  type Plan,
  PLAN_MESSAGES,
  selectOutsidePlan,
} from './reglas-plan.js';

/** Token del plan y el espacio de la publicación (plan 011, "Configuración, demo y tests"). */
export const PLAN_SETTINGS = Symbol('PLAN_SETTINGS');

/** El plan y el espacio para PDF, tomados del entorno (spec 011, RF-1, RF-27). */
export interface PlanSettings {
  plan: Plan;
  espacioPdfBytes: number;
}

/** Roles de los integrantes del estudio (spec 011, RF-17). */
export const STAFF_ROLES = ['admin', 'abogado'] as const;

/** Respuesta de GET /api/panel/plan (plan 011, contrato de la api). */
export type PlanResumen =
  | {
      plan: 'basico';
      integrantes: { habilitados: number; maximo: number };
      espacioPdf: null;
    }
  | {
      plan: 'premium';
      integrantes: null;
      espacioPdf: { usadoBytes: number; totalBytes: number };
    };

/**
 * El plan vigente de la publicación (spec 011). Todo lo que depende del plan lo pregunta acá, así
 * los tests pueden cambiarlo reemplazando PLAN_SETTINGS.
 */
@Injectable()
export class PlanService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PlanService.name);
  private applied = false;
  private applying: Promise<void> | null = null;

  constructor(
    @Inject(PLAN_SETTINGS) private readonly settings: PlanSettings,
    private readonly dataSource: DataSource,
  ) {}

  get plan(): Plan {
    return this.settings.plan;
  }

  get isPremium(): boolean {
    return this.settings.plan === 'premium';
  }

  /** Espacio total para PDF, en bytes (RF-27). Solo tiene sentido con el plan Premium. */
  get pdfSpaceBytes(): number {
    return this.settings.espacioPdfBytes;
  }

  /**
   * El plan para el inicio del panel y la gestión de cuentas (spec 011, RF-19, RF-29, RF-31): con
   * el plan Básico, los integrantes habilitados; con el Premium, el espacio para PDF usado.
   */
  async summary(): Promise<PlanResumen> {
    const manager = this.dataSource.manager;
    if (!this.isPremium) {
      const habilitados = (await this.findEnabledStaff(manager)).length;
      return {
        plan: 'basico',
        integrantes: { habilitados, maximo: MAX_STAFF_BASICO },
        espacioPdf: null,
      };
    }
    return {
      plan: 'premium',
      integrantes: null,
      espacioPdf: { usadoBytes: await this.usedPdfBytes(manager), totalBytes: this.pdfSpaceBytes },
    };
  }

  /**
   * Aplica el plan a las cuentas al arrancar (plan 011, D5). Si falla, no frena el arranque: la
   * api queda viva para correr la migración, y el ingreso responde T-17 hasta que se complete.
   */
  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.ensureApplied();
    } catch {
      // Ya quedó registrado; se reintenta en el siguiente pedido que lo necesite.
    }
  }

  /**
   * Hace el ajuste de las cuentas una sola vez por proceso (spec 011, RF-20, RF-25). Si hay uno en
   * curso, lo espera. Si falla, lo registra sin datos de cuentas y deja que el siguiente pedido lo
   * reintente.
   */
  ensureApplied(): Promise<void> {
    if (this.applied) return Promise.resolve();
    this.applying ??= this.applyToAccounts().then(
      () => {
        this.applied = true;
      },
      (error: unknown) => {
        this.applying = null;
        const reason = error instanceof Error ? error.message : 'error desconocido';
        this.logger.error(`No se pudo aplicar el plan a las cuentas: ${reason}`);
        throw error;
      },
    );
    return this.applying;
  }

  /**
   * Para el ingreso, la renovación y las rutas con sesión (plan 011, D5): si el ajuste de las
   * cuentas no se pudo completar, 503 T-17, así nadie entra fuera del plan.
   */
  async assertApplied(): Promise<void> {
    try {
      await this.ensureApplied();
    } catch {
      throw new ServiceUnavailableException(PLAN_MESSAGES.updating);
    }
  }

  /**
   * Bloquea la fila del administrador principal, que hace de cerrojo de las operaciones que
   * cuentan integrantes (plan 011, D7). Así dos operaciones simultáneas cuentan de a una.
   */
  async lockStaff(manager: EntityManager): Promise<void> {
    await manager
      .getRepository(Usuario)
      .createQueryBuilder('usuario')
      .select('usuario.id')
      .where('usuario.esPrincipal = :principal', { principal: true })
      .setLock('pessimistic_write')
      .getOne();
  }

  /**
   * Antes de crear, reactivar o habilitar un integrante (spec 011, RF-18; plan 011, D7), dentro
   * de la transacción de esa operación: con el plan Básico y 2 habilitados, 409 T-5. Bloquea
   * primero la fila del principal, así dos operaciones simultáneas cuentan de a una; tiene que
   * ser la primera lectura de la transacción, para que el conteo vea lo que guardó la otra.
   */
  async assertStaffSlot(manager: EntityManager): Promise<void> {
    if (this.isPremium) return;
    await this.lockStaff(manager);
    const enabled = await manager.getRepository(Usuario).count({
      where: { rol: In([...STAFF_ROLES]), activo: true, fueraDelPlan: false },
    });
    if (enabled >= MAX_STAFF_BASICO) throw new ConflictException(PLAN_MESSAGES.staffLimit);
  }

  /**
   * El espacio usado por los PDF, en bytes (spec 011, RF-27): la suma de los tamaños registrados,
   * sin leer el contenido. Con `lock`, bloquea las filas y el hueco del final, para el alta.
   */
  async usedPdfBytes(manager: EntityManager, lock = false): Promise<number> {
    const rows: { usado: string | number }[] = await manager.query(
      `SELECT COALESCE(SUM(tamano), 0) AS usado FROM pdfs${lock ? ' FOR UPDATE' : ''}`,
    );
    return Number(rows[0]?.usado ?? 0);
  }

  /**
   * Antes de guardar un PDF, dentro de su transacción (spec 011, RF-28; plan 011, D7): si no
   * entra, 409 T-9. En REPEATABLE READ, la suma con FOR UPDATE hace esperar a una segunda subida
   * simultánea, que después cuenta la primera. En un reemplazo, el anterior ya se borró.
   */
  async assertPdfSpace(manager: EntityManager, tamano: number): Promise<void> {
    const usado = await this.usedPdfBytes(manager, true);
    if (exceedsPdfSpace(usado, tamano, this.pdfSpaceBytes)) {
      throw new ConflictException(PLAN_MESSAGES.pdfSpaceFull(this.pdfSpaceBytes));
    }
  }

  /** Integrantes habilitados (RF-17): activos, sin la marca, con o sin cambio pendiente. */
  findEnabledStaff(manager: EntityManager): Promise<Usuario[]> {
    return manager.getRepository(Usuario).find({
      select: { id: true, esPrincipal: true, creadoEn: true },
      where: { rol: In([...STAFF_ROLES]), activo: true, fueraDelPlan: false },
    });
  }

  private applyToAccounts(): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const usuarios = manager.getRepository(Usuario);
      if (this.isPremium) {
        // RF-25: todos los integrantes activos vuelven a poder ingresar.
        await usuarios.update({ fueraDelPlan: true }, { fueraDelPlan: false });
        return;
      }
      // RF-20: se conservan el principal y el de cuenta más antigua; nadie más cambia.
      await this.lockStaff(manager);
      const outside = selectOutsidePlan(await this.findEnabledStaff(manager));
      if (outside.length > 0) {
        await usuarios.update({ id: In(outside) }, { fueraDelPlan: true });
      }
    });
  }
}
