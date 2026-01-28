/**
 * Componente MatchLiveController
 * Controla el estado del partido: iniciar, editar marcador y finalizar
 */

'use client';

import { useState, useEffect } from 'react';
import { Match, EstadoMatch, canFinishMatch, shouldEnterHalftime, getMatchElapsedMinutes } from '@/domain/entities/match.entity';
import { MatchStateService } from '@/domain/services/match-state.service';
import { Button } from '@/components/ui/button';
import { MatchScoreEditor } from './match-score-editor';
import { LiveMatchTimer } from './live-match-timer';
import { AddTimeConfig } from './add-time-config';
import { AddFirstHalfTimeConfig } from './add-first-half-time-config';
import { PushNotificationModal } from './push-notification-modal';
import { Play, Square, Loader2, Bell, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { TorneoType } from '@/core/config/firestore-constants';

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
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

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

  const handleResumeSecondHalf = async () => {
    if (!match.enDescanso) {
      toast.error('El partido no está en descanso');
      return;
    }

    setIsProcessing(true);
    try {
      await matchStateService.resumeSecondHalf(jornadaId, match.id);
      toast.success('Segunda parte iniciada');
      onStateChange?.();
    } catch (error: any) {
      console.error('Error al reanudar segunda parte:', error);
      toast.error(error?.message || 'Error al reanudar la segunda parte');
    } finally {
      setIsProcessing(false);
    }
  };

  // Detectar cuando se llega a 45 minutos y pausar automáticamente
  useEffect(() => {
    if (match.estado === 'envivo' && !match.enDescanso && match.primeraParte) {
      const checkHalftime = async () => {
        const minutosTranscurridos = getMatchElapsedMinutes(match);
        const tiempoAgregadoPrimera = match.tiempoAgregadoPrimeraParte || 0;
        
        // Si llegó exactamente a 45 minutos (o un poco más) y no tiene tiempo agregado configurado, pausar automáticamente
        if (minutosTranscurridos >= 45 && tiempoAgregadoPrimera === 0 && !match.enDescanso) {
          try {
            await matchStateService.updateFirstHalfAddedTime(jornadaId, match.id, 0);
            toast.info('Primer tiempo finalizado. Configura los minutos adicionales y reanuda la segunda parte.');
            onStateChange?.();
          } catch (error: any) {
            console.error('Error al pausar partido en descanso:', error);
          }
        }
      };

      // Verificar cada 5 segundos para detectar más rápido cuando llega a 45 minutos
      const interval = setInterval(checkHalftime, 5000);
      return () => clearInterval(interval);
    }
  }, [match, jornadaId, matchStateService, onStateChange]);

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
    const tiempoAgregadoPrimera = match.tiempoAgregadoPrimeraParte || 0;
    const canFinish = canFinishMatch(match);
    
    // Lógica para el primer tiempo: mostrar automáticamente cuando llega a 45 minutos
    const estaEnPrimeraParte = match.primeraParte && !match.enDescanso;
    const estaCercaDe45Minutos = minutosTranscurridos >= 42 && minutosTranscurridos < 45 && estaEnPrimeraParte;
    const haLlegadoA45Minutos = minutosTranscurridos >= 45 && estaEnPrimeraParte;
    // Mostrar automáticamente cuando llega a 45 minutos o está cerca
    const necesitaConfigurarTiempoAgregadoPrimera = (estaCercaDe45Minutos || haLlegadoA45Minutos) && tiempoAgregadoPrimera === 0;
    const tiempoAgregadoPrimeraNoCompletado = haLlegadoA45Minutos && tiempoAgregadoPrimera > 0 && minutosTranscurridos < (45 + tiempoAgregadoPrimera);
    
    // Lógica para el segundo tiempo: mostrar automáticamente cuando llega a 90 minutos
    const estaEnSegundaParte = !match.primeraParte && !match.enDescanso;
    const estaCercaDe90Minutos = minutosTranscurridos >= 87 && minutosTranscurridos < 90 && estaEnSegundaParte;
    const haLlegadoA90Minutos = minutosTranscurridos >= 90 && estaEnSegundaParte;
    // Mostrar automáticamente cuando llega a 90 minutos o está cerca
    const necesitaConfigurarTiempoAgregado = (estaCercaDe90Minutos || haLlegadoA90Minutos) && tiempoAgregado === 0;
    const tiempoAgregadoNoCompletado = haLlegadoA90Minutos && tiempoAgregado > 0 && minutosTranscurridos < (90 + tiempoAgregado);

    // Debug: Log para verificar valores
    console.log('MatchLiveController - Estado:', {
      minutosTranscurridos,
      tiempoAgregado,
      tiempoAgregadoPrimera,
      tiempoRequerido: 90 + tiempoAgregado,
      canFinish,
      haLlegadoA90Minutos,
      estaCercaDe90Minutos,
      necesitaConfigurarTiempoAgregado,
      tiempoAgregadoNoCompletado,
      enDescanso: match.enDescanso,
      primeraParte: match.primeraParte,
      estaEnPrimeraParte,
      estaCercaDe45Minutos,
      haLlegadoA45Minutos,
      necesitaConfigurarTiempoAgregadoPrimera,
    });

    // Si está en descanso, mostrar controles para reanudar segunda parte
    if (match.enDescanso) {
      // Debug: Log para verificar valores en descanso
      console.log('MatchLiveController - En Descanso:', {
        tiempoAgregadoPrimera,
        enDescanso: match.enDescanso,
        primeraParte: match.primeraParte,
        matchId: match.id,
      });

      return (
        <>
          <div className="flex flex-col gap-3">
            {/* Timer mostrando descanso */}
            <div className="flex items-center justify-center">
              <LiveMatchTimer match={match} />
            </div>

            {/* Mensaje informativo */}
            <div className="text-center p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-semibold text-yellow-800">
                ⏸️ Partido en Descanso
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Configura los minutos adicionales del primer tiempo y luego reanuda la segunda parte
              </p>
            </div>

            {/* Control de Minutos Adicionales del Primer Tiempo - SIEMPRE mostrar si está en descanso */}
            <AddFirstHalfTimeConfig
              jornadaId={jornadaId}
              matchId={match.id}
              currentAddedTime={tiempoAgregadoPrimera}
              matchStateService={matchStateService}
              onTimeUpdated={onStateChange}
            />

            {/* Botón para Reanudar Segunda Parte - Mostrar si ya tiene tiempo agregado configurado */}
            {tiempoAgregadoPrimera > 0 && (
              <div className="flex items-center justify-center pt-2">
                <Button
                  onClick={handleResumeSecondHalf}
                  disabled={isProcessing}
                  className="bg-gradient-liga1 hover:opacity-90 w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Reanudando...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-5 w-5 mr-2" />
                      Reanudar Segunda Parte
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Mensaje si aún no se ha configurado tiempo adicional */}
            {tiempoAgregadoPrimera === 0 && (
              <div className="text-center p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  💡 Ingresa los minutos adicionales del primer tiempo (puede ser 0) y haz clic en "Guardar" para continuar
                </p>
              </div>
            )}

            {/* Editor de Marcador (solo lectura durante descanso) */}
            <div className="flex items-center justify-center pt-2 border-t border-[#e9ecef]">
              <MatchScoreEditor
                match={match}
                onScoreChange={handleScoreChange}
                disabled={true}
              />
            </div>
          </div>
        </>
      );
    }
    
    return (
      <>
        <div className="flex flex-col gap-3">
          {/* Timer, Control de Minutos Adicionales y Botón Finalizar */}
          <div className={`flex flex-col gap-3 ${
            canFinish || necesitaConfigurarTiempoAgregado || tiempoAgregadoNoCompletado || necesitaConfigurarTiempoAgregadoPrimera || tiempoAgregadoPrimeraNoCompletado
              ? '' 
              : ''
          }`}>
            <div className="flex items-center justify-center gap-2">
              <LiveMatchTimer match={match} />
            </div>
            
            {/* Control de Minutos Adicionales del Primer Tiempo - Mostrar 3 min antes de 45 */}
            {(necesitaConfigurarTiempoAgregadoPrimera || tiempoAgregadoPrimeraNoCompletado) && (
              <div className="flex items-center justify-center">
                <AddFirstHalfTimeConfig
                  jornadaId={jornadaId}
                  matchId={match.id}
                  currentAddedTime={tiempoAgregadoPrimera}
                  matchStateService={matchStateService}
                  onTimeUpdated={onStateChange}
                />
              </div>
            )}
            
            {/* Control de Minutos Adicionales del Segundo Tiempo - Mostrar 3 min antes de 90 */}
            {(necesitaConfigurarTiempoAgregado || tiempoAgregadoNoCompletado) && !canFinish && estaEnSegundaParte && (
              <div className="flex items-center justify-center">
                <AddTimeConfig
                  jornadaId={jornadaId}
                  matchId={match.id}
                  currentAddedTime={tiempoAgregado}
                  matchStateService={matchStateService}
                  onTimeUpdated={onStateChange}
                />
              </div>
            )}
            
            {/* Botón Finalizar (solo visible después de 90 + tiempo agregado) */}
            {canFinish && (
              <div className="flex items-center justify-center">
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
              </div>
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

          {/* Botón para Enviar Notificaciones Push */}
          <div className="flex items-center justify-center pt-2 border-t border-[#e9ecef]">
            <Button
              onClick={() => setIsNotificationModalOpen(true)}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Bell className="h-4 w-4 mr-2" />
              Enviar Notificación Push
            </Button>
          </div>
        </div>

        {/* Modal de Notificaciones Push */}
        <PushNotificationModal
          open={isNotificationModalOpen}
          onOpenChange={setIsNotificationModalOpen}
          match={match}
        />
      </>
    );
  }

  // Estado: Finalizado u otros - No mostrar controles
  return null;
}
