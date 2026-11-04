/**
 * Contraste entre dos colores, con la fórmula de WCAG 2 (spec 009, RF-9): así una marca nueva no
 * puede romper la accesibilidad de las specs 007 y 008 sin que fallen los tests. No importa React
 * (principio 3).
 */

/** El mínimo para el texto normal (WCAG 2, nivel AA). */
export const MIN_TEXT_CONTRAST = 4.5;

const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

function channel(hex: string): number {
  const value = parseInt(hex, 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa de un color #RRGGBB. */
function luminance(color: string): number {
  const match = HEX_COLOR.exec(color);
  if (!match) throw new Error(`El color debe tener la forma #RRGGBB (recibido: "${color}")`);
  const [, red, green, blue] = match;
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

/** La relación de contraste entre dos colores, de 1 a 21, en cualquier orden. */
export function contrastRatio(colorA: string, colorB: string): number {
  const [lighter, darker] = [luminance(colorA), luminance(colorB)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}
