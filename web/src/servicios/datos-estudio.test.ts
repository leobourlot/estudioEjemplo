import { describe, expect, it } from 'vitest';
import {
  mapsUrl,
  networksToShow,
  pickNetworks,
  STUDIO_CONTACT,
  whatsappUrl,
  type WhatsappAbogada,
} from './datos-estudio';
import { MARCA } from './marca';
import { REDES_DE_MUESTRA } from './redes-de-muestra';

describe('datos del estudio (spec 007, RF-3 y RF-22; spec 004, RF-18; spec 009, RF-1)', () => {
  it('tienen el nombre del estudio de la marca, también en dos líneas', () => {
    expect(STUDIO_CONTACT.nombre).toBe(MARCA.nombre);
    expect(STUDIO_CONTACT.nombreLineas).toEqual(MARCA.nombreLineas);
  });

  it('tienen los WhatsApp, los emails, la dirección, los horarios y las redes de la marca', () => {
    const { whatsapps, emails, direccion, horarios, redes } = MARCA.contacto;

    expect(STUDIO_CONTACT).toEqual({
      nombre: MARCA.nombre,
      nombreLineas: MARCA.nombreLineas,
      whatsapps,
      emails,
      direccion,
      horarios,
      redes,
    });
  });

  it('el número para el enlace es el visible sin espacios, signos ni guiones', () => {
    for (const whatsapp of STUDIO_CONTACT.whatsapps) {
      expect(whatsapp.numero).toBe(whatsapp.visible.replace(/[^0-9]/g, ''));
    }
  });

  it('no tienen ningún dato de ejemplo (spec 007, RF-24)', () => {
    const all = JSON.stringify(STUDIO_CONTACT);
    expect(all).not.toContain('Ejemplo');
    expect(all).not.toContain('5491100000000');
  });
});

describe('whatsappUrl (spec 007, RF-22 y RF-27)', () => {
  // Números ficticios, para no depender de la marca cargada (spec 009, RF-14).
  const ana: WhatsappAbogada = {
    nombre: 'Dra. Ana Robledo',
    numero: '5493410000001',
    visible: '+54 9 341 000-0001',
  };
  const luis: WhatsappAbogada = {
    nombre: 'Dr. Luis Peña',
    numero: '5493410000002',
    visible: '+54 9 341 000-0002',
  };

  it('sin mensaje abre la conversación vacía, como en el portal (spec 004, RF-19)', () => {
    expect(whatsappUrl(ana)).toBe('https://wa.me/5493410000001');
  });

  it('con mensaje lo deja escrito, codificado', () => {
    const url = whatsappUrl(ana, 'Hola, me contacto por una consulta sobre Derecho de Daños.');

    expect(url).toBe(
      'https://wa.me/5493410000001?text=Hola%2C%20me%20contacto%20por%20una%20consulta%20sobre%20Derecho%20de%20Da%C3%B1os.',
    );
    expect(new URL(url).searchParams.get('text')).toBe(
      'Hola, me contacto por una consulta sobre Derecho de Daños.',
    );
  });

  it('con un mensaje vacío abre la conversación sin mensaje', () => {
    expect(whatsappUrl(ana, '')).toBe('https://wa.me/5493410000001');
  });

  it('usa el número de quien recibe', () => {
    expect(whatsappUrl(luis)).toBe('https://wa.me/5493410000002');
  });
});

describe('mapsUrl (spec 007, RF-23)', () => {
  it('abre la dirección en Google Maps, codificada', () => {
    const url = mapsUrl('San Martín 123, Piso 2 "B"');

    expect(url.startsWith('https://www.google.com/maps/search/?api=1&query=')).toBe(true);
    expect(new URL(url).searchParams.get('query')).toBe('San Martín 123, Piso 2 "B"');
    expect(url).not.toContain(' ');
    expect(url).not.toContain('"');
  });
});

describe('redes de muestra (spec 007, RF-24)', () => {
  const real = [{ red: 'Instagram', usuario: '@estudio', url: 'https://instagram.com/estudio' }];

  it('pickNetworks usa las de muestra solo si se piden y el estudio no informó ninguna', () => {
    expect(pickNetworks([], REDES_DE_MUESTRA)).toBe(REDES_DE_MUESTRA);
    expect(pickNetworks([], null)).toEqual([]);
    expect(pickNetworks(real, REDES_DE_MUESTRA)).toBe(real);
  });

  it('son Instagram, Facebook, X y LinkedIn, con una cuenta de muestra y la página principal de cada red', () => {
    expect(REDES_DE_MUESTRA.map((r) => r.red)).toEqual(['Instagram', 'Facebook', 'X', 'LinkedIn']);
    for (const red of REDES_DE_MUESTRA) {
      expect(red.usuario).toBe('@cuenta-de-muestra');
      expect(new URL(red.url).pathname).toBe('/');
    }
  });

  it('fuera de la versión de desarrollo (acá, los tests) no se muestran', () => {
    expect(import.meta.env.MODE).not.toBe('development');
    expect(networksToShow()).toEqual(STUDIO_CONTACT.redes);
    expect(networksToShow({ ...STUDIO_CONTACT, redes: [] })).toEqual([]);
  });
});
