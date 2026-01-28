/**
 * Componente MatchLiveController
 * Controla el estado del partido: iniciar, editar marcador y finalizar
 */

'use client';

import { useState, useEffect } from 'react';
import { Match, canFinishMatch, getMatchElapsedMinutes } from '@/domain/entities/match.entity';
import { MatchStateService } from '@/domain/services/match-state.service';
import { Button } from '@/components/ui/button';
import { MatchScoreEditor } from './match-score-editor';
import { LiveMatchTimer } from './live-match-timer';
import { AddTimeConfig } from './add-time-config';
import { AddFirstHalfTimeConfig } from './add-first-half-time-config';
import { PushNotificationModal } from './push-notification-modal';
import { useMatchTimer } from '@/presentation/hooks/use-match-timer';
import { Play, Square, Loader2, Bell, PlayCircle, Pause } from 'lucide-react';
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

  // Usar el hook useMatchTimer que actualiza cada segundo para detectar automáticamente
  // cuando se llega a los minutos clave (40, 45, 85, 90) sin refrescar datos del servidor
  // Esto hace que los minutos adicionales aparezcan automáticamente
  const { minutoActual } = useMatchTimer(
    match.estado === 'envivo' ? match : null,
    1000 // Actualizar cada segundo para detectar los minutos clave de forma precisa
  );

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

  // Detectar cuando se completan los 45 + minutos adicionales y poner en descanso automáticamente
  useEffect(() => {
    if (match.estado === 'envivo' && !match.enDescanso && match.primeraParte) {
      const checkFirstHalfCompletion = async () => {
        const minutosTranscurridos = getMatchElapsedMinutes(match);
        const tiempoAgregadoPrimera = match.tiempoAgregadoPrimeraParte || 0;
        
        // Si ya se configuraron minutos adicionales y se completaron los 45 + minutos adicionales
        if (tiempoAgregadoPrimera > 0 && minutosTranscurridos >= (45 + tiempoAgregadoPrimera)) {
          try {
            // Poner en descanso automáticamente
            await matchStateService.finishFirstHalf(jornadaId, match.id);
            toast.info('Primer tiempo completado. El partido está en descanso.');
            onStateChange?.();
          } catch (error: any) {
            console.error('Error al poner partido en descanso:', error);
          }
        }
      };

      // Verificar cada 5 segundos para detectar cuando se completan los minutos
      const interval = setInterval(checkFirstHalfCompletion, 5000);
      return () => clearInterval(interval);
    }
  }, [match, jornadaId, matchStateService, onStateChange]);

  const handleFinishFirstHalf = async () => {
    if (match.estado !== 'envivo') {
      toast.error('Solo se puede finalizar el primer tiempo de un partido en vivo');
      return;
    }

    if (!match.primeraParte || match.enDescanso) {
      toast.error('El partido no está en primera parte');
      return;
    }

    setIsProcessing(true);
    try {
      await matchStateService.finishFirstHalf(jornadaId, match.id);
      toast.success('Primer tiempo finalizado');
      onStateChange?.();
    } catch (error: any) {
      console.error('Error al finalizar primer tiempo:', error);
      toast.error(error?.message || 'Error al finalizar el primer tiempo');
    } finally {
      setIsProcessing(false);
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
    // Usar minutoActual del hook que se actualiza cada segundo, o calcular si no está disponible
    // Esto asegura que los minutos adicionales aparezcan automáticamente cuando se llega a 40 y 85 minutos
    const minutosTranscurridos = minutoActual > 0 ? minutoActual : getMatchElapsedMinutes(match);
    const tiempoAgregado = match.tiempoAgregado || 0;
    const tiempoAgregadoPrimera = match.tiempoAgregadoPrimeraParte || 0;
    const canFinish = canFinishMatch(match);
    
    // Lógica para el primer tiempo: mostrar minutos adicionales 5 minutos antes de llegar a 45 (minuto 40)
    const estaEnPrimeraParte = match.primeraParte && !match.enDescanso;
    const estaCercaDe45Minutos = minutosTranscurridos >= 40 && estaEnPrimeraParte;
    // Mostrar cuando está a 5 minutos antes de 45 o después, solo si no tiene tiempo agregado configurado
    const necesitaConfigurarTiempoAgregadoPrimera = estaCercaDe45Minutos && tiempoAgregadoPrimera === 0;
    // El primer tiempo puede finalizarse cuando han pasado 45 minutos + minutos adicionales configurados (si los hay)
    const puedeFinalizarPrimerTiempo = estaEnPrimeraParte && minutosTranscurridos >= (45 + tiempoAgregadoPrimera);
    // Verificar si ya se completaron los 45 + minutos adicionales para entrar en descanso automáticamente
    const haCompletadoPrimerTiempo = estaEnPrimeraParte && tiempoAgregadoPrimera > 0 && minutosTranscurridos >= (45 + tiempoAgregadoPrimera);
    
    // Lógica para el segundo tiempo: mostrar minutos adicionales 5 minutos antes de llegar a 90 (minuto 85)
    const estaEnSegundaParte = !match.primeraParte && !match.enDescanso;
    const estaCercaDe90Minutos = minutosTranscurridos >= 85 && estaEnSegundaParte;
    // Mostrar cuando está a 5 minutos antes de 90 o después, solo si no tiene tiempo agregado configurado
    const necesitaConfigurarTiempoAgregado = estaCercaDe90Minutos && tiempoAgregado === 0;


    // Si está en descanso, mostrar controles para reanudar segunda parte
    if (match.enDescanso) {
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

            {/* Botón para Reanudar Segunda Parte - Siempre mostrar */}
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
          {/* Timer, Control de Minutos Adicionales y Botones de Finalizar */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center gap-2">
              <LiveMatchTimer match={match} />
            </div>
            
            {/* Control de Minutos Adicionales del Primer Tiempo - Mostrar 5 min antes de 45 (minuto 40) */}
            {necesitaConfigurarTiempoAgregadoPrimera && (
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

            {/* Mostrar progreso cuando se configuraron minutos adicionales pero aún no se completaron */}
            {estaEnPrimeraParte && tiempoAgregadoPrimera > 0 && minutosTranscurridos < (45 + tiempoAgregadoPrimera) && (
              <div className="text-center p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-800">
                  ⏱️ Minutos adicionales configurados: {tiempoAgregadoPrimera}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Progreso: {minutosTranscurridos} / {45 + tiempoAgregadoPrimera} minutos
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  El partido entrará en descanso automáticamente al completar los {45 + tiempoAgregadoPrimera} minutos
                </p>
              </div>
            )}
            
            {/* Botón Finalizar Primer Tiempo - Solo en primera parte, habilitado desde los 45 minutos */}
            {estaEnPrimeraParte && (
              <div 
                className="flex items-center justify-center"
                title={!puedeFinalizarPrimerTiempo && minutosTranscurridos < 45 ? "Disponible a partir de los 45 minutos" : undefined}
              >
                <Button
                  onClick={handleFinishFirstHalf}
                  disabled={isProcessing || !puedeFinalizarPrimerTiempo}
                  variant="outline"
                  size="sm"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Finalizando...
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Finalizar Primer Tiempo
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {/* Control de Minutos Adicionales del Segundo Tiempo - Mostrar 5 min antes de 90 (minuto 85) */}
            {necesitaConfigurarTiempoAgregado && estaEnSegundaParte && (
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
            
            {/* Botón Finalizar Partido - Solo en segunda parte, después de 90 minutos */}
            {estaEnSegundaParte && (
              <div className="flex items-center justify-center">
                <Button
                  onClick={handleFinishMatch}
                  disabled={isProcessing || !canFinish}
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
