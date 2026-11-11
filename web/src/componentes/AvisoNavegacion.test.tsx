import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  fakeSessionService,
  findPanelHome,
  renderApp,
  testUser,
} from '../pruebas/aplicacion-de-prueba';
import { canAccess, PDF_NOT_FOUND_NOTICE } from '../servicios/sesion';

const PDF_PANEL_MOVIMIENTO = '/panel/causas/3/movimientos/8/pdf';
const PDF_PANEL_FALLO = '/panel/jurisprudencia/5/pdf';
const PDF_PORTAL = '/portal/causas/3/movimientos/8/pdf';

const withUser = (rol: 'admin' | 'abogado' | 'cliente', debeCambiarContrasena = false) =>
  fakeSessionService({
    fetchOwnUser: vi.fn().mockResolvedValue(testUser(rol, { debeCambiarContrasena })),
  });

/** Spec 010, T29 (RF-37): las rutas de PDF de la otra sección llevan al inicio con un aviso. */
describe('rutas de PDF y aviso al llevar al inicio', () => {
  describe('canAccess', () => {
    it.each([PDF_PANEL_MOVIMIENTO, PDF_PANEL_FALLO])(
      'lleva a un cliente desde %s al portal con el aviso',
      (path) => {
        expect(canAccess(path, testUser('cliente'))).toEqual({
          allowed: false,
          redirectTo: '/portal',
          notice: 'No existe ese PDF',
        });
      },
    );

    it.each(['admin', 'abogado'] as const)('lleva a un %s desde el portal al panel con el aviso', (rol) => {
      expect(canAccess(PDF_PORTAL, testUser(rol))).toEqual({
        allowed: false,
        redirectTo: '/panel',
        notice: PDF_NOT_FOUND_NOTICE,
      });
    });

    it('deja pasar a cada uno a las rutas de su sección', () => {
      expect(canAccess(PDF_PANEL_MOVIMIENTO, testUser('abogado'))).toEqual({ allowed: true });
      expect(canAccess(PDF_PANEL_FALLO, testUser('admin'))).toEqual({ allowed: true });
      expect(canAccess(PDF_PORTAL, testUser('cliente'))).toEqual({ allowed: true });
    });

    it.each([PDF_PANEL_MOVIMIENTO, PDF_PORTAL])('sin sesión, %s lleva a /ingresar sin aviso', (path) => {
      expect(canAccess(path, null)).toEqual({ allowed: false, redirectTo: '/ingresar' });
    });

    it('con el cambio de contraseña pendiente, lleva a cambiarla sin aviso (spec 001, RF-11)', () => {
      expect(canAccess(PDF_PORTAL, testUser('cliente', { debeCambiarContrasena: true }))).toEqual({
        allowed: false,
        redirectTo: '/cambiar-contrasena',
      });
    });

    it('las demás rutas de la otra sección siguen sin aviso', () => {
      expect(canAccess('/panel/usuarios', testUser('cliente'))).toEqual({
        allowed: false,
        redirectTo: '/portal',
      });
    });
  });

  describe('en la aplicación', () => {
    it('un integrante que abre un PDF del portal llega al panel con el aviso', async () => {
      renderApp(PDF_PORTAL, withUser('abogado'));

      await findPanelHome();
      expect(screen.getByRole('status').textContent).toBe('No existe ese PDF');
    });

    it('un cliente que abre un PDF del panel llega al portal con el aviso', async () => {
      renderApp(PDF_PANEL_FALLO, withUser('cliente'));

      expect((await screen.findByText('No existe ese PDF')).getAttribute('role')).toBe('status');
      screen.getByRole('heading', { name: 'Mis causas' });
    });

    it('el inicio sin aviso no muestra ninguno', async () => {
      renderApp('/panel', withUser('abogado'));

      await findPanelHome();
      expect(screen.queryByText('No existe ese PDF')).toBeNull();
    });
  });
});
