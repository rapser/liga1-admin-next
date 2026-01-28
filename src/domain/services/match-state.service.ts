/**
 * Servicio de Gestión de Estado de Partidos
 * Maneja la lógica de negocio para cambiar estados de partidos,
 * iniciar partidos, actualizar marcadores y finalizar partidos
 */

import { Match, EstadoMatch, canFinishMatch, getMatchElapsedMinutes, shouldEnterHalftime } from '../entities/match.entity';
import { IMatchRepository } from '../repositories/match.repository.interface';
import { ITeamRepository } from '../repositories/team.repository.interface';
import { TorneoType } from '@/core/config/firestore-constants';

export class MatchStateService {
  constructor(
    private matchRepository: IMatchRepository,
    private teamRepository: ITeamRepository
  ) {}

  /**
   * Inicia un partido (cambia de "pendiente" a "envivo")
   * Establece horaInicio, inicializa marcador a 0-0 si no está establecido
   */
  async startMatch(jornadaId: string, matchId: string, torneo: TorneoType): Promise<void> {
    // Obtener el partido actual
    const match = await this.matchRepository.fetchMatchById(jornadaId, matchId);
    
    if (!match) {
      throw new Error('Partido no encontrado');
    }

    // Validar que el partido esté en estado pendiente
    if (match.estado !== 'pendiente') {
      throw new Error(`No se puede iniciar un partido en estado "${match.estado}"`);
    }

    // Preparar actualizaciones
    const ahora = new Date();
    const updates: Partial<Match> = {
      estado: 'envivo',
      horaInicio: ahora,
      minutoActual: 0,
      primeraParte: true,
      tiempoAgregado: 0,
      tiempoAgregadoPrimeraParte: 0,
      enDescanso: false,
      // No incluir horaInicioSegundaParte si es undefined
    };

    // Si el marcador no está establecido, inicializar a 0-0
    const finalLocalScore = match.golesEquipoLocal ?? 0;
    const finalVisitorScore = match.golesEquipoVisitante ?? 0;
    
    if (match.golesEquipoLocal === undefined || match.golesEquipoLocal === null) {
      updates.golesEquipoLocal = 0;
    }
    if (match.golesEquipoVisitante === undefined || match.golesEquipoVisitante === null) {
      updates.golesEquipoVisitante = 0;
    }

    // Actualizar el partido
    await this.matchRepository.updateMatch(jornadaId, matchId, updates);

    // Incrementar partidos jugados en 1 para ambos equipos (SOLO cuando inicia el partido)
    // Esto es lo ÚNICO que cambia en matchesPlayed
    if (!match.equipoLocalId || !match.equipoVisitanteId) {
      const parts = matchId.split('_');
      if (parts.length >= 2) {
        match.equipoLocalId = parts[0];
        match.equipoVisitanteId = parts[1];
      }
    }

    if (match.equipoLocalId && match.equipoVisitanteId) {
      const equipoLocal = await this.teamRepository.fetchTeamById(torneo, match.equipoLocalId);
      const equipoVisitante = await this.teamRepository.fetchTeamById(torneo, match.equipoVisitanteId);

      if (equipoLocal && equipoVisitante) {
        // Incrementar solo matchesPlayed (una sola vez, cuando inicia el partido)
        await Promise.all([
          this.teamRepository.updateTeamStats(torneo, match.equipoLocalId, {
            partidosJugados: equipoLocal.partidosJugados + 1,
          }),
          this.teamRepository.updateTeamStats(torneo, match.equipoVisitanteId, {
            partidosJugados: equipoVisitante.partidosJugados + 1,
          }),
        ]);
        console.log('✅ Partidos jugados incrementados al iniciar el partido');
      }
    }
  }

