/**
 * Componente MatchLiveController
 * Controla el estado del partido: iniciar, editar marcador y finalizar
 */

'use client';

import { useState } from 'react';
import { Match, EstadoMatch, canFinishMatch } from '@/domain/entities/match.entity';
import { MatchStateService } from '@/domain/services/match-state.service';
import { Button } from '@/components/ui/button';
import { MatchScoreEditor } from './match-score-editor';
import { LiveMatchTimer } from './live-match-timer';
import { AddTimeConfig } from './add-time-config';
import { Play, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TorneoType } from '@/core/config/firestore-constants';
import { getMatchElapsedMinutes } from '@/domain/entities/match.entity';

interface MatchLiveControllerProps {
  match: Match;
  jornadaId: string;
  torneo: TorneoType;
  matchStateService: MatchStateService;
  onStateChange?: () => void;
}

export function MatchLiveController({
  match,
  jornadaId,
  torneo,
  matchStateService,
  onStateChange,
}: MatchLiveControllerProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStartMatch = async () => {
    if (match.estado !== 'pendiente') {
      toast.error('Solo se puede iniciar un partido en estado pendiente');
      return;
    }

    setIsProcessing(true);
    try {
      await matchStateService.startMatch(jornadaId, match.id, torneo);
      toast.success('Partido iniciado exitosamente');
      onStateChange?.();
    } catch (error: any) {
      console.error('Error al iniciar partido:', error);
      toast.error(error?.message || 'Error al iniciar el partido');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinishMatch = async () => {
    if (match.estado !== 'envivo') {
      toast.error('Solo se puede finalizar un partido en vivo');
      return;
    }

    if (!canFinishMatch(match)) {
      toast.error('El partido debe tener mínimo 90 minutos transcurridos');
      return;
    }

    setIsProcessing(true);
    try {
      await matchStateService.finishMatch(jornadaId, match.id, torneo);
      toast.success('Partido finalizado exitosamente');
      onStateChange?.();
    } catch (error: any) {
      console.error('Error al finalizar partido:', error);
      toast.error(error?.message || 'Error al finalizar el partido');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScoreChange = async (local: number, visitor: number) => {
    try {
      await matchStateService.updateMatchScore(jornadaId, match.id, local, visitor, torneo);
      onStateChange?.();
    } catch (error: any) {
      console.error('Error al actualizar marcador:', error);
      toast.error(error?.message || 'Error al actualizar el marcador');
      throw error; // Re-lanzar para que MatchScoreEditor maneje el error
    }
  };

  // Estado: Pendiente - Mostrar botón para iniciar
  if (match.estado === 'pendiente') {
    return (
      <div className="flex items-center gap-2">
        <Button
          onClick={handleStartMatch}
          disabled={isProcessing}
          className="bg-gradient-liga1 hover:opacity-90"
          size="sm"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Iniciando...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Iniciar Partido
            </>
          )}
        </Button>
      </div>
    );
  }

  // Estado: En Vivo - Mostrar minutero, editor de marcador y botón para finalizar
  if (match.estado === 'envivo') {
    const minutosTranscurridos = getMatchElapsedMinutes(match);
    const tiempoAgregado = match.tiempoAgregado || 0;
    const canFinish = canFinishMatch(match);
    const haLlegadoA90Minutos = minutosTranscurridos >= 90;
    const necesitaConfigurarTiempoAgregado = haLlegadoA90Minutos && tiempoAgregado === 0;
    const tiempoAgregadoNoCompletado = haLlegadoA90Minutos && tiempoAgregado > 0 && minutosTranscurridos < (90 + tiempoAgregado);

    // Debug: Log para verificar valores
    console.log('MatchLiveController - Estado:', {
      minutosTranscurridos,
      tiempoAgregado,
      tiempoRequerido: 90 + tiempoAgregado,
      canFinish,
      haLlegadoA90Minutos,
      necesitaConfigurarTiempoAgregado,
      tiempoAgregadoNoCompletado,
    });
    
    return (
      <div className="flex flex-col gap-3">
        {/* Timer, Control de Minutos Adicionales y Botón Finalizar */}
        <div className={`flex items-center gap-2 ${
          canFinish || necesitaConfigurarTiempoAgregado || tiempoAgregadoNoCompletado 
            ? 'justify-between' 
            : 'justify-center'
        }`}>
          <div className="flex items-center gap-2">
            <LiveMatchTimer match={match} />
            
            {/* Control de Minutos Adicionales (a la derecha del minutero) */}
            {(necesitaConfigurarTiempoAgregado || tiempoAgregadoNoCompletado) && !canFinish && (
              <AddTimeConfig
                jornadaId={jornadaId}
                matchId={match.id}
                currentAddedTime={tiempoAgregado}
                matchStateService={matchStateService}
                onTimeUpdated={onStateChange}
              />
            )}
          </div>
          
          {/* Botón Finalizar (solo visible después de 90 + tiempo agregado) */}
          {canFinish && (
            <Button
              onClick={handleFinishMatch}
              disabled={isProcessing}
              variant="destructive"
              size="sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Finalizar Partido
                </>
              )}
            </Button>
          )}
        </div>

        {/* Editor de Marcador */}
        <div className="flex items-center justify-center">
          <MatchScoreEditor
            match={match}
            onScoreChange={handleScoreChange}
            disabled={isProcessing}
          />
        </div>
      </div>
    );
  }

  // Estado: Finalizado u otros - No mostrar controles
  return null;
}
