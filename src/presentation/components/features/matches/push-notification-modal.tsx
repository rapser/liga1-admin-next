/**
 * Modal para enviar Push Notifications desde un partido en vivo
 */

'use client';

import { useState } from 'react';
import { Match, getMatchElapsedMinutes } from '@/domain/entities/match.entity';
import { PushNotificationService } from '@/domain/services/push-notification.service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { getTeamFullName } from '@/core/config/firestore-constants';
import { getTeamTopic, GENERAL_TOPIC } from '@/core/config/fcm-topics';

interface PushNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: Match;
}

type NotificationType =
  | 'goal'
  | 'match_start'
  | 'match_end'
  | 'red_card'
  | 'custom'
  | 'general_news';

export function PushNotificationModal({
  open,
  onOpenChange,
  match,
}: PushNotificationModalProps) {
  const [notificationType, setNotificationType] = useState<NotificationType>('goal');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [scorer, setScorer] = useState('');
  const [player, setPlayer] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [isSending, setIsSending] = useState(false);

  const pushNotificationService = new PushNotificationService();

  // Obtener códigos de equipos
  const localTeamCode = match.equipoLocalId || '';
  const visitorTeamCode = match.equipoVisitanteId || '';
  const localTeamName = localTeamCode ? getTeamFullName(localTeamCode) : '';
  const visitorTeamName = visitorTeamCode ? getTeamFullName(visitorTeamCode) : '';

  // Inicializar equipo seleccionado cuando cambia el tipo de notificación
  const handleNotificationTypeChange = (type: NotificationType) => {
    setNotificationType(type);
    if (type === 'goal' || type === 'red_card') {
      // Por defecto seleccionar el equipo local
      setSelectedTeam(localTeamCode);
    } else {
      setSelectedTeam('');
    }
  };

  const handleSend = async () => {
    if (isSending) return;

    try {
      setIsSending(true);

      switch (notificationType) {
        case 'goal': {
          if (!selectedTeam) {
            toast.error('Debes seleccionar un equipo');
            return;
          }
          await pushNotificationService.sendGoalNotification(
            match,
            selectedTeam,
            scorer || undefined
          );
          toast.success('Notificación de gol enviada exitosamente');
          break;
        }

        case 'match_start': {
          await pushNotificationService.sendMatchStartNotification(match);
          toast.success('Notificación de inicio de partido enviada exitosamente');
          break;
        }

        case 'match_end': {
          await pushNotificationService.sendMatchEndNotification(match);
          toast.success('Notificación de resultado final enviada exitosamente');
          break;
        }

        case 'red_card': {
          if (!selectedTeam || !player) {
            toast.error('Debes seleccionar un equipo e ingresar el nombre del jugador');
            return;
          }
          await pushNotificationService.sendRedCardNotification(
            match,
            selectedTeam,
            player
          );
          toast.success('Notificación de tarjeta roja enviada exitosamente');
          break;
        }

        case 'custom': {
          if (!customTopic || !customTitle || !customBody) {
            toast.error('Debes completar todos los campos');
            return;
          }
          await pushNotificationService.sendCustomNotification(
            customTopic,
            customTitle,
            customBody,
            'news'
          );
          toast.success('Notificación personalizada enviada exitosamente');
          break;
        }

        case 'general_news': {
          if (!customTitle || !customBody) {
            toast.error('Debes ingresar título y cuerpo');
            return;
          }
          await pushNotificationService.sendGeneralNotification(
            customTitle,
            customBody
          );
          toast.success('Notificación general enviada exitosamente');
          break;
        }
      }

      // Resetear formulario y cerrar modal
      setNotificationType('goal');
      setSelectedTeam('');
      setScorer('');
      setPlayer('');
      setCustomTitle('');
      setCustomBody('');
      setCustomTopic('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error al enviar notificación:', error);
      toast.error(error?.message || 'Error al enviar la notificación');
    } finally {
      setIsSending(false);
    }
  };

  const canSend = () => {
    switch (notificationType) {
      case 'goal':
        return !!selectedTeam;
      case 'match_start':
      case 'match_end':
        return true;
      case 'red_card':
        return !!selectedTeam && !!player;
      case 'custom':
        return !!customTopic && !!customTitle && !!customBody;
      case 'general_news':
        return !!customTitle && !!customBody;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Enviar Notificación Push
          </DialogTitle>
          <DialogDescription>
            Envía una notificación push a los usuarios suscritos a los topics correspondientes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tipo de Notificación */}
          <div className="space-y-2">
            <Label htmlFor="notification-type">Tipo de Notificación</Label>
            <Select
              value={notificationType}
              onValueChange={(value) => handleNotificationTypeChange(value as NotificationType)}
            >
              <SelectTrigger id="notification-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="goal">⚽ Gol</SelectItem>
                <SelectItem value="match_start">🎯 Inicio de Partido</SelectItem>
                <SelectItem value="match_end">⏱️ Resultado Final</SelectItem>
                <SelectItem value="red_card">🟥 Tarjeta Roja</SelectItem>
                <SelectItem value="general_news">📰 Noticia General</SelectItem>
                <SelectItem value="custom">🔧 Personalizada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selección de Equipo (para gol y tarjeta roja) */}
          {(notificationType === 'goal' || notificationType === 'red_card') && (
            <div className="space-y-2">
              <Label htmlFor="team">Equipo</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger id="team">
                  <SelectValue placeholder="Selecciona un equipo" />
                </SelectTrigger>
                <SelectContent>
                  {localTeamCode && (
                    <SelectItem value={localTeamCode}>{localTeamName}</SelectItem>
                  )}
                  {visitorTeamCode && (
                    <SelectItem value={visitorTeamCode}>{visitorTeamName}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Campo de Goleador (para gol) */}
          {notificationType === 'goal' && (
            <div className="space-y-2">
              <Label htmlFor="scorer">Goleador (Opcional)</Label>
              <Input
                id="scorer"
                placeholder="Ej: Hernán Barcos"
                value={scorer}
                onChange={(e) => setScorer(e.target.value)}
              />
            </div>
          )}

          {/* Campo de Jugador (para tarjeta roja) */}
          {notificationType === 'red_card' && (
            <div className="space-y-2">
              <Label htmlFor="player">Jugador Expulsado *</Label>
              <Input
                id="player"
                placeholder="Ej: Paolo Hurtado"
                value={player}
                onChange={(e) => setPlayer(e.target.value)}
                required
              />
            </div>
          )}

          {/* Campos para Notificación Personalizada */}
          {notificationType === 'custom' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="custom-topic">Topic *</Label>
                <Input
                  id="custom-topic"
                  placeholder="Ej: team_ali, liga1_all"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Formatos: team_ali, team_uni, liga1_all, etc.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-title">Título *</Label>
                <Input
                  id="custom-title"
                  placeholder="Título de la notificación"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  maxLength={50}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-body">Cuerpo *</Label>
                <Input
                  id="custom-body"
                  placeholder="Texto de la notificación"
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  maxLength={150}
                  required
                />
              </div>
            </>
          )}

          {/* Campos para Noticia General */}
          {notificationType === 'general_news' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="news-title">Título *</Label>
                <Input
                  id="news-title"
                  placeholder="Título de la noticia"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  maxLength={50}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="news-body">Cuerpo *</Label>
                <Input
                  id="news-body"
                  placeholder="Texto de la noticia"
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  maxLength={150}
                  required
                />
              </div>
            </>
          )}

          {/* Información del Partido (solo lectura) */}
          {(notificationType === 'match_start' || notificationType === 'match_end') && (
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <p className="text-sm font-medium">Partido:</p>
              <p className="text-sm text-muted-foreground">
                {localTeamName} vs {visitorTeamName}
              </p>
              <p className="text-sm text-muted-foreground">
                Marcador: {match.golesEquipoLocal} - {match.golesEquipoVisitante}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={!canSend() || isSending}
            className="bg-gradient-liga1 hover:opacity-90"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Enviar Notificación
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