  /**
   * Actualiza el marcador de un partido
   * Solo permite si el partido está en vivo
   * Actualiza la tabla de posiciones en tiempo real
   */
  async updateMatchScore(
    jornadaId: string,
    matchId: string,
    localScore: number,
    visitorScore: number,
    torneo: TorneoType
  ): Promise<void> {
    // Obtener el partido actual (con el marcador anterior)
    const match = await this.matchRepository.fetchMatchById(jornadaId, matchId);
    
    if (!match) {
      throw new Error('Partido no encontrado');
    }

    // Validar que el partido esté en vivo
    if (match.estado !== 'envivo') {
      throw new Error(`No se puede actualizar el marcador de un partido en estado "${match.estado}"`);
    }

    // Validar valores
    if (localScore < 0 || visitorScore < 0) {
      throw new Error('Los goles no pueden ser negativos');
    }

    if (!Number.isInteger(localScore) || !Number.isInteger(visitorScore)) {
      throw new Error('Los goles deben ser números enteros');
    }

    // Guardar el marcador anterior antes de actualizar
    const previousLocalScore = match.golesEquipoLocal || 0;
    const previousVisitorScore = match.golesEquipoVisitante || 0;

    console.log('🔄 updateMatchScore:', {
      jornadaId,
      matchId,
      torneo,
      marcadorAnterior: `${previousLocalScore}-${previousVisitorScore}`,
      marcadorNuevo: `${localScore}-${visitorScore}`,
      equipoLocalId: match.equipoLocalId,
      equipoVisitanteId: match.equipoVisitanteId,
    });

    // Actualizar el marcador en Firestore
    await this.matchRepository.updateMatchScore(jornadaId, matchId, localScore, visitorScore);
    console.log('✅ Marcador actualizado en Firestore (jornadas)');

    // Actualizar tabla de posiciones en tiempo real
    // Pasamos el marcador anterior para calcular solo la diferencia
    console.log('🔵 Llamando a updateStandingsScore...');
    await this.updateStandingsScore(
      { ...match, golesEquipoLocal: localScore, golesEquipoVisitante: visitorScore },
      torneo,
      previousLocalScore,
      previousVisitorScore
    );
    console.log('✅ updateMatchScore completado');
  }

  /**
   * Actualiza el tiempo agregado (minutos adicionales) del segundo tiempo
   * Se llama cuando el partido llega a 90 minutos para configurar cuántos minutos adicionales habrá
   */
  async updateAddedTime(jornadaId: string, matchId: string, minutosAdicionales: number): Promise<void> {
    // Validar que el partido esté en vivo
    const match = await this.matchRepository.fetchMatchById(jornadaId, matchId);
    
    if (!match) {
      throw new Error('Partido no encontrado');
    }

    if (match.estado !== 'envivo') {
      throw new Error(`No se puede actualizar el tiempo agregado de un partido en estado "${match.estado}"`);
    }

    // Validar valores
    if (minutosAdicionales < 0 || minutosAdicionales > 15) {
      throw new Error('Los minutos adicionales deben estar entre 0 y 15');
    }

    // Actualizar tiempo agregado en Firestore
    await this.matchRepository.updateMatch(jornadaId, matchId, {
      tiempoAgregado: minutosAdicionales,
    });
  }

  /**
   * Actualiza el tiempo agregado del primer tiempo
   * Se llama cuando el partido llega a 45 minutos para configurar cuántos minutos adicionales habrá
   * NO pone en descanso automáticamente - el descanso se activa cuando se completan los 45 + minutos adicionales
   */
  async updateFirstHalfAddedTime(jornadaId: string, matchId: string, minutosAdicionales: number): Promise<void> {
    // Validar que el partido esté en vivo
    const match = await this.matchRepository.fetchMatchById(jornadaId, matchId);
    
    if (!match) {
      throw new Error('Partido no encontrado');
    }

    if (match.estado !== 'envivo') {
      throw new Error(`No se puede actualizar el tiempo agregado del primer tiempo de un partido en estado "${match.estado}"`);
    }

    // Validar valores
    if (minutosAdicionales < 0 || minutosAdicionales > 15) {
      throw new Error('Los minutos adicionales deben estar entre 0 y 15');
    }

    // Solo actualizar tiempo agregado del primer tiempo, NO poner en descanso
    // El descanso se activará automáticamente cuando se completen los 45 + minutos adicionales
    await this.matchRepository.updateMatch(jornadaId, matchId, {
      tiempoAgregadoPrimeraParte: minutosAdicionales,
    });
  }

