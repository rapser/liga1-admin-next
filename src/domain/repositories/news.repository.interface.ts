/**
 * Interfaz del Repositorio de Noticias
 * Define el contrato para operaciones CRUD de noticias
 */

import { NewsItem } from '../entities/news.entity';

export interface INewsRepository {
  /**
   * Obtiene todas las noticias
   */
  fetchAllNews(): Promise<NewsItem[]>;

  /**
   * Obtiene solo las noticias publicadas
   */
  fetchPublishedNews(): Promise<NewsItem[]>;

  /**
   * Obtiene una noticia específica por su ID
   */
  fetchNewsById(newsId: string): Promise<NewsItem | null>;

  /**
   * Observa cambios en tiempo real de las noticias
   * Retorna una función para cancelar la suscripción
   */
  observeNews(
    callback: (news: NewsItem[]) => void,
    onlyPublished?: boolean
  ): () => void;

  /**
   * Crea una nueva noticia
   */
  createNews(news: Omit<NewsItem, 'id'>): Promise<string>;

  /**
   * Actualiza una noticia existente
   */
  updateNews(newsId: string, updates: Partial<NewsItem>): Promise<void>;

  /**
   * Alterna el estado de publicación de una noticia
   */
  toggleNewsPublication(newsId: string, published: boolean): Promise<void>;

  /**
   * Elimina una noticia
   */
  deleteNews(newsId: string): Promise<void>;

  /**
   * Obtiene noticias por categoría
   */
  fetchNewsByCategory(categoria: NewsItem['categoria']): Promise<NewsItem[]>;

  /**
   * Obtiene las últimas N noticias publicadas
   */
  fetchLatestNews(limit: number): Promise<NewsItem[]>;
}
