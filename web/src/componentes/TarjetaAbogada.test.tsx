import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ABOGADAS,
  type Abogada,
  hasOwnPage,
  lawyerName,
  lawyerPath,
  moreInfoSuffix,
} from '../servicios/contenido-sitio';
import { MARCA } from '../servicios/marca';
import { FotoAbogada } from './FotoAbogada';
import { TarjetaAbogada } from './TarjetaAbogada';

// Integrantes ficticias, para probar las reglas sin depender de la marca (spec 009, RF-14).
const ana: Abogada = {
  slug: 'ana-maria-robledo',
  nombre: 'Ana María Robledo',
  genero: 'femenino',
  titulo: 'Abogada | Mediadora',
  foto: '/marca/fotos/ana-maria-robledo.jpg',
  resumen: 'Resumen de Ana.',
  texto: ['Texto de Ana.'],
};
const luis: Abogada = {
  ...ana,
  slug: 'luis-pena',
  nombre: 'Luis Peña',
  genero: 'masculino',
  titulo: 'Abogado',
  foto: '/marca/fotos/luis-pena.jpg',
  resumen: 'Resumen de Luis.',
};
const withPhoto = ana;
const withoutPhoto: Abogada = { ...ana, foto: null };
/** Una integrante que se suma sin sus textos (RF-20). */
const withoutTexts: Abogada = {
  slug: 'nueva-integrante',
  nombre: 'Nueva Integrante',
  genero: 'femenino',
  titulo: 'Abogada',
  foto: null,
  resumen: null,
  texto: null,
};

const initials = (text: string) => screen.getByText(text);
const photo = () => screen.queryByRole('img', { name: 'Foto de la Dra. Ana María Robledo' });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FotoAbogada (spec 007, RF-21)', () => {
  it('sin foto muestra las iniciales, que no se anuncian', () => {
    render(<FotoAbogada abogada={withoutPhoto} tamano="mediana" />);

    expect(initials('AMR').getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('mientras la foto carga, las iniciales se ven y la foto todavía no', () => {
    render(<FotoAbogada abogada={withPhoto} tamano="mediana" />);

    expect(initials('AMR')).toBeTruthy();
    expect(photo()!.className).toContain('opacity-0');
  });

  it('al cargar, la foto se muestra encima, con tamaño fijo y su texto alternativo', () => {
    render(<FotoAbogada abogada={withPhoto} tamano="grande" />);

    fireEvent.load(photo()!);

    expect(photo()!.className).toContain('opacity-100');
    expect(photo()!.getAttribute('width')).toBe('192');
    expect(photo()!.getAttribute('height')).toBe('192');
    expect(photo()!.getAttribute('src')).toBe(ana.foto);
  });

  it('si la foto no carga, la quita y quedan las iniciales', () => {
    render(<FotoAbogada abogada={withPhoto} tamano="mediana" />);

    fireEvent.error(photo()!);

    expect(photo()).toBeNull();
    expect(initials('AMR')).toBeTruthy();
  });

  it('si la foto ya estaba rota al montarse, la quita', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0);

    render(<FotoAbogada abogada={withPhoto} tamano="mediana" />);

    expect(photo()).toBeNull();
  });

  it('si la foto ya estaba cargada al montarse, la muestra', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(600);

    render(<FotoAbogada abogada={withPhoto} tamano="mediana" />);

    expect(photo()!.className).toContain('opacity-100');
  });

  it('en las tarjetas carga la foto diferida', () => {
    render(<FotoAbogada abogada={withPhoto} tamano="mediana" diferida />);

    expect(photo()!.getAttribute('loading')).toBe('lazy');
  });
});

describe('TarjetaAbogada (spec 007, RF-18 y RF-20)', () => {
  it('con sus textos: foto, nombre, título profesional, resumen y "Más información" a su página', () => {
    render(<TarjetaAbogada abogada={ana} />);

    expect(screen.getByRole('heading', { level: 3, name: 'Dra. Ana María Robledo' })).toBeTruthy();
    expect(screen.getByText(ana.titulo)).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Foto de la Dra. Ana María Robledo' })).toBeTruthy();
    expect(screen.getByText(ana.resumen!)).toBeTruthy();
    const link = screen.getByRole('link', {
      name: 'Más información sobre la Dra. Ana María Robledo',
    });
    expect(link.getAttribute('href')).toBe(`/${MARCA.equipo.ruta}/ana-maria-robledo`);
    expect(initials('AMR')).toBeTruthy();
  });

  it('la de un abogado, con "Dr." y sus artículos (spec 009, RF-5)', () => {
    render(<TarjetaAbogada abogada={luis} />);

    expect(screen.getByRole('heading', { level: 3, name: 'Dr. Luis Peña' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Foto del Dr. Luis Peña' })).toBeTruthy();
    expect(screen.getByText(luis.resumen!)).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'Más información sobre el Dr. Luis Peña' })
        .getAttribute('href'),
    ).toBe(`/${MARCA.equipo.ruta}/luis-pena`);
    expect(initials('LP')).toBeTruthy();
  });

  it.each(ABOGADAS.map((integrante) => [integrante.nombre, integrante] as const))(
    'la de %s, de la marca',
    (_nombre, integrante) => {
      render(<TarjetaAbogada abogada={integrante} />);

      expect(screen.getByRole('heading', { level: 3, name: lawyerName(integrante) })).toBeTruthy();
      expect(screen.getByText(integrante.titulo)).toBeTruthy();
      const link = screen.queryByRole('link', {
        name: `Más información ${moreInfoSuffix(integrante)}`,
      });
      if (hasOwnPage(integrante)) {
        expect(screen.getByText(integrante.resumen!)).toBeTruthy();
        expect(link!.getAttribute('href')).toBe(lawyerPath(integrante));
      } else {
        expect(link).toBeNull();
      }
    },
  );

  it('sin sus textos: solo foto, nombre y título profesional', () => {
    const { container } = render(<TarjetaAbogada abogada={withoutTexts} />);

    expect(screen.getByRole('heading', { level: 3, name: 'Dra. Nueva Integrante' })).toBeTruthy();
    expect(initials('NI')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
    expect(Array.from(container.querySelectorAll('p')).map((p) => p.textContent)).toEqual([
      withoutTexts.titulo,
    ]);
  });
});