  /**
   * Finaliza el primer tiempo manualmente
   * Pone el partido en descanso con 0 minutos adicionales si no se han configurado
   */
  async finishFirstHalf(jornadaId: string, matchId: string): Promise<void> {
    // Validar que el partido esté en vivo
    const match = await this.matchRepository.fetchMatchById(jornadaId, matchId);
    
    if (!match) {
      throw new Error('Partido no encontrado');
    }

    if (match.estado !== 'envivo') {
      throw new Error(`No se puede finalizar el primer tiempo de un partido en estado "${match.estado}"`);
    }

    if (!match.primeraParte || match.enDescanso) {
      throw new Error('El partido no está en primera parte');
    }

    // Si no tiene tiempo agregado configurado, establecerlo en 0 y poner en descanso
    const tiempoAgregadoPrimera = match.tiempoAgregadoPrimeraParte ?? 0;
    await this.matchRepository.updateMatch(jornadaId, matchId, {
      tiempoAgregadoPrimeraParte: tiempoAgregadoPrimera,
      enDescanso: true,
    });
  }

  /**
   * Reanuda la segunda parte del partido
   * Cambia el estado de descanso a segunda parte y registra la hora de inicio
   */
  async resumeSecondHalf(jornadaId: string, matchId: string): Promise<void> {
    // Validar que el partido esté en vivo y en descanso
    const match = await this.matchRepository.fetchMatchById(jornadaId, matchId);
    
    if (!match) {
      throw new Error('Partido no encontrado');
    }

    if (match.estado !== 'envivo') {
      throw new Error(`No se puede reanudar un partido en estado "${match.estado}"`);
    }

    if (!match.enDescanso) {
      throw new Error('El partido no está en descanso');
    }

    // Reanudar segunda parte
    const ahora = new Date();
    await this.matchRepository.updateMatch(jornadaId, matchId, {
      enDescanso: false,
      primeraParte: false,
      horaInicioSegundaParte: ahora,
    });
  }

  /**
   * Finaliza un partido (cambia de "envivo" a "finalizado")
   * Valida que hayan transcurrido mínimo 90 minutos + tiempo agregado
   * NOTA: NO actualiza la tabla de posiciones porque ya se actualiza en tiempo real
   * durante el partido mediante updateStandingsScore cada vez que cambia el marcador
   */
  async finishMatch(jornadaId: string, matchId: string, torneo: TorneoType): Promise<void> {
    // Obtener el partido actual
    const match = await this.matchRepository.fetchMatchById(jornadaId, matchId);
    
    if (!match) {
      throw new Error('Partido no encontrado');
    }

    // Validar que se pueda finalizar
    if (!canFinishMatch(match)) {
      const minutosTranscurridos = getMatchElapsedMinutes(match);
      throw new Error(
        `No se puede finalizar el partido. Deben transcurrir mínimo 90 minutos. ` +
        `Minutos actuales: ${minutosTranscurridos}`
      );
    }

    // Solo actualizar el estado a finalizado
    // La tabla de posiciones ya está actualizada en tiempo real durante el partido
    // mediante updateStandingsScore que se llama cada vez que cambia el marcador
    await this.matchRepository.updateMatch(jornadaId, matchId, {
      estado: 'finalizado',
    });
    console.log('✅ Partido finalizado. La tabla de posiciones ya está actualizada en tiempo real.');
  }

