/**
 * Entidad de Dominio: NewsItem (Noticia)
 * Representa una noticia o comunicado de la Liga 1
 */

export interface NewsItem {
  /** ID único de la noticia */
  id: string;

  /** Título de la noticia */
  titulo: string;

  /** Contenido o descripción de la noticia */
  contenido: string;

  /** URL de la imagen principal de la noticia */
  imagenUrl?: string;

  /** Fecha de publicación */
  fechaPublicacion: Date;

  /** Indica si la noticia está publicada y visible */
  publicada: boolean;

  /** Autor de la noticia */
  autor?: string;

  /** Categoría de la noticia */
  categoria?: 'resultado' | 'fixture' | 'tabla' | 'general' | 'comunicado';

  /** Tags relacionados con la noticia */
  tags?: string[];

  /** URL externa si es una noticia de enlace */
  urlExterna?: string;
}

/**
 * Crea una nueva noticia con valores por defecto
 */
export const createNewsItem = (
  titulo: string,
  contenido: string,
  categoria: NewsItem['categoria'] = 'general'
): Omit<NewsItem, 'id'> => ({
  titulo,
  contenido,
  categoria,
  fechaPublicacion: new Date(),
  publicada: false,
  tags: [],
});

/**
 * Verifica si una noticia está publicada
 */
export const isNewsPublished = (news: NewsItem): boolean => {
  return news.publicada;
};

/**
 * Obtiene un extracto del contenido de la noticia
 */
export const getNewsExcerpt = (news: NewsItem, maxLength: number = 150): string => {
  if (news.contenido.length <= maxLength) {
    return news.contenido;
  }
  return news.contenido.substring(0, maxLength).trim() + '...';
};

/**
 * Compara dos noticias para ordenarlas por fecha (más reciente primero)
 */
export const compareNewsByDate = (a: NewsItem, b: NewsItem): number => {
  return b.fechaPublicacion.getTime() - a.fechaPublicacion.getTime();
};

/**
 * Formatea la categoría para mostrar en la UI
 */
export const formatNewsCategory = (categoria: NewsItem['categoria']): string => {
  if (!categoria) return 'General';

  const categoriaMap: Record<NonNullable<NewsItem['categoria']>, string> = {
    resultado: 'Resultado',
    fixture: 'Fixture',
    tabla: 'Tabla de Posiciones',
    general: 'General',
    comunicado: 'Comunicado Oficial',
  };

  return categoriaMap[categoria];
};
