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

export class PushNotificationService {
  /**
   * Envía una notificación push a través de la API
   */
  async sendNotification(params: SendNotificationParams): Promise<void> {
    try {
      console.log('📤 PushNotificationService - Enviando notificación:', {
        topic: params.topic,
        title: params.title,
        body: params.body,
        eventType: params.eventType,
        data: params.data,
      });

      const response = await fetch('/api/push-notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Error en respuesta de API:', error);
        throw new Error(error.error || 'Error al enviar la notificación');
      }

      const result = await response.json();
      console.log('✅ PushNotificationService - Notificación enviada exitosamente:', result);
      return result;
    } catch (error: any) {
      console.error('❌ Error en PushNotificationService:', error);
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
    console.log(`📤 Enviando notificación a ${topics.length} topic(s):`, topics);
    
    const results = [];

    for (const topic of topics) {
      try {
        await this.sendNotification({
          ...notification,
          topic,
        });
        results.push({ topic, success: true });
        console.log(`✅ Notificación enviada exitosamente a topic: ${topic}`);
      } catch (error: any) {
        console.error(`❌ Error enviando a topic ${topic}:`, error);
        results.push({ topic, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    console.log(`📊 Resumen: ${successCount} exitosas, ${failCount} fallidas de ${topics.length} totales`);

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
    // Obtener topics de AMBOS equipos
    const topics = getTopicsForMatch(match);
    
    if (topics.length === 0) {
      throw new Error('No se encontraron topics válidos para los equipos del partido');
    }

    console.log('⚽ Enviando notificación de gol:', {
      scoringTeam: teamCode,
      topics,
      matchId: match.id,
    });

    const teamName = getTeamFullName(teamCode);
    const localName = match.equipoLocalId ? getTeamFullName(match.equipoLocalId) : 'Local';
    const visitorName = match.equipoVisitanteId ? getTeamFullName(match.equipoVisitanteId) : 'Visitante';
    
    const minute = getMatchElapsedMinutes(match);
    const score = `${match.golesEquipoLocal} - ${match.golesEquipoVisitante}`;

    const title = `⚽ ¡Gol de ${teamName}!`;
    const body = scorer
      ? `${localName} ${score} ${visitorName} (Min. ${minute}') - ${scorer}`
      : `${localName} ${score} ${visitorName} (Min. ${minute}')`;

    // Generar ID único del evento para deduplicación en la app
    const eventId = generateEventId(match.id, 'goal', `${minute}_${teamCode}`);

    // Enviar a AMBOS equipos
    await this.sendNotificationToTopics(topics, {
      title,
      body,
      eventType: 'goal',
      data: {
        event_id: eventId, // ID único para deduplicación en la app iOS
        match_id: match.id,
        home_team: match.equipoLocalId || '',
        away_team: match.equipoVisitanteId || '',
        scoring_team: teamCode,
        minute: minute.toString(),
        home_score: match.golesEquipoLocal.toString(),
        away_score: match.golesEquipoVisitante.toString(),
        ...(scorer && { scorer }),
      },
    });
  }

  /**
   * Genera y envía notificación de inicio de partido
   * IMPORTANTE: Envía a AMBOS equipos (local y visitante)
   */
  async sendMatchStartNotification(match: Match): Promise<void> {
    // Obtener topics de AMBOS equipos
    const topics = getTopicsForMatch(match);
    
    if (topics.length === 0) {
      throw new Error('No se encontraron topics válidos para los equipos del partido');
    }

    console.log('🎯 Enviando notificación de inicio de partido:', {
      topics,
      matchId: match.id,
    });

    const localName = match.equipoLocalId ? getTeamFullName(match.equipoLocalId) : 'Local';
    const visitorName = match.equipoVisitanteId ? getTeamFullName(match.equipoVisitanteId) : 'Visitante';
    const matchTitle = `${localName} vs ${visitorName}`;

    const title = '🎯 ¡Comienza el partido!';
    const body = `${matchTitle} - ¡Ya empezó!`;

    // Generar ID único del evento para deduplicación en la app
    const eventId = generateEventId(match.id, 'match_start');

    // Enviar a AMBOS equipos
    await this.sendNotificationToTopics(topics, {
      title,
      body,
      eventType: 'match_start',
      data: {
        event_id: eventId, // ID único para deduplicación en la app iOS
        match_id: match.id,
        home_team: match.equipoLocalId || '',
        away_team: match.equipoVisitanteId || '',
        event_type: 'match_start',
      },
    });
  }

  /**
   * Genera y envía notificación de resultado final
   * IMPORTANTE: Envía a AMBOS equipos (local y visitante) con mensajes personalizados
   */
  async sendMatchEndNotification(match: Match): Promise<void> {
    // Obtener topics de AMBOS equipos
    const topics = getTopicsForMatch(match);
    
    if (topics.length === 0) {
      throw new Error('No se encontraron topics válidos para los equipos del partido');
    }

    console.log('⏱️ Enviando notificación de resultado final:', {
      topics,
      matchId: match.id,
    });

    const localName = match.equipoLocalId ? getTeamFullName(match.equipoLocalId) : 'Local';
    const visitorName = match.equipoVisitanteId ? getTeamFullName(match.equipoVisitanteId) : 'Visitante';
    const score = `${match.golesEquipoLocal} - ${match.golesEquipoVisitante}`;

    // Generar ID único del evento para deduplicación en la app
    const eventId = generateEventId(match.id, 'match_end');

    const baseData = {
      event_id: eventId, // ID único para deduplicación en la app iOS
      match_id: match.id,
      home_team: match.equipoLocalId || '',
      away_team: match.equipoVisitanteId || '',
      home_score: match.golesEquipoLocal.toString(),
      away_score: match.golesEquipoVisitante.toString(),
      event_type: 'match_end',
    };

    // Enviar a ambos equipos con mensajes personalizados según el resultado
    const promises: Promise<any>[] = [];

    for (const topic of topics) {
      // Determinar si este topic es del equipo local o visitante
      const isLocalTeam = match.equipoLocalId && topic === getTeamTopic(match.equipoLocalId);
      const teamId = isLocalTeam ? match.equipoLocalId! : match.equipoVisitanteId!;
      
      // Calcular resultado para este equipo
      let resultText = '';
      let result = '';
      
      if (isLocalTeam) {
        if (match.golesEquipoLocal > match.golesEquipoVisitante) {
          resultText = '¡Victoria!';
          result = 'win';
        } else if (match.golesEquipoLocal < match.golesEquipoVisitante) {
          resultText = 'Derrota';
          result = 'loss';
        } else {
          resultText = 'Empate';
          result = 'draw';
        }
      } else {
        if (match.golesEquipoVisitante > match.golesEquipoLocal) {
          resultText = '¡Victoria!';
          result = 'win';
        } else if (match.golesEquipoVisitante < match.golesEquipoLocal) {
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
    // Obtener topics de AMBOS equipos
    const topics = getTopicsForMatch(match);
    
    if (topics.length === 0) {
      throw new Error('No se encontraron topics válidos para los equipos del partido');
    }

    console.log('🟥 Enviando notificación de tarjeta roja:', {
      affectedTeam: teamCode,
      topics,
      matchId: match.id,
    });

    const teamName = getTeamFullName(teamCode);
    const minute = getMatchElapsedMinutes(match);

    // Generar ID único del evento para deduplicación en la app
    const eventId = generateEventId(match.id, 'red_card', `${minute}_${teamCode}_${player}`);

    // Enviar a AMBOS equipos
    await this.sendNotificationToTopics(topics, {
      title: '🟥 Tarjeta Roja',
      body: `${teamName}: ${player} expulsado (Min. ${minute}')`,
      eventType: 'red_card',
      data: {
        event_id: eventId, // ID único para deduplicación en la app iOS
        match_id: match.id,
        home_team: match.equipoLocalId || '',
        away_team: match.equipoVisitanteId || '',
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
}
