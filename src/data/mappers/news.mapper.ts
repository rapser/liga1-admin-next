/**
 * Mapper para NewsItem
 * Convierte entre NewsDTO (Firestore) y NewsItem (Dominio)
 */

import { Timestamp } from 'firebase/firestore';
import { NewsItem } from '@/domain/entities/news.entity';
import { NewsDTO } from '../dtos/news.dto';

export class NewsMapper {
  /**
   * Convierte un NewsDTO de Firestore a una entidad NewsItem del dominio
   */
  static toDomain(id: string, dto: NewsDTO): NewsItem {
    return {
      id,
      titulo: dto.titulo,
      contenido: dto.contenido,
      imagenUrl: dto.imagenUrl,
      fechaPublicacion: dto.fechaPublicacion.toDate(), // Timestamp → Date
      publicada: dto.publicada,
      autor: dto.autor,
      categoria: dto.categoria,
      tags: dto.tags,
      urlExterna: dto.urlExterna,
    };
  }

  /**
   * Convierte una entidad NewsItem del dominio a un NewsDTO para Firestore
   */
  static toDTO(news: Omit<NewsItem, 'id'>): NewsDTO {
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
   * Convierte múltiples DTOs a entidades del dominio
   */
  static toDomainList(
    docs: Array<{ id: string; data: NewsDTO }>
  ): NewsItem[] {
    return docs.map((doc) => this.toDomain(doc.id, doc.data));
  }
}
