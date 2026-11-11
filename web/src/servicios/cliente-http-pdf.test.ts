import { describe, expect, it, vi } from 'vitest';
import { ApiError, createHttpClient, NETWORK_ERROR_MESSAGE } from './cliente-http';

const BASE_URL = 'https://api.estudio.com';
const REFRESH_URL = `${BASE_URL}/api/sesion/renovar`;

const jsonResponse = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
  });

const pdfResponse = (contenido: string, nombre?: string) =>
  new Response(contenido, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      ...(nombre ? { 'Content-Disposition': `attachment; filename="${nombre}"` } : {}),
    },
  });

/** Spec 010, T25: formularios con archivo y descarga de archivos (plan 010, D2, D4, D5). */
describe('cliente HTTP: formularios y archivos', () => {
  const setup = () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = createHttpClient({ baseUrl: BASE_URL, fetch: fetchMock });
    const activity = vi.fn<() => void>();
    client.onActivity(activity);
    return { fetchMock, client, activity };
  };

  const formData = () => {
    const datos = new FormData();
    datos.append('datos', JSON.stringify({ descripcion: 'Texto' }));
    datos.append('pdf', new File(['%PDF-1.4'], 'escrito.pdf', { type: 'application/pdf' }));
    return datos;
  };

  describe('sendForm (RF-10, RF-12)', () => {
    it('envía el FormData sin fijar Content-Type, con las cookies, y devuelve el JSON', async () => {
      const { fetchMock, client } = setup();
      fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: 3 }));
      const datos = formData();

      const result = await client.sendForm('POST', '/panel/causas/1/movimientos', datos);

      expect(result).toEqual({ id: 3 });
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/panel/causas/1/movimientos`, {
        method: 'POST',
        credentials: 'include',
        headers: undefined,
        body: datos,
      });
    });

    it('ante un 401 renueva una vez y reenvía el mismo FormData', async () => {
      const { fetchMock, client } = setup();
      fetchMock
        .mockResolvedValueOnce(jsonResponse(401, { message: 'Sesión vencida' }))
        .mockResolvedValueOnce(jsonResponse(204))
        .mockResolvedValueOnce(jsonResponse(200, { id: 3 }));
      const datos = formData();

      await client.sendForm('PATCH', '/panel/causas/1/movimientos/3', datos);

      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
        `${BASE_URL}/api/panel/causas/1/movimientos/3`,
        REFRESH_URL,
        `${BASE_URL}/api/panel/causas/1/movimientos/3`,
      ]);
      expect(fetchMock.mock.calls[2][1]?.body).toBe(datos);
    });

    it('un error de red da un ApiError de estado 0', async () => {
      const { fetchMock, client } = setup();
      fetchMock.mockRejectedValueOnce(new TypeError('sin conexión'));

      const error = await client.sendForm('POST', '/panel/jurisprudencia', formData()).catch(
        (e: unknown) => e,
      );

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(0);
      expect((error as ApiError).message).toBe(NETWORK_ERROR_MESSAGE);
    });

    it('un error de la api llega con sus mensajes', async () => {
      const { fetchMock, client } = setup();
      fetchMock.mockResolvedValueOnce(jsonResponse(400, { message: 'El archivo debe ser un PDF' }));

      await expect(client.sendForm('POST', '/panel/jurisprudencia', formData())).rejects.toMatchObject(
        { status: 400, messages: ['El archivo debe ser un PDF'] },
      );
    });

    it('avisa actividad', async () => {
      const { fetchMock, client, activity } = setup();
      fetchMock.mockResolvedValueOnce(jsonResponse(201, {}));

      await client.sendForm('POST', '/panel/jurisprudencia', formData());

      expect(activity).toHaveBeenCalledTimes(1);
    });
  });

  describe('getFile (RF-7, RF-28)', () => {
    it('devuelve el Blob y el nombre de Content-Disposition', async () => {
      const { fetchMock, client } = setup();
      fetchMock.mockResolvedValueOnce(pdfResponse('%PDF-1.4 contenido', '2026-10-24 Resolucion K7Q2MX.pdf'));

      const archivo = await client.getFile('/panel/causas/1/movimientos/3/pdf');

      expect(archivo.nombre).toBe('2026-10-24 Resolucion K7Q2MX.pdf');
      expect(await archivo.blob.text()).toBe('%PDF-1.4 contenido');
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/panel/causas/1/movimientos/3/pdf`, {
        method: 'GET',
        credentials: 'include',
        headers: undefined,
        body: undefined,
      });
    });

    it('sin Content-Disposition, el nombre es null', async () => {
      const { fetchMock, client } = setup();
      fetchMock.mockResolvedValueOnce(pdfResponse('%PDF-1.4'));

      expect((await client.getFile('/panel/jurisprudencia/2/pdf')).nombre).toBeNull();
    });

    it('un 404 llega como ApiError con el mensaje de la api', async () => {
      const { fetchMock, client } = setup();
      fetchMock.mockResolvedValueOnce(jsonResponse(404, { message: 'No existe ese PDF' }));

      await expect(client.getFile('/portal/causas/1/movimientos/3/pdf')).rejects.toMatchObject({
        status: 404,
        messages: ['No existe ese PDF'],
      });
    });

    it('ante un 401 renueva y reintenta, y avisa actividad en cada pedido', async () => {
      const { fetchMock, client, activity } = setup();
      fetchMock
        .mockResolvedValueOnce(jsonResponse(401, {}))
        .mockResolvedValueOnce(jsonResponse(204))
        .mockResolvedValueOnce(pdfResponse('%PDF-1.4', 'Fallo 2019-05-12 P4N8RC.pdf'));

      const archivo = await client.getFile('/panel/jurisprudencia/2/pdf');

      expect(archivo.nombre).toBe('Fallo 2019-05-12 P4N8RC.pdf');
      expect(activity).toHaveBeenCalledTimes(3);
    });
  });
});
