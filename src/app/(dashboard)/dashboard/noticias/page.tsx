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
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NewsItem } from '@/domain/entities/news.entity';
import { NewsRepository } from '@/data/repositories/news.repository';
import { Newspaper, Eye, Clock, CheckCircle2, Plus, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const newsRepository = new NewsRepository();

export default function NoticiasPage() {
  const { loading: authLoading } = useRequireAuth();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadNews = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Cargando noticias desde Firestore...');
      const data = await newsRepository.fetchAllNews();
      console.log(`Noticias cargadas: ${data.length}`);
      setNews(data);
    } catch (error: any) {
      console.error('Error al cargar noticias:', error);
      setError(error?.message || 'Error desconocido al cargar noticias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadNews();
    }
  }, [authLoading]);

  const handleCreateNews = async (formData: {
    title: string;
    image?: string;
    categoria?: NewsItem['categoria'];
    destacada: boolean;
    periodico?: string;
    url?: string;
  }) => {
    try {
      setIsCreating(true);
      const newNews: Omit<NewsItem, 'id'> = {
        titulo: formData.title,
        contenido: formData.title, // Usar el título como contenido por defecto
        imagenUrl: formData.image,
        categoria: formData.categoria || 'general',
        fechaPublicacion: new Date(), // Fecha actual
        publicada: formData.destacada,
        autor: formData.periodico,
        urlExterna: formData.url,
      };
      
      await newsRepository.createNews(newNews);
      toast.success('Noticia creada exitosamente');
      setOpenDialog(false);
      
      // Recargar noticias
      await loadNews();
    } catch (error: any) {
      console.error('Error al crear noticia:', error);
      toast.error('Error al crear la noticia: ' + (error?.message || 'Error desconocido'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateNews = async (newsId: string, formData: {
    title: string;
    image?: string;
    categoria?: NewsItem['categoria'];
    destacada: boolean;
    periodico?: string;
    url?: string;
  }) => {
    try {
      setIsUpdating(true);
      const updates: Partial<NewsItem> = {
        titulo: formData.title,
        contenido: formData.title, // Usar el título como contenido
        imagenUrl: formData.image,
        categoria: formData.categoria || 'general',
        publicada: formData.destacada,
        autor: formData.periodico,
        urlExterna: formData.url,
      };
      
      await newsRepository.updateNews(newsId, updates);
      toast.success('Noticia actualizada exitosamente');
      setOpenEditDialog(false);
      setEditingNews(null);
      
      // Recargar noticias
      await loadNews();
    } catch (error: any) {
      console.error('Error al actualizar noticia:', error);
      toast.error('Error al actualizar la noticia: ' + (error?.message || 'Error desconocido'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditClick = (newsItem: NewsItem) => {
    setEditingNews(newsItem);
    setOpenEditDialog(true);
  };

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
        actions={
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-liga1 hover:opacity-90">
                <Plus className="h-4 w-4" />
                Agregar Noticia
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Crear Nueva Noticia</DialogTitle>
              </DialogHeader>
              <CreateNewsForm 
                onSubmit={handleCreateNews} 
                isSubmitting={isCreating}
                key={openDialog ? 'open' : 'closed'} // Resetear formulario cuando se abre/cierra
              />
            </DialogContent>
          </Dialog>
        }
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

      {/* Mensaje de Error */}
      {error && (
        <Card className="shadow-soft border-0 border-l-4 border-red-500 mb-6">
          <CardContent className="py-4">
            <div className="text-center text-red-600">
              <p className="font-semibold">Error al cargar noticias</p>
              <p className="text-sm mt-1">{error}</p>
              <p className="text-xs mt-2 text-[#67748e]">Revisa la consola del navegador para más detalles</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Noticias */}
      {news.length === 0 && !loading ? (
        <Card className="shadow-soft border-0">
          <CardContent className="py-12">
            <div className="text-center text-[#67748e]">
              <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay noticias disponibles</p>
              {!error && (
                <p className="text-sm mt-2">Verifica que existan noticias en la colección "news" de Firestore</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((item) => (
              <NewsCard key={item.id} news={item} onEdit={handleEditClick} />
            ))}
          </div>

          {/* Dialog para editar noticia */}
          <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Editar Noticia</DialogTitle>
              </DialogHeader>
              {editingNews && (
                <EditNewsForm 
                  news={editingNews}
                  onSubmit={(data) => handleUpdateNews(editingNews.id, data)} 
                  isSubmitting={isUpdating}
                  key={editingNews.id}
                />
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </DashboardLayout>
  );
}

interface NewsCardProps {
  news: NewsItem;
  onEdit: (news: NewsItem) => void;
}

function NewsCard({ news, onEdit }: NewsCardProps) {
  return (
    <Card className="shadow-soft border-0 hover:shadow-soft-lg transition-shadow overflow-hidden p-0 h-[350px] flex flex-col">
      {/* Image Header */}
      {news.imagenUrl && (
        <div className="relative h-[222px] bg-gradient-liga1 rounded-t-xl overflow-hidden flex-shrink-0">
          <img
            src={news.imagenUrl}
            alt={news.titulo}
            className="w-full h-full object-cover rounded-t-xl"
          />
          <div className="absolute top-4 left-4">
            <Badge
              variant={news.publicada ? 'default' : 'secondary'}
              className={news.publicada ? 'bg-gradient-success border-0 shadow-soft' : ''}
            >
              {news.publicada ? 'Publicada' : 'Borrador'}
            </Badge>
          </div>
          <div className="absolute top-4 right-4">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-white/90 hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(news);
              }}
            >
              <Pencil className="h-4 w-4 text-[#344767]" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 px-6 pt-2 pb-4 justify-between">
        <CardTitle className="text-[#344767] line-clamp-3">
          {news.titulo}
        </CardTitle>
        
        {/* Meta Info - Fija en la parte inferior */}
        <div className="flex items-center gap-2 text-xs text-[#67748e] mt-auto pt-2">
          <Clock className="h-4 w-4" />
          <span>{format(news.fechaPublicacion, "dd MMM yyyy 'a las' HH:mm", { locale: es })}</span>
        </div>
      </div>
    </Card>
  );
}

interface CreateNewsFormProps {
  onSubmit: (data: {
    title: string;
    image?: string;
    categoria?: NewsItem['categoria'];
    destacada: boolean;
    periodico?: string;
    url?: string;
  }) => void;
  isSubmitting: boolean;
}

function CreateNewsForm({ onSubmit, isSubmitting }: CreateNewsFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    image: '',
    categoria: 'general' as NewsItem['categoria'],
    destacada: false,
    periodico: '',
    url: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('El título es requerido');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Título de la noticia"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">URL de Imagen</Label>
        <Input
          id="image"
          type="url"
          value={formData.image}
          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
          placeholder="https://ejemplo.com/imagen.jpg"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoria">Categoría</Label>
        <Select
          value={formData.categoria}
          onValueChange={(value) => setFormData({ ...formData, categoria: value as NewsItem['categoria'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="resultado">Resultado</SelectItem>
            <SelectItem value="fixture">Fixture</SelectItem>
            <SelectItem value="tabla">Tabla de Posiciones</SelectItem>
            <SelectItem value="comunicado">Comunicado Oficial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="periodico">Periódico/Fuente</Label>
        <Input
          id="periodico"
          value={formData.periodico}
          onChange={(e) => setFormData({ ...formData, periodico: e.target.value })}
          placeholder="Nombre del periódico o fuente"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">URL Externa</Label>
        <Input
          id="url"
          type="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="https://ejemplo.com/noticia"
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="destacada"
          checked={formData.destacada}
          onChange={(e) => setFormData({ ...formData, destacada: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <Label htmlFor="destacada" className="cursor-pointer">
          Noticia destacada (publicada)
        </Label>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setFormData({
              title: '',
              image: '',
              categoria: 'general',
              destacada: false,
              periodico: '',
              url: '',
            });
          }}
          disabled={isSubmitting}
        >
          Limpiar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-gradient-liga1">
          {isSubmitting ? 'Creando...' : 'Crear Noticia'}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface EditNewsFormProps {
  news: NewsItem;
  onSubmit: (data: {
    title: string;
    image?: string;
    categoria?: NewsItem['categoria'];
    destacada: boolean;
    periodico?: string;
    url?: string;
  }) => void;
  isSubmitting: boolean;
}

function EditNewsForm({ news, onSubmit, isSubmitting }: EditNewsFormProps) {
  const [formData, setFormData] = useState({
    title: news.titulo || '',
    image: news.imagenUrl || '',
    categoria: news.categoria || 'general' as NewsItem['categoria'],
    destacada: news.publicada || false,
    periodico: news.autor || '',
    url: news.urlExterna || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('El título es requerido');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-title">Título *</Label>
        <Input
          id="edit-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Título de la noticia"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-image">URL de Imagen</Label>
        <Input
          id="edit-image"
          type="url"
          value={formData.image}
          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
          placeholder="https://ejemplo.com/imagen.jpg"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-categoria">Categoría</Label>
        <Select
          value={formData.categoria}
          onValueChange={(value) => setFormData({ ...formData, categoria: value as NewsItem['categoria'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="resultado">Resultado</SelectItem>
            <SelectItem value="fixture">Fixture</SelectItem>
            <SelectItem value="tabla">Tabla de Posiciones</SelectItem>
            <SelectItem value="comunicado">Comunicado Oficial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-periodico">Periódico/Fuente</Label>
        <Input
          id="edit-periodico"
          value={formData.periodico}
          onChange={(e) => setFormData({ ...formData, periodico: e.target.value })}
          placeholder="Nombre del periódico o fuente"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-url">URL Externa</Label>
        <Input
          id="edit-url"
          type="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="https://ejemplo.com/noticia"
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="edit-destacada"
          checked={formData.destacada}
          onChange={(e) => setFormData({ ...formData, destacada: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <Label htmlFor="edit-destacada" className="cursor-pointer">
          Noticia destacada (publicada)
        </Label>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setFormData({
              title: news.titulo || '',
              image: news.imagenUrl || '',
              categoria: news.categoria || 'general',
              destacada: news.publicada || false,
              periodico: news.autor || '',
              url: news.urlExterna || '',
            });
          }}
          disabled={isSubmitting}
        >
          Restaurar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-gradient-liga1">
          {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </DialogFooter>
    </form>
  );
}