  /**
   * Actualiza goles, diferencia y puntos en la tabla durante el partido (sin incrementar PJ)
   * Se ejecuta cada vez que cambia el marcador mientras el partido está en vivo
   * Calcula la diferencia entre el marcador nuevo y el anterior para evitar sumar múltiples veces
   */
  private async updateStandingsScore(
    match: Match, 
    torneo: TorneoType,
    previousLocalScore: number = 0,
    previousVisitorScore: number = 0
  ): Promise<void> {
    // Extraer IDs de equipos del match.id si no están en match.equipoLocalId/equipoVisitanteId
    // El ID del partido suele ser "local_visitante" (ej: "hua_ali")
    let equipoLocalId = match.equipoLocalId;
    let equipoVisitanteId = match.equipoVisitanteId;

    if (!equipoLocalId || !equipoVisitanteId || equipoLocalId === '' || equipoVisitanteId === '') {
      const parts = match.id.split('_');
      if (parts.length >= 2) {
        equipoLocalId = parts[0] || equipoLocalId || '';
        equipoVisitanteId = parts[1] || equipoVisitanteId || '';
      }
    }

    console.log('🔵 updateStandingsScore llamado:', {
      matchId: match.id,
      equipoLocalId,
      equipoVisitanteId,
      torneo,
      golesEquipoLocal: match.golesEquipoLocal,
      golesEquipoVisitante: match.golesEquipoVisitante,
      previousLocalScore,
      previousVisitorScore,
    });

    if (!equipoLocalId || !equipoVisitanteId || equipoLocalId === '' || equipoVisitanteId === '') {
      console.error('❌ No se puede actualizar: faltan IDs de equipos', {
        matchId: match.id,
        equipoLocalId,
        equipoVisitanteId,
      });
      throw new Error(`No se pueden identificar los equipos del partido ${match.id}`);
    }

    const { golesEquipoLocal, golesEquipoVisitante } = match;

    // Obtener estadísticas actuales de ambos equipos desde 'apertura' (siempre)
    // Primero intentar desde el torneo correspondiente, si no existe, usar apertura
    let equipoLocal = await this.teamRepository.fetchTeamById('apertura', equipoLocalId);
    let equipoVisitante = await this.teamRepository.fetchTeamById('apertura', equipoVisitanteId);

    if (!equipoLocal || !equipoVisitante) {
      console.error(`❌ Equipos no encontrados en apertura: local=${equipoLocalId}, visitante=${equipoVisitanteId}`);
      console.error('⚠️ Intentando buscar equipos en la colección...');
      
      // Intentar desde la colección del torneo si no están en apertura
      if (!equipoLocal) {
        equipoLocal = await this.teamRepository.fetchTeamById(torneo, equipoLocalId);
      }
      if (!equipoVisitante) {
        equipoVisitante = await this.teamRepository.fetchTeamById(torneo, equipoVisitanteId);
      }
      
      if (!equipoLocal || !equipoVisitante) {
        console.error(`❌ Equipos definitivamente no encontrados. Local existe: ${!!equipoLocal}, Visitante existe: ${!!equipoVisitante}`);
        throw new Error(`Equipos no encontrados en Firestore: local=${equipoLocalId}, visitante=${equipoVisitanteId}`);
      }
    }

    console.log('✅ Equipos encontrados:', {
      local: { id: equipoLocalId, golesFavor: equipoLocal.golesFavor, puntos: equipoLocal.puntos },
      visitante: { id: equipoVisitanteId, golesFavor: equipoVisitante.golesFavor, puntos: equipoVisitante.puntos },
    });

    // Calcular la diferencia de goles (nuevo - anterior)
    // Esto evita sumar múltiples veces los mismos goles
    const diffGolesLocal = golesEquipoLocal - previousLocalScore;
    const diffGolesVisitante = golesEquipoVisitante - previousVisitorScore;

    // Aplicar la diferencia a los totales actuales
    const newGolesFavorLocal = equipoLocal.golesFavor + diffGolesLocal;
    const newGolesContraLocal = equipoLocal.golesContra + diffGolesVisitante;
    const newGolesFavorVisitante = equipoVisitante.golesFavor + diffGolesVisitante;
    const newGolesContraVisitante = equipoVisitante.golesContra + diffGolesLocal;

    // Calcular resultado del partido ANTERIOR (basado en previousLocalScore vs previousVisitorScore)
    const anteriorGanaLocal = previousLocalScore > previousVisitorScore;
    const anteriorEmpate = previousLocalScore === previousVisitorScore;
    const anteriorGanaVisitante = previousVisitorScore > previousLocalScore;

    // Calcular resultado del partido ACTUAL (basado en golesEquipoLocal vs golesEquipoVisitante)
    const actualGanaLocal = golesEquipoLocal > golesEquipoVisitante;
    const actualEmpate = golesEquipoLocal === golesEquipoVisitante;
    const actualGanaVisitante = golesEquipoVisitante > golesEquipoLocal;

    // Revertir el resultado anterior y aplicar el resultado actual
    // Esto permite que cuando el marcador cambia (ej: 2-1 → 2-2), se actualice correctamente
    const baseMatchesWonLocal = equipoLocal.partidosGanados - (anteriorGanaLocal ? 1 : 0);
    const baseMatchesDrawnLocal = equipoLocal.partidosEmpatados - (anteriorEmpate ? 1 : 0);
    const baseMatchesLostLocal = equipoLocal.partidosPerdidos - (anteriorGanaVisitante ? 1 : 0);

    const baseMatchesWonVisitante = equipoVisitante.partidosGanados - (anteriorGanaVisitante ? 1 : 0);
    const baseMatchesDrawnVisitante = equipoVisitante.partidosEmpatados - (anteriorEmpate ? 1 : 0);
    const baseMatchesLostVisitante = equipoVisitante.partidosPerdidos - (anteriorGanaLocal ? 1 : 0);

    // Aplicar el resultado ACTUAL del partido
    const newMatchesWonLocal = Math.max(0, baseMatchesWonLocal) + (actualGanaLocal ? 1 : 0);
    const newMatchesDrawnLocal = Math.max(0, baseMatchesDrawnLocal) + (actualEmpate ? 1 : 0);
    const newMatchesLostLocal = Math.max(0, baseMatchesLostLocal) + (actualGanaVisitante ? 1 : 0);

    const newMatchesWonVisitante = Math.max(0, baseMatchesWonVisitante) + (actualGanaVisitante ? 1 : 0);
    const newMatchesDrawnVisitante = Math.max(0, baseMatchesDrawnVisitante) + (actualEmpate ? 1 : 0);
    const newMatchesLostVisitante = Math.max(0, baseMatchesLostVisitante) + (actualGanaLocal ? 1 : 0);

    // NOTA: partidosJugados NO se actualiza aquí
    // partidosJugados solo se incrementa UNA VEZ cuando el partido INICIA (en startMatch)
    // Durante el partido en vivo, partidosJugados NO cambia, solo los demás campos

    // Calcular diferencia de goles
    const newGoalDifferenceLocal = newGolesFavorLocal - newGolesContraLocal;
    const newGoalDifferenceVisitante = newGolesFavorVisitante - newGolesContraVisitante;

    // Calcular puntos: partidos ganados * 3 + partidos empatados
    const newPuntosLocal = newMatchesWonLocal * 3 + newMatchesDrawnLocal;
    const newPuntosVisitante = newMatchesWonVisitante * 3 + newMatchesDrawnVisitante;

    // NO incluir partidosJugados en los stats a actualizar
    // partidosJugados solo se actualiza UNA VEZ cuando inicia el partido (startMatch)
    // Durante el partido en vivo, partidosJugados NO cambia, solo estos campos:
    const newStatsLocal: Partial<Team> = {
      partidosGanados: newMatchesWonLocal,
      partidosEmpatados: newMatchesDrawnLocal,
      partidosPerdidos: newMatchesLostLocal,
      golesFavor: newGolesFavorLocal,
      golesContra: newGolesContraLocal,
      diferenciaGoles: newGoalDifferenceLocal,
      puntos: newPuntosLocal,
    };

    const newStatsVisitante: Partial<Team> = {
      partidosGanados: newMatchesWonVisitante,
      partidosEmpatados: newMatchesDrawnVisitante,
      partidosPerdidos: newMatchesLostVisitante,
      golesFavor: newGolesFavorVisitante,
      golesContra: newGolesContraVisitante,
      diferenciaGoles: newGoalDifferenceVisitante,
      puntos: newPuntosVisitante,
    };

    console.log('🔄 Actualizando tabla en tiempo real:', {
      torneo,
      partido: `${equipoLocalId} ${previousLocalScore}-${previousVisitorScore} → ${golesEquipoLocal}-${golesEquipoVisitante} ${equipoVisitanteId}`,
      diferencia: { local: diffGolesLocal, visitante: diffGolesVisitante },
      local: { 
        id: equipoLocalId, 
        antes: { goles: equipoLocal.golesFavor, puntos: equipoLocal.puntos },
        nuevo: newStatsLocal 
      },
      visitante: { 
        id: equipoVisitanteId, 
        antes: { goles: equipoVisitante.golesFavor, puntos: equipoVisitante.puntos },
        nuevo: newStatsVisitante 
      },
    });

    try {
      // Actualizar la colección del torneo correspondiente (apertura o clausura)
      // NOTA: 'acumulado' NUNCA existe como colección en Firestore
      // 'acumulado' solo se usa para cálculos locales combinando apertura + clausura
      console.log(`🔄 Actualizando colección ${torneo}...`);
      await Promise.all([
        this.teamRepository.updateTeamStats(torneo, equipoLocalId, newStatsLocal),
        this.teamRepository.updateTeamStats(torneo, equipoVisitanteId, newStatsVisitante),
      ]);
      console.log(`✅ Tabla ${torneo} actualizada correctamente`);
    } catch (error: any) {
      console.error('❌ Error al actualizar tabla:', error);
      console.error('Detalles del error:', {
        message: error.message,
        stack: error.stack,
        equipoLocalId,
        equipoVisitanteId,
        torneo,
      });
      throw error;
    }
  }

