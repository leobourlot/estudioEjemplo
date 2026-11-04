import type { StudioContact, WhatsappAbogada } from '../servicios/datos-estudio';

/**
 * Datos de contacto ficticios para los tests que prueban una regla con una forma fija (dos
 * WhatsApp, dos emails, dirección y sin horarios), sin depender de la marca cargada (spec 009,
 * RF-14). Los tests que verifican que se usan los datos de la marca leen STUDIO_CONTACT.
 */

export const WHATSAPPS_DE_PRUEBA: readonly WhatsappAbogada[] = [
  { nombre: 'Dra. Ana Robledo', numero: '5493410000001', visible: '+54 9 341 000-0001' },
  { nombre: 'Dr. Luis Peña', numero: '5493410000002', visible: '+54 9 341 000-0002' },
];

export const CONTACTO_DE_PRUEBA: StudioContact = {
  nombre: 'Robledo | Peña - Estudio de prueba',
  nombreLineas: ['Robledo | Peña', 'Estudio de prueba'],
  whatsapps: WHATSAPPS_DE_PRUEBA,
  emails: [
    { nombre: 'Dra. Ana Robledo', email: 'ana@estudio-de-prueba.test' },
    { nombre: 'Dr. Luis Peña', email: 'luis@estudio-de-prueba.test' },
  ],
  direccion: 'San Martín 123, Piso 2, Villaguay',
  horarios: [],
  redes: [
    {
      red: 'Instagram',
      usuario: '@estudio-de-prueba',
      url: 'https://www.instagram.com/estudio-de-prueba/',
    },
  ],
};
