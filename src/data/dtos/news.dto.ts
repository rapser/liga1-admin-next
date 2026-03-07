/**
 * DTO para NewsItem (Noticia)
 * Representa la estructura del documento en Firestore
 */

import { Timestamp } from 'firebase/firestore';

export interface NewsDTO {
  /** Título de la noticia */
  titulo: string;

  /** Contenido de la noticia */
  contenido: string;

  /** URL de la imagen */
  imagenUrl?: string;

  /** Fecha de publicación como Timestamp */
  fechaPublicacion: Timestamp;

  /** Estado de publicación (publicada vs borrador) */
  publicada: boolean;

  /** Autor */
  autor?: string;

  /** Categoría */
  categoria?: 'general' | 'resultado' | 'fixture' | 'comunicado' | 'destacado' | 'partidos' | 'fichajes' | 'equipos' | 'jugadores' | 'tabla' | 'estadisticas';

  /** Tags */
  tags?: string[];

  /** URL externa */
  urlExterna?: string;
}

/**
 * Tipo para crear una nueva noticia
 */
export type CreateNewsDTO = Omit<NewsDTO, 'fechaPublicacion'> & {
  fechaPublicacion: Date;
};
