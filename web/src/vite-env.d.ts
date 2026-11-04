/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API, sin barra final y sin /api. Vacía en desarrollo. */
  readonly VITE_API_URL?: string;
  /** "true" enciende el modo demo al construir; apagado por defecto (spec 009, RF-15). */
  readonly VITE_MODO_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Año en que se construyó el sitio, para la leyenda de derechos (vite.config.ts, spec 007, RF-44). */
declare const __ANIO_PUBLICACION__: number;