  /**
   * Actualiza la tabla de posiciones basándose en el resultado de un partido finalizado
   * Actualiza partidos ganados, empatados, perdidos, goles y calcula puntos
   * NOTA: partidosJugados NO se incrementa aquí porque ya se incrementó cuando inició el partido (startMatch)
   */
  private async updateStandingsFromMatch(match: Match, torneo: TorneoType): Promise<void> {
    if (!match.equipoLocalId || !match.equipoVisitanteId) {
      console.warn('Partido sin equipos definidos, no se actualiza la tabla');
      return;
    }

    const { golesEquipoLocal, golesEquipoVisitante } = match;

    // Obtener estadísticas actuales de ambos equipos
    // Primero intentar desde apertura, luego desde el torneo correspondiente
    let equipoLocal = await this.teamRepository.fetchTeamById('apertura', match.equipoLocalId);
    let equipoVisitante = await this.teamRepository.fetchTeamById('apertura', match.equipoVisitanteId);

    if (!equipoLocal || !equipoVisitante) {
      equipoLocal = await this.teamRepository.fetchTeamById(torneo, match.equipoLocalId);
      equipoVisitante = await this.teamRepository.fetchTeamById(torneo, match.equipoVisitanteId);
    }

    if (!equipoLocal || !equipoVisitante) {
      const errorMsg = `Equipos no encontrados: local=${match.equipoLocalId || 'N/A'}, visitante=${match.equipoVisitanteId || 'N/A'}`;
      console.error(errorMsg, { torneo, equiposExistentes: { local: !!equipoLocal, visitante: !!equipoVisitante } });
      throw new Error(errorMsg);
    }

    // Calcular resultado
    const ganaLocal = golesEquipoLocal > golesEquipoVisitante;
    const empate = golesEquipoLocal === golesEquipoVisitante;
    const ganaVisitante = golesEquipoVisitante > golesEquipoLocal;

    // Calcular nuevas estadísticas para el equipo local
    // NOTA: partidosJugados ya fue incrementado cuando inició el partido (startMatch)
    // Por lo tanto, NO debemos incrementarlo de nuevo aquí
    // Solo actualizamos: partidosGanados, partidosEmpatados, partidosPerdidos, goles, diferencia, puntos
    
    const newPartidosGanadosLocal = equipoLocal.partidosGanados + (ganaLocal ? 1 : 0);
    const newPartidosEmpatadosLocal = equipoLocal.partidosEmpatados + (empate ? 1 : 0);
    const newPartidosPerdidosLocal = equipoLocal.partidosPerdidos + (ganaVisitante ? 1 : 0);
    const newGolesFavorLocal = equipoLocal.golesFavor + golesEquipoLocal;
    const newGolesContraLocal = equipoLocal.golesContra + golesEquipoVisitante;
    const newDiferenciaGolesLocal = newGolesFavorLocal - newGolesContraLocal;
    const newPuntosLocal = newPartidosGanadosLocal * 3 + newPartidosEmpatadosLocal;

    const newPartidosGanadosVisitante = equipoVisitante.partidosGanados + (ganaVisitante ? 1 : 0);
    const newPartidosEmpatadosVisitante = equipoVisitante.partidosEmpatados + (empate ? 1 : 0);
    const newPartidosPerdidosVisitante = equipoVisitante.partidosPerdidos + (ganaLocal ? 1 : 0);
    const newGolesFavorVisitante = equipoVisitante.golesFavor + golesEquipoVisitante;
    const newGolesContraVisitante = equipoVisitante.golesContra + golesEquipoLocal;
    const newDiferenciaGolesVisitante = newGolesFavorVisitante - newGolesContraVisitante;
    const newPuntosVisitante = newPartidosGanadosVisitante * 3 + newPartidosEmpatadosVisitante;

    // Crear objeto con los campos actualizados
    // partidosJugados NO se actualiza aquí porque ya fue incrementado en startMatch
    const newStatsLocal = {
      partidosGanados: newPartidosGanadosLocal,
      partidosEmpatados: newPartidosEmpatadosLocal,
      partidosPerdidos: newPartidosPerdidosLocal,
      golesFavor: newGolesFavorLocal,
      golesContra: newGolesContraLocal,
      diferenciaGoles: newDiferenciaGolesLocal,
      puntos: newPuntosLocal,
    };

    const newStatsVisitante = {
      partidosGanados: newPartidosGanadosVisitante,
      partidosEmpatados: newPartidosEmpatadosVisitante,
      partidosPerdidos: newPartidosPerdidosVisitante,
      golesFavor: newGolesFavorVisitante,
      golesContra: newGolesContraVisitante,
      diferenciaGoles: newDiferenciaGolesVisitante,
      puntos: newPuntosVisitante,
    };

    console.log('🔄 Actualizando tabla de posiciones al finalizar partido:', {
      torneo,
      partido: `${match.equipoLocalId} ${golesEquipoLocal}-${golesEquipoVisitante} ${match.equipoVisitanteId}`,
      resultado: ganaLocal ? 'Victoria Local' : ganaVisitante ? 'Victoria Visitante' : 'Empate',
      local: { 
        id: match.equipoLocalId, 
        antes: { 
          partidosJugados: equipoLocal.partidosJugados,
          partidosGanados: equipoLocal.partidosGanados,
          golesFavor: equipoLocal.golesFavor,
          puntos: equipoLocal.puntos 
        },
        nuevo: newStatsLocal 
      },
      visitante: { 
        id: match.equipoVisitanteId, 
        antes: { 
          partidosJugados: equipoVisitante.partidosJugados,
          partidosGanados: equipoVisitante.partidosGanados,
          golesFavor: equipoVisitante.golesFavor,
          puntos: equipoVisitante.puntos 
        },
        nuevo: newStatsVisitante 
      },
    });

    // Actualizar en Firestore (solo apertura o clausura)
    // NOTA: 'acumulado' NUNCA existe como colección en Firestore
    // 'acumulado' solo se usa para cálculos locales combinando apertura + clausura
    await Promise.all([
      this.teamRepository.updateTeamStats(torneo, match.equipoLocalId, newStatsLocal),
      this.teamRepository.updateTeamStats(torneo, match.equipoVisitanteId, newStatsVisitante),
    ]);
    console.log(`✅ Tabla ${torneo} actualizada correctamente al finalizar el partido`);
  }
}
