import { afterEach, describe, expect, it, vi } from 'vitest';
import { openPdfInPlace, saveFile, type ObjectUrls } from './descarga-pdf';

const fakeUrls = () => {
  const blobs: Blob[] = [];
  const urls: ObjectUrls & { revoked: string[]; blobs: Blob[] } = {
    blobs,
    revoked: [],
    createObjectURL: (blob: Blob) => {
      blobs.push(blob);
      return `blob:https://estudio.test/${blobs.length}`;
    },
    revokeObjectURL(url: string) {
      urls.revoked.push(url);
    },
  };
  return urls;
};

/** Spec 010, T26 (RF-28; plan 010, D4 y D5). */
describe('descarga-pdf', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  describe('saveFile', () => {
    it('descarga con un enlace temporal, con el nombre, y después libera la dirección', () => {
      vi.useFakeTimers();
      const urls = fakeUrls();
      const clicks: { href: string; download: string }[] = [];
      const click = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function (this: HTMLAnchorElement) {
          clicks.push({ href: this.href, download: this.download });
        });
      const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });

      saveFile(blob, '2026-10-24 Resolucion K7Q2MX.pdf', document, urls);

      expect(clicks).toEqual([
        { href: 'blob:https://estudio.test/1', download: '2026-10-24 Resolucion K7Q2MX.pdf' },
      ]);
      expect(document.querySelector('a')).toBeNull();
      expect(urls.revoked).toEqual([]);
      vi.runAllTimers();
      expect(urls.revoked).toEqual(['blob:https://estudio.test/1']);
      click.mockRestore();
    });
  });

  describe('openPdfInPlace', () => {
    it('arma un Blob de tipo PDF aunque reciba otro tipo, y reemplaza la pestaña con su dirección', () => {
      const urls = fakeUrls();
      const replace = vi.fn<(url: string) => void>();

      openPdfInPlace(new Blob(['<html>'], { type: 'text/html' }), { replace }, urls);

      expect(urls.blobs).toHaveLength(1);
      expect(urls.blobs[0].type).toBe('application/pdf');
      expect(replace).toHaveBeenCalledWith('blob:https://estudio.test/1');
    });
  });
});
