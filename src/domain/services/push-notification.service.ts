/**
 * Servicio de Dominio: Push Notifications
 * Maneja la lógica de negocio para enviar notificaciones push
 * 
 * IMPORTANTE: Deduplicación de Notificaciones
 * 
 * Cuando un usuario tiene ambos equipos como favoritos en un partido,
 * recibirá 2 notificaciones del mismo evento (una por cada topic).
 * 
 * Para evitar duplicados, cada notificación incluye un campo `event_id` único
 * en el payload de datos. La app iOS debe usar este ID para deduplicar
 * notificaciones recibidas en un corto período de tiempo (5 segundos).
 * 
 * Ejemplo:
 * - Partido: hua_ali (Huancayo vs Alianza Lima)
 * - Usuario tiene ambos equipos como favoritos
 * - Se envía notificación a: team_hua y team_ali
 * - Usuario recibe 2 notificaciones con el mismo event_id
 * - App iOS deduplica y muestra solo 1 notificación
 * 
 * Ver: DEDUPLICACION-NOTIFICACIONES.md para más detalles
 */

import { Match, getMatchElapsedMinutes } from '../entities/match.entity';
import { getTeamTopic, GENERAL_TOPIC, NotificationEventType, getTopicsForMatch } from '@/core/config/fcm-topics';
import { getTeamFullName } from '@/core/config/firestore-constants';

export interface SendNotificationParams {
  topic: string;
  title: string;
  body: string;
  eventType: NotificationEventType;
  data?: Record<string, string>;
  imageUrl?: string;
}

/**
 * Genera un ID único para un evento de notificación
 * Formato: {match_id}_{event_type}_{timestamp}
 * Esto permite a la app iOS deduplicar notificaciones del mismo evento
 */
export const generateEventId = (matchId: string, eventType: NotificationEventType, additionalData?: string): string => {
  const timestamp = Date.now();
  const extra = additionalData ? `_${additionalData}` : '';
  return `${matchId}_${eventType}_${timestamp}${extra}`;
};

/**
 * Normaliza un match para asegurar que tenga los códigos de equipos
 * Extrae los códigos del ID del partido si no están disponibles
 */
const normalizeMatchForNotifications = (match: Match): Match => {
  // Si ya tiene los códigos, retornar tal cual
  if (match.equipoLocalId && match.equipoVisitanteId) {
    return match;
  }

  // Extraer del ID del partido (formato: "hua_ali")
  const parts = match.id.split('_');
  if (parts.length >= 2) {
    return {
      ...match,
      equipoLocalId: match.equipoLocalId || parts[0] || null,
      equipoVisitanteId: match.equipoVisitanteId || parts[1] || null,
    };
  }

  return match;
};

