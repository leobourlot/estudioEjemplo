/**
 * Escapa un texto para usarlo dentro de HTML o de un atributo entre comillas (spec 007, RF-35 y
 * RNF de textos seguros). Va en su propio archivo, sin otros imports, porque también lo usan
 * marca-construccion.ts y vite.config.ts al construir (plan 009, D10). No importa React
 * (principio 3).
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
