import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity.js';

/**
 * PDF de un movimiento o de un fallo (spec 010, RF-1, RF-2). Va en una tabla propia para que
 * ninguna consulta de movimientos o fallos arrastre el contenido (plan 010, D1). No guarda el
 * nombre original ni el tipo informado por el navegador (RF-8). Al reemplazarlo o quitarlo se
 * borra (RF-14).
 */
@Entity('pdfs')
@Index('UQ_pdfs_codigo', ['codigo'], { unique: true })
export class Pdf {
  // Nunca sale de la api: un PDF se pide por su movimiento o su fallo (RF-29).
  @PrimaryGeneratedColumn()
  id: number;

  // Tal como llegó (RF-5). Solo lo lee la descarga, pidiéndolo con addSelect (plan 010, D1).
  @Column({ type: 'mediumblob', select: false })
  contenido: Buffer;

  // En bytes (RF-9).
  @Column({ type: 'int' })
  tamano: number;

  // Va en el nombre del archivo y nunca sirve para pedirlo (RF-6).
  @Column({ type: 'char', length: 6 })
  codigo: string;

  @Column({ type: 'int' })
  subidoPorId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'subidoPorId', foreignKeyConstraintName: 'FK_pdfs_subido_por' })
  subidoPor: Relation<Usuario>;

  @Column({ type: 'datetime', precision: 6 })
  subidoEn: Date;
}
