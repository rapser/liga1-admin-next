/**
 * Configuración de Topics de FCM para Push Notifications
 * Mapea códigos de equipos a topics de Firebase Cloud Messaging
 */

import { TeamCode } from './firestore-constants';

/**
 * Mapeo de códigos de equipos a topics de FCM
 * Formato: team_{codigo_equipo}
 */
export const TEAM_TOPICS: Record<TeamCode, string> = {
  ali: 'team_ali', // Alianza Lima
  uni: 'team_uni', // Universitario
  cri: 'team_cri', // Sporting Cristal
  cie: 'team_cie', // Cienciano
  cus: 'team_cus', // Cusco FC
  adt: 'team_adt', // ADT
  atl: 'team_atl', // Alianza Atlético
  mel: 'team_mel', // Melgar
  gra: 'team_gra', // Atlético Grau
  gar: 'team_gar', // Deportivo Garcilaso
  sba: 'team_sba', // Sport Boys
  cha: 'team_cha', // Los Chankas
  utc: 'team_utc', // UTC Cajamarca
  hua: 'team_hua', // Sport Huancayo
  cou: 'team_cou', // Comerciantes Unidos
  jpa: 'team_jpa', // Juan Pablo II College
  caj: 'team_caj', // FC Cajamarca
  moq: 'team_moq', // Deportivo Moquegua
};

/**
 * Topic general para notificaciones de toda la liga
 */
export const GENERAL_TOPIC = 'liga1_all';

/**
 * Obtiene el topic de FCM para un equipo dado su código
 */
export const getTeamTopic = (teamCode: string): string | null => {
  const normalizedCode = teamCode.toLowerCase() as TeamCode;
  return TEAM_TOPICS[normalizedCode] || null;
};

/**
 * Obtiene todos los topics de equipos
 */
export const getAllTeamTopics = (): string[] => {
  return Object.values(TEAM_TOPICS);
};

/**
 * Obtiene los topics de FCM para un partido (ambos equipos)
 * @param match - El partido con equipoLocalId y equipoVisitanteId
 * @returns Array de topics (team_local, team_visitante)
 */
export const getTopicsForMatch = (match: { equipoLocalId: string | null; equipoVisitanteId: string | null }): string[] => {
  const topics: string[] = [];
  
  if (match.equipoLocalId) {
    const localTopic = getTeamTopic(match.equipoLocalId);
    if (localTopic) {
      topics.push(localTopic);
    }
  }
  
  if (match.equipoVisitanteId) {
    const visitorTopic = getTeamTopic(match.equipoVisitanteId);
    if (visitorTopic) {
      topics.push(visitorTopic);
    }
  }
  
  return topics;
};

/**
 * Tipos de eventos que pueden generar notificaciones
 */
export type NotificationEventType =
  | 'goal' // Gol
  | 'match_start' // Inicio de partido
  | 'match_end' // Resultado final
  | 'red_card' // Tarjeta roja
  | 'news'; // Noticia general
