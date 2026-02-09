/**
 * Mapper para NewsItem
 * Convierte entre NewsDTO (Firestore) y NewsItem (Dominio)
 */

import { Timestamp } from 'firebase/firestore';
import { NewsItem } from '@/domain/entities/news.entity';
import { NewsDTO } from '../dtos/news.dto';

// Tipo flexible para datos raw de Firestore (estructura real en Firestore)
type RawNewsData = {
  // Campos reales en Firestore
  title?: string;
  image?: string;
  fecha?: Timestamp | Date | string | number;
  categoria?: string;
  destacada?: boolean;
  periodico?: string;
  url?: string;
  // Campos antiguos (compatibilidad)
  titulo?: string;
  contenido?: string;
  imagenUrl?: string;
  fechaPublicacion?: Timestamp | Date | string | number;
  publicada?: boolean;
  autor?: string;
  tags?: string[];
  urlExterna?: string;
  [key: string]: unknown;
};

export class NewsMapper {
  /**
   * Convierte un NewsDTO de Firestore a una entidad NewsItem del dominio
   * Acepta tanto NewsDTO como datos raw de Firestore para mayor flexibilidad
   */
  static toDomain(id: string, dto: NewsDTO | RawNewsData): NewsItem {
    // Mapear campos reales de Firestore a campos del dominio
    // Los campos en Firestore son: title, image, fecha, categoria, destacada, periodico, url
    
    // Título: usar 'title' (campo real) o 'titulo' (compatibilidad)
    const titulo = (dto as RawNewsData).title || (dto as RawNewsData).titulo || 'Sin título';
    
    // Contenido: usar 'contenido' si existe, sino usar el título como fallback
    const contenido = (dto as RawNewsData).contenido || titulo;
    
    // Imagen: usar 'image' (campo real) o 'imagenUrl' (compatibilidad)
    const imagenUrl = (dto as RawNewsData).image || (dto as RawNewsData).imagenUrl;
    
    // Fecha: usar 'fecha' (campo real) o 'fechaPublicacion' (compatibilidad)
    const fechaRaw = (dto as RawNewsData).fecha || (dto as RawNewsData).fechaPublicacion;
    
    // Estado publicado: usar 'destacada' (campo real) o 'publicada' (compatibilidad)
    const publicada = (dto as RawNewsData).destacada ?? (dto as RawNewsData).publicada ?? false;
    
    // Autor: usar 'periodico' (campo real) o 'autor' (compatibilidad)
    const autor = (dto as RawNewsData).periodico || (dto as RawNewsData).autor;
    
    // URL externa: usar 'url' (campo real) o 'urlExterna' (compatibilidad)
    const urlExterna = (dto as RawNewsData).url || (dto as RawNewsData).urlExterna;
    
    // Categoría: ya existe en ambos formatos
    const categoria = (dto as RawNewsData).categoria as NewsItem['categoria'] | undefined;
    
    // Manejar diferentes tipos de fecha
    let fechaPublicacion: Date;
    
    if (!fechaRaw) {
      // Si no hay fecha, usar fecha actual
      fechaPublicacion = new Date();
    } else if (typeof fechaRaw === 'object' && 'toDate' in fechaRaw && typeof (fechaRaw as Timestamp).toDate === 'function') {
      // Es un Timestamp de Firestore
      fechaPublicacion = (fechaRaw as Timestamp).toDate();
    } else if (fechaRaw instanceof Date) {
      // Ya es una Date
      fechaPublicacion = fechaRaw;
    } else if (typeof fechaRaw === 'string') {
      // Es un string (ISO date string)
      fechaPublicacion = new Date(fechaRaw);
      if (isNaN(fechaPublicacion.getTime())) {
        fechaPublicacion = new Date();
      }
    } else if (typeof fechaRaw === 'number') {
      // Es un número (timestamp en milisegundos o segundos)
      // Si es menor que un timestamp razonable (año 2000), asumimos que está en segundos
      const timestamp = fechaRaw < 946684800000 ? fechaRaw * 1000 : fechaRaw;
      fechaPublicacion = new Date(timestamp);
      if (isNaN(fechaPublicacion.getTime())) {
        fechaPublicacion = new Date();
      }
    } else {
      // Por defecto usar fecha actual
      fechaPublicacion = new Date();
    }

    return {
      id,
      titulo,
      contenido,
      imagenUrl,
      fechaPublicacion,
      publicada,
      autor,
      categoria,
      tags: (dto as RawNewsData).tags,
      urlExterna,
    };
  }

  /**
   * Convierte una entidad NewsItem del dominio a un NewsDTO para Firestore
   * Usa la estructura real de Firestore: title, image, fecha, categoria, destacada, periodico, url
   */
  static toDTO(news: Omit<NewsItem, 'id'>): NewsDTO {
    // Retornar estructura compatible con el DTO pero también mapear a campos reales
    return {
      titulo: news.titulo,
      contenido: news.contenido,
      imagenUrl: news.imagenUrl,
      fechaPublicacion: Timestamp.fromDate(news.fechaPublicacion), // Date → Timestamp
      publicada: news.publicada,
      autor: news.autor,
      categoria: news.categoria,
      tags: news.tags,
      urlExterna: news.urlExterna,
    };
  }

  /**
   * Convierte una entidad NewsItem a la estructura real de Firestore
   * Usa los campos: title, image, fecha, categoria, destacada, periodico, url
   */
  static toFirestoreFormat(news: Omit<NewsItem, 'id'>): Record<string, unknown> {
    return {
      title: news.titulo,
      image: news.imagenUrl || '',
      fecha: Timestamp.fromDate(news.fechaPublicacion),
      categoria: news.categoria || 'general',
      destacada: news.publicada,
      periodico: news.autor || '',
      url: news.urlExterna || '',
    };
  }

  /**
   * Convierte múltiples DTOs a entidades del dominio
   */
  static toDomainList(
    docs: Array<{ id: string; data: NewsDTO }>
  ): NewsItem[] {
    return docs.map((doc) => this.toDomain(doc.id, doc.data));
  }
}
