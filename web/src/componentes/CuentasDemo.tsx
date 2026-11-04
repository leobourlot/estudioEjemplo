import {
  CONTRASENA_DEMO,
  CUENTAS_DEMO,
  type CuentaDemo,
  TEXTOS_CUENTAS_DEMO,
} from '../servicios/cuentas-demo';
import { SECONDARY_BUTTON, SECTION_TITLE } from './estilos-aplicacion';

interface CuentasDemoProps {
  /** Lo que pasa al elegir "Usar esta cuenta": la pantalla completa el formulario. */
  onUse: (cuenta: CuentaDemo) => void;
}

/**
 * El recuadro "Cuentas de prueba" del ingreso en modo demo (spec 009, RF-16 y anexo B): la
 * administradora, el abogado y la cliente de los datos de muestra, cada una con su DNI, la
 * contraseña y el botón "Usar esta cuenta", que se anuncia con el rol y el nombre. Solo muestra y
 * delega: completar el formulario lo hace la pantalla (principio 3).
 */
export function CuentasDemo({ onUse }: CuentasDemoProps) {
  return (
    <section
      aria-labelledby="cuentas-demo-titulo"
      className="mt-6 space-y-2 rounded-lg border border-slate-300 bg-white p-4"
    >
      <h2 id="cuentas-demo-titulo" className={SECTION_TITLE}>
        {TEXTOS_CUENTAS_DEMO.titulo}
      </h2>
      <p className="text-sm text-slate-600">{TEXTOS_CUENTAS_DEMO.texto}</p>
      <ul className="divide-y divide-slate-200">
        {CUENTAS_DEMO.map((cuenta) => (
          <li
            key={cuenta.dni}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
          >
            <div className="text-sm">
              <p className="font-semibold text-estudio-oscuro">
                {cuenta.rol}: {cuenta.nombre}
              </p>
              <p className="text-slate-600">
                {TEXTOS_CUENTAS_DEMO.dni}: {cuenta.dni} · {TEXTOS_CUENTAS_DEMO.contrasena}:{' '}
                {CONTRASENA_DEMO}
              </p>
            </div>
            <button
              type="button"
              aria-label={cuenta.etiqueta}
              onClick={() => onUse(cuenta)}
              className={SECONDARY_BUTTON}
            >
              {TEXTOS_CUENTAS_DEMO.usar}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
