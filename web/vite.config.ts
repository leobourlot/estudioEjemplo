/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { MARCA } from './src/servicios/marca.ts';
import { brandHeadTags } from './src/servicios/marca-construccion.ts';

/**
 * Pone en la página base el favicon, el ícono de los teléfonos y la precarga de la tipografía de
 * la marca, en desarrollo y al construir (spec 009, RF-2; plan 009, D10).
 */
function brandInIndexHtml(): Plugin {
  return {
    name: 'marca-en-index-html',
    transformIndexHtml: (html) => html.replace('<!--marca-->', () => brandHeadTags(MARCA)),
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), brandInIndexHtml()],
  // Año de la leyenda de derechos del pie de página: el de la publicación del sitio (spec 007,
  // RF-44). Es el mismo en el build del navegador y en el de Node, así el HTML prerenderizado y la
  // hidratación coinciden.
  define: {
    __ANIO_PUBLICACION__: JSON.stringify(new Date().getFullYear()),
  },
  server: {
    // En desarrollo, las llamadas a /api van a NestJS (ver plan 001, Topología).
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/configuracion-tests.ts'],
  },
});
