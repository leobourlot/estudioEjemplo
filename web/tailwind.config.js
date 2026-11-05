import { MARCA } from './src/servicios/marca.ts';
import { fontFaceRules, titleFontStack } from './src/servicios/marca-construccion.ts';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Colores y tipografía de los títulos de la marca (spec 007, RF-3; spec 009, RF-8), del
      // archivo de marca. El logo va en degradado hacia la derecha, de `oscuro` a `claro`:
      // bg-gradient-to-r from-estudio-oscuro to-estudio-claro.
      fontFamily: {
        titulos: titleFontStack(MARCA.tipografiaTitulos),
      },
      colors: {
        estudio: { ...MARCA.colores },
      },
      // Íconos de las tarjetas de los servicios al pasar el puntero (spec 007, RF-12 y RF-45):
      // una sola vez y en menos de 0,6 s.
      keyframes: {
        'icono-balanceo': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '35%': { transform: 'rotate(-8deg)' },
          '70%': { transform: 'rotate(5deg)' },
        },
        'icono-salto': {
          '0%, 100%': { transform: 'translateY(0)' },
          '45%': { transform: 'translateY(-3px)' },
        },
      },
      animation: {
        'icono-balanceo': 'icono-balanceo 0.55s ease-in-out',
        'icono-salto': 'icono-salto 0.5s ease-in-out',
      },
    },
  },
  plugins: [
    // Las @font-face de la tipografía de los títulos, con sus archivos dentro del sitio (spec 007,
    // RF-40; spec 009, RF-3 y RF-8).
    ({ addBase }) => addBase(fontFaceRules(MARCA.tipografiaTitulos)),
  ],
};