export class PushNotificationService {
  /**
   * Envía una notificación push a través de la API
   */
  async sendNotification(params: SendNotificationParams): Promise<{ messageId?: string }> {
    try {
      const response = await fetch('/api/push-notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al enviar la notificación');
      }

      return await response.json();
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Envía una notificación a múltiples topics
   * @param topics - Array de topics a los que enviar
   * @param notification - Contenido de la notificación
   */
  async sendNotificationToTopics(
    topics: string[],
    notification: Omit<SendNotificationParams, 'topic'>
  ): Promise<Array<{ topic: string; success: boolean; messageId?: string; error?: string }>> {
    if (topics.length === 0) {
      return [];
    }

    const results = [];

    // Enviar a cada topic secuencialmente para mejor control de errores
    for (const topic of topics) {
      try {
        const result = await this.sendNotification({
          ...notification,
          topic,
        });
        results.push({ topic, success: true, messageId: result?.messageId });
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        results.push({ topic, success: false, error: errMsg });
        // Continuar con el siguiente topic aunque uno falle
      }
    }

    const successCount = results.filter(r => r.success).length;

    // Si todas fallaron, lanzar error
    if (successCount === 0 && topics.length > 0) {
      throw new Error(`No se pudo enviar la notificación a ningún topic. Errores: ${results.map(r => r.error).join(', ')}`);
    }

    return results;
  }

  /**
   * Genera y envía notificación de gol
   * IMPORTANTE: Envía a AMBOS equipos (local y visitante)
   */
  async sendGoalNotification(
    match: Match,
    teamCode: string,
    scorer?: string
  ): Promise<void> {
    // Normalizar match para asegurar códigos de equipos
    const normalizedMatch = normalizeMatchForNotifications(match);
    
    // Obtener topics de AMBOS equipos
    const topics = getTopicsForMatch(normalizedMatch);
    
    if (topics.length === 0) {
      throw new Error(`No se encontraron topics válidos para los equipos del partido. Match ID: ${match.id}`);
    }

    const teamName = getTeamFullName(teamCode);
    const localName = normalizedMatch.equipoLocalId ? getTeamFullName(normalizedMatch.equipoLocalId) : 'Local';
    const visitorName = normalizedMatch.equipoVisitanteId ? getTeamFullName(normalizedMatch.equipoVisitanteId) : 'Visitante';
    
    const minute = getMatchElapsedMinutes(normalizedMatch);
    const score = `${normalizedMatch.golesEquipoLocal} - ${normalizedMatch.golesEquipoVisitante}`;

    const title = `⚽ ¡Gol de ${teamName}!`;
    const body = scorer
      ? `${localName} ${score} ${visitorName} (Min. ${minute}') - ${scorer}`
      : `${localName} ${score} ${visitorName} (Min. ${minute}')`;

    // Generar ID único del evento para deduplicación en la app
    const eventId = generateEventId(normalizedMatch.id, 'goal', `${minute}_${teamCode}`);

    // Enviar a AMBOS equipos
    await this.sendNotificationToTopics(topics, {
      title,
      body,
      eventType: 'goal',
      data: {
        event_id: eventId, // ID único para deduplicación en la app iOS
        match_id: normalizedMatch.id,
        home_team: normalizedMatch.equipoLocalId || '',
        away_team: normalizedMatch.equipoVisitanteId || '',
        scoring_team: teamCode,
        minute: minute.toString(),
        home_score: normalizedMatch.golesEquipoLocal.toString(),
        away_score: normalizedMatch.golesEquipoVisitante.toString(),
        ...(scorer && { scorer }),
      },
    });
  }

  /**
   * Genera y envía notificación de inicio de partido
   * IMPORTANTE: Envía a AMBOS equipos (local y visitante)
   */
  async sendMatchStartNotification(match: Match): Promise<void> {
    // Normalizar match para asegurar códigos de equipos
    const normalizedMatch = normalizeMatchForNotifications(match);
    
    // Obtener topics de AMBOS equipos
    const topics = getTopicsForMatch(normalizedMatch);
    
    if (topics.length === 0) {
      throw new Error(`No se encontraron topics válidos para los equipos del partido. Match ID: ${match.id}`);
    }

    const localName = normalizedMatch.equipoLocalId ? getTeamFullName(normalizedMatch.equipoLocalId) : 'Local';
    const visitorName = normalizedMatch.equipoVisitanteId ? getTeamFullName(normalizedMatch.equipoVisitanteId) : 'Visitante';
    const matchTitle = `${localName} vs ${visitorName}`;

    const title = '🎯 ¡Comienza el partido!';
    const body = `${matchTitle} - ¡Ya empezó!`;

    // Generar ID único del evento para deduplicación en la app
    const eventId = generateEventId(normalizedMatch.id, 'match_start');

    // Enviar a AMBOS equipos
    await this.sendNotificationToTopics(topics, {
      title,
      body,
      eventType: 'match_start',
      data: {
        event_id: eventId, // ID único para deduplicación en la app iOS
        match_id: normalizedMatch.id,
        home_team: normalizedMatch.equipoLocalId || '',
        away_team: normalizedMatch.equipoVisitanteId || '',
        event_type: 'match_start',
      },
    });
  }

  /**
   * Genera y envía notificación de resultado final
   * IMPORTANTE: Envía a AMBOS equipos (local y visitante) con mensajes personalizados
   */
  async sendMatchEndNotification(match: Match): Promise<void> {
    // Normalizar match para asegurar códigos de equipos
    const normalizedMatch = normalizeMatchForNotifications(match);
    
    // Obtener topics de AMBOS equipos
    const topics = getTopicsForMatch(normalizedMatch);
    
    if (topics.length === 0) {
      throw new Error(`No se encontraron topics válidos para los equipos del partido. Match ID: ${match.id}`);
    }

    const localName = normalizedMatch.equipoLocalId ? getTeamFullName(normalizedMatch.equipoLocalId) : 'Local';
    const visitorName = normalizedMatch.equipoVisitanteId ? getTeamFullName(normalizedMatch.equipoVisitanteId) : 'Visitante';
    const score = `${normalizedMatch.golesEquipoLocal} - ${normalizedMatch.golesEquipoVisitante}`;

    // Generar ID único del evento para deduplicación en la app
    const eventId = generateEventId(normalizedMatch.id, 'match_end');

    const baseData = {
      event_id: eventId, // ID único para deduplicación en la app iOS
      match_id: normalizedMatch.id,
      home_team: normalizedMatch.equipoLocalId || '',
      away_team: normalizedMatch.equipoVisitanteId || '',
      home_score: normalizedMatch.golesEquipoLocal.toString(),
      away_score: normalizedMatch.golesEquipoVisitante.toString(),
      event_type: 'match_end',
    };

    // Enviar a ambos equipos con mensajes personalizados según el resultado
    const promises: Promise<{ messageId?: string }>[] = [];

    for (const topic of topics) {
      // Determinar si este topic es del equipo local o visitante
      const isLocalTeam = normalizedMatch.equipoLocalId && topic === getTeamTopic(normalizedMatch.equipoLocalId);
      const teamId = isLocalTeam ? normalizedMatch.equipoLocalId! : normalizedMatch.equipoVisitanteId!;
      
      // Calcular resultado para este equipo
      let resultText = '';
      let result = '';
      
      if (isLocalTeam) {
        if (normalizedMatch.golesEquipoLocal > normalizedMatch.golesEquipoVisitante) {
          resultText = '¡Victoria!';
          result = 'win';
        } else if (normalizedMatch.golesEquipoLocal < normalizedMatch.golesEquipoVisitante) {
          resultText = 'Derrota';
          result = 'loss';
        } else {
          resultText = 'Empate';
          result = 'draw';
        }
      } else {
        if (normalizedMatch.golesEquipoVisitante > normalizedMatch.golesEquipoLocal) {
          resultText = '¡Victoria!';
          result = 'win';
        } else if (normalizedMatch.golesEquipoVisitante < normalizedMatch.golesEquipoLocal) {
          resultText = 'Derrota';
          result = 'loss';
        } else {
          resultText = 'Empate';
          result = 'draw';
        }
      }

      promises.push(
        this.sendNotification({
          topic,
          title: '⏱️ Resultado Final',
          body: `${localName} ${score} ${visitorName} ${resultText}`,
          eventType: 'match_end',
          data: {
            ...baseData,
            team_id: teamId,
            result,
          },
        })
      );
    }

    await Promise.all(promises);
  }

  /**
   * Genera y envía notificación de tarjeta roja
   * IMPORTANTE: Envía a AMBOS equipos (local y visitante)
   */
  async sendRedCardNotification(
    match: Match,
    teamCode: string,
    player: string
  ): Promise<void> {
    // Normalizar match para asegurar códigos de equipos
    const normalizedMatch = normalizeMatchForNotifications(match);
    
    // Obtener topics de AMBOS equipos
    const topics = getTopicsForMatch(normalizedMatch);
    
    if (topics.length === 0) {
      throw new Error(`No se encontraron topics válidos para los equipos del partido. Match ID: ${match.id}`);
    }

    const teamName = getTeamFullName(teamCode);
    const minute = getMatchElapsedMinutes(normalizedMatch);

    // Generar ID único del evento para deduplicación en la app
    const eventId = generateEventId(normalizedMatch.id, 'red_card', `${minute}_${teamCode}_${player}`);

    // Enviar a AMBOS equipos
    await this.sendNotificationToTopics(topics, {
      title: '🟥 Tarjeta Roja',
      body: `${teamName}: ${player} expulsado (Min. ${minute}')`,
      eventType: 'red_card',
      data: {
        event_id: eventId, // ID único para deduplicación en la app iOS
        match_id: normalizedMatch.id,
        home_team: normalizedMatch.equipoLocalId || '',
        away_team: normalizedMatch.equipoVisitanteId || '',
        affected_team: teamCode,
        minute: minute.toString(),
        player,
      },
    });
  }

  /**
   * Genera y envía notificación general de la liga
   */
  async sendGeneralNotification(
    title: string,
    body: string,
    newsId?: string,
    imageUrl?: string
  ): Promise<void> {
    // Generar ID único del evento para deduplicación en la app
    const eventId = generateEventId('liga1_all', 'news', newsId || Date.now().toString());

    await this.sendNotification({
      topic: GENERAL_TOPIC,
      title,
      body,
      eventType: 'news',
      data: {
        event_id: eventId, // ID único para deduplicación en la app iOS
        ...(newsId && { news_id: newsId }),
        category: 'general',
      },
      imageUrl,
    });
  }

  /**
   * Envía una notificación personalizada
   */
  async sendCustomNotification(
    topic: string,
    title: string,
    body: string,
    eventType: NotificationEventType = 'news',
    data?: Record<string, string>,
    imageUrl?: string
  ): Promise<void> {
    await this.sendNotification({
      topic,
      title,
      body,
      eventType,
      data,
      imageUrl,
    });
  }

  /**
   * Envía una notificación silenciosa (solo data, sin notification)
   * Útil para score updates que no deben mostrar banner pero deben despertar la app
   */
  async sendSilentNotification(topic: string, data: Record<string, string>): Promise<{ messageId?: string }> {
    try {
      const response = await fetch('/api/push-notifications/send-silent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic, data }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al enviar la notificación silenciosa');
      }

      return await response.json();
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Envía notificación silenciosa de actualización de marcador
   * Se envía al topic general (liga1_all) para actualizar el marcador en todas las apps
   * sin mostrar banner/sonido (notificación silenciosa)
   * 
   * IMPORTANTE: Usa solo el campo 'data' (sin 'notification') para que iOS
   * no muestre un banner automáticamente. La app actualizará el marcador en segundo plano.
   */
  async sendScoreUpdateNotification(
    match: Match,
    jornadaId: string
  ): Promise<void> {
    // Normalizar match para asegurar códigos de equipos
    const normalizedMatch = normalizeMatchForNotifications(match);

    // Extraer códigos de equipos
    let equipoLocalId = normalizedMatch.equipoLocalId;
    let equipoVisitanteId = normalizedMatch.equipoVisitanteId;

    // Si no están disponibles, extraer del ID del partido
    if (!equipoLocalId || !equipoVisitanteId) {
      const parts = normalizedMatch.id.split('_');
      if (parts.length >= 2) {
        equipoLocalId = parts[0] || null;
        equipoVisitanteId = parts[1] || null;
      }
    }

    if (!equipoLocalId || !equipoVisitanteId) {
      throw new Error(`No se pudieron determinar los códigos de equipos del partido. Match ID: ${match.id}`);
    }

    // Preparar el payload de datos
    const data = {
      type: 'score_update',
      matchId: normalizedMatch.id,
      jornadaId: jornadaId,
      golesTeamA: normalizedMatch.golesEquipoLocal.toString(),
      golesTeamB: normalizedMatch.golesEquipoVisitante.toString(),
      estado: normalizedMatch.estado,
    };

    // Enviar al topic general (liga1_all)
    try {
      await this.sendSilentNotification(GENERAL_TOPIC, data);
      console.log('✅ Score update notification sent:', {
        matchId: normalizedMatch.id,
        score: `${normalizedMatch.golesEquipoLocal}-${normalizedMatch.golesEquipoVisitante}`,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error al enviar score update notification:', errMsg);
      // No lanzar el error para que no falle la actualización del marcador
      // Solo registrar el error
    }
  }
}
