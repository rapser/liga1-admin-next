/**
 * Página de Noticias
 * Lista y gestión de noticias de la Liga 1
 */

'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/presentation/hooks/use-require-auth';
import { DashboardLayout } from '@/presentation/components/layout';
import { PageHeader, StatCard } from '@/presentation/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewsItem } from '@/domain/entities/news.entity';
import { NewsRepository } from '@/data/repositories/news.repository';
import { Newspaper, Eye, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const newsRepository = new NewsRepository();

export default function NoticiasPage() {
  const { loading: authLoading } = useRequireAuth();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNews = async () => {
      try {
        setLoading(true);
        const data = await newsRepository.fetchAllNews();
        // Ordenar por fecha de publicación (más recientes primero)
        const sorted = [...data].sort((a, b) => b.fechaPublicacion.getTime() - a.fechaPublicacion.getTime());
        setNews(sorted);
      } catch (error) {
        console.error('Error al cargar noticias:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadNews();
    }
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-[#67748e]">Cargando noticias...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const publishedNews = news.filter(n => n.publicada);
  const draftNews = news.filter(n => !n.publicada);

  return (
    <DashboardLayout>
      <PageHeader
        title="Noticias"
        description="Gestión de noticias de la Liga 1"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Noticias"
          value={news.length}
          icon={Newspaper}
          subtitle="En el sistema"
          variant="liga1"
        />
        <StatCard
          title="Publicadas"
          value={publishedNews.length}
          icon={CheckCircle2}
          subtitle="Visibles al público"
          variant="success"
        />
        <StatCard
          title="Borradores"
          value={draftNews.length}
          icon={Clock}
          subtitle="En edición"
          variant="warning"
        />
      </div>

      {/* Lista de Noticias */}
      {news.length === 0 ? (
        <Card className="shadow-soft border-0">
          <CardContent className="py-12">
            <div className="text-center text-[#67748e]">
              <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay noticias disponibles</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {news.map((item) => (
            <NewsCard key={item.id} news={item} />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

interface NewsCardProps {
  news: NewsItem;
}

function NewsCard({ news }: NewsCardProps) {
  return (
    <Card className="shadow-soft border-0 hover:shadow-soft-lg transition-shadow overflow-hidden">
      {/* Image Header */}
      {news.imagenUrl && (
        <div className="relative h-48 bg-gradient-liga1">
          <img
            src={news.imagenUrl}
            alt={news.titulo}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 right-4">
            <Badge
              variant={news.publicada ? 'default' : 'secondary'}
              className={news.publicada ? 'bg-gradient-success border-0 shadow-soft' : ''}
            >
              {news.publicada ? 'Publicada' : 'Borrador'}
            </Badge>
          </div>
        </div>
      )}

      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-[#344767] line-clamp-2 mb-2">
              {news.titulo}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {news.contenido}
            </CardDescription>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#e9ecef]">
          <div className="flex items-center gap-2 text-xs text-[#67748e]">
            <Clock className="h-4 w-4" />
            {format(news.fechaPublicacion, "dd MMM yyyy 'a las' HH:mm", { locale: es })}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
