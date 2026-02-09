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
    try {
      const newsRef = collection(db, FIRESTORE_COLLECTIONS.NEWS);
      
      // Intentar con orderBy usando 'fecha' (campo real) o 'fechaPublicacion' (compatibilidad)
      // Si falla por falta de índice, usar consulta simple
      let snapshot;
      try {
        // Intentar primero con 'fecha' (campo real en Firestore)
        const q = query(newsRef, orderBy('fecha', 'desc'));
        snapshot = await getDocs(q);
      } catch (orderByError: unknown) {
        // Si falla, intentar con 'fechaPublicacion'
        try {
          const q = query(newsRef, orderBy('fechaPublicacion', 'desc'));
          snapshot = await getDocs(q);
        } catch {
          // Si ambos fallan, obtener sin ordenar y ordenar en memoria
          snapshot = await getDocs(newsRef);
        }
      }

      const news = snapshot.docs
        .map((doc) => {
          try {
            const docData = doc.data();
            return NewsMapper.toDomain(doc.id, docData as NewsDTO);
          } catch (mapperError) {
            console.error(`Error al mapear noticia ${doc.id}:`, mapperError, doc.data());
            return null;
          }
        })
        .filter((item): item is NewsItem => item !== null);

      // Ordenar en memoria si no se ordenó en la consulta
      news.sort((a, b) => b.fechaPublicacion.getTime() - a.fechaPublicacion.getTime());

      return news;
    } catch (error) {
      console.error('Error en fetchAllNews:', error);
      throw error;
    }
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
   * Usa el formato real de Firestore: title, image, fecha, categoria, destacada, periodico, url
   */
  async createNews(news: Omit<NewsItem, 'id'>): Promise<string> {
    const newsRef = collection(db, FIRESTORE_COLLECTIONS.NEWS);
    // Usar toFirestoreFormat para guardar con los campos reales de Firestore
    const firestoreData = NewsMapper.toFirestoreFormat(news);

    const docRef = await addDoc(newsRef, firestoreData);
    return docRef.id;
  }

  /**
   * Actualiza una noticia existente
   * Convierte los campos al formato real de Firestore: title, image, fecha, categoria, destacada, periodico, url
   */
  async updateNews(
    newsId: string,
    updates: Partial<NewsItem>
  ): Promise<void> {
    const newsRef = doc(db, FIRESTORE_COLLECTIONS.NEWS, newsId);

    // Convertir al formato de Firestore
    const updateData: Record<string, unknown> = {};
    
    if (updates.titulo !== undefined) updateData.title = updates.titulo;
    if (updates.imagenUrl !== undefined) updateData.image = updates.imagenUrl || '';
    if (updates.publicada !== undefined) updateData.destacada = updates.publicada;
    if (updates.autor !== undefined) updateData.periodico = updates.autor || '';
    if (updates.urlExterna !== undefined) updateData.url = updates.urlExterna || '';
    if (updates.categoria !== undefined) updateData.categoria = updates.categoria || 'general';
    
    if (updates.fechaPublicacion) {
      const { Timestamp } = await import('firebase/firestore');
      updateData.fecha = Timestamp.fromDate(updates.fechaPublicacion);
    }

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
