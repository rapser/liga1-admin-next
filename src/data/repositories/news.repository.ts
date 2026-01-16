/**
 * Implementación del Repositorio de Noticias
 * Usa Firestore para persistir y obtener datos de noticias
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { FIRESTORE_COLLECTIONS } from '@/core/config/firestore-constants';
import { INewsRepository } from '@/domain/repositories/news.repository.interface';
import { NewsItem } from '@/domain/entities/news.entity';
import { NewsDTO } from '../dtos/news.dto';
import { NewsMapper } from '../mappers/news.mapper';

export class NewsRepository implements INewsRepository {
  /**
   * Obtiene todas las noticias
   */
  async fetchAllNews(): Promise<NewsItem[]> {
    const newsRef = collection(db, FIRESTORE_COLLECTIONS.NEWS);
    const q = query(newsRef, orderBy('fechaPublicacion', 'desc'));

    const snapshot = await getDocs(q);

    const news = snapshot.docs.map((doc) =>
      NewsMapper.toDomain(doc.id, doc.data() as NewsDTO)
    );

    return news;
  }

  /**
   * Obtiene solo las noticias publicadas
   */
  async fetchPublishedNews(): Promise<NewsItem[]> {
    const newsRef = collection(db, FIRESTORE_COLLECTIONS.NEWS);
    const q = query(
      newsRef,
      where('publicada', '==', true),
      orderBy('fechaPublicacion', 'desc')
    );

    const snapshot = await getDocs(q);

    const news = snapshot.docs.map((doc) =>
      NewsMapper.toDomain(doc.id, doc.data() as NewsDTO)
    );

    return news;
  }

  /**
   * Obtiene una noticia específica por su ID
   */
  async fetchNewsById(newsId: string): Promise<NewsItem | null> {
    const newsRef = doc(db, FIRESTORE_COLLECTIONS.NEWS, newsId);
    const newsDoc = await getDoc(newsRef);

    if (!newsDoc.exists()) {
      return null;
    }

    return NewsMapper.toDomain(newsDoc.id, newsDoc.data() as NewsDTO);
  }

  /**
   * Observa cambios en tiempo real de las noticias
   */
  observeNews(
    callback: (news: NewsItem[]) => void,
    onlyPublished?: boolean
  ): Unsubscribe {
    const newsRef = collection(db, FIRESTORE_COLLECTIONS.NEWS);

    let q = query(newsRef, orderBy('fechaPublicacion', 'desc'));

    if (onlyPublished) {
      q = query(
        newsRef,
        where('publicada', '==', true),
        orderBy('fechaPublicacion', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const news = snapshot.docs.map((doc) =>
        NewsMapper.toDomain(doc.id, doc.data() as NewsDTO)
      );
      callback(news);
    });

    return unsubscribe;
  }

  /**
   * Crea una nueva noticia
   */
  async createNews(news: Omit<NewsItem, 'id'>): Promise<string> {
    const newsRef = collection(db, FIRESTORE_COLLECTIONS.NEWS);
    const newsDTO = NewsMapper.toDTO(news);

    const docRef = await addDoc(newsRef, newsDTO);
    return docRef.id;
  }

  /**
   * Actualiza una noticia existente
   */
  async updateNews(
    newsId: string,
    updates: Partial<NewsItem>
  ): Promise<void> {
    const newsRef = doc(db, FIRESTORE_COLLECTIONS.NEWS, newsId);

    // Convertir fecha a Timestamp si existe
    const updateData: Record<string, unknown> = { ...updates };
    if (updates.fechaPublicacion) {
      const { Timestamp } = await import('firebase/firestore');
      updateData.fechaPublicacion = Timestamp.fromDate(
        updates.fechaPublicacion
      );
    }

    // Remover campo id
    delete updateData.id;

    await updateDoc(newsRef, updateData);
  }

  /**
   * Alterna el estado de publicación de una noticia
   */
  async toggleNewsPublication(
    newsId: string,
    published: boolean
  ): Promise<void> {
    const newsRef = doc(db, FIRESTORE_COLLECTIONS.NEWS, newsId);
    await updateDoc(newsRef, { publicada: published });
  }

  /**
   * Elimina una noticia
   */
  async deleteNews(newsId: string): Promise<void> {
    const newsRef = doc(db, FIRESTORE_COLLECTIONS.NEWS, newsId);
    await deleteDoc(newsRef);
  }

  /**
   * Obtiene noticias por categoría
   */
  async fetchNewsByCategory(
    categoria: NewsItem['categoria']
  ): Promise<NewsItem[]> {
    const newsRef = collection(db, FIRESTORE_COLLECTIONS.NEWS);
    const q = query(
      newsRef,
      where('categoria', '==', categoria),
      orderBy('fechaPublicacion', 'desc')
    );

    const snapshot = await getDocs(q);

    const news = snapshot.docs.map((doc) =>
      NewsMapper.toDomain(doc.id, doc.data() as NewsDTO)
    );

    return news;
  }

  /**
   * Obtiene las últimas N noticias publicadas
   */
  async fetchLatestNews(limitCount: number): Promise<NewsItem[]> {
    const newsRef = collection(db, FIRESTORE_COLLECTIONS.NEWS);
    const q = query(
      newsRef,
      where('publicada', '==', true),
      orderBy('fechaPublicacion', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);

    const news = snapshot.docs.map((doc) =>
      NewsMapper.toDomain(doc.id, doc.data() as NewsDTO)
    );

    return news;
  }
}
