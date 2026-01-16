/**
 * Constantes de Firestore para Liga 1 Admin
 * Refleja la estructura de la base de datos Firebase
 */

export const FIRESTORE_COLLECTIONS = {
  JORNADAS: 'jornadas',
  MATCHES: 'matches', // Subcolección de jornadas
  APERTURA: 'apertura',
  CLAUSURA: 'clausura',
  ACUMULADO: 'acumulado',
  NEWS: 'news',
  USERS: 'admins', // Cambiar a 'admins' para coincidir con la app iOS
} as const;

export const TEAM_CODES = {
  ALI: 'ali', // Alianza Lima
  UNI: 'uni', // Universitario
  CRI: 'cri', // Sporting Cristal
  MEL: 'mel', // Melgar
  CUS: 'cus', // Cusco FC
  MUN: 'mun', // Deportivo Municipal
  GAR: 'gar', // Sport Boys
  GRA: 'gra', // Atlético Grau
  MAN: 'man', // Mannucci
  ADT: 'adt', // ADT
  AYA: 'aya', // Ayacucho FC
  UTC: 'utc', // UTC
  VAL: 'val', // Unión Comercio
  HUA: 'hua', // Sport Huancayo
  BIN: 'bin', // Binacional
  CIE: 'cie', // Cienciano
  ACA: 'aca', // Academia Cantolao
  ATE: 'ate', // Atlético Torino
} as const;

export type TeamCode = typeof TEAM_CODES[keyof typeof TEAM_CODES];
export type TorneoType = 'apertura' | 'clausura';
export type EstadoMatch = 'pendiente' | 'envivo' | 'finalizado' | 'anulado' | 'suspendido';

export const ESTADO_MATCH_LABELS: Record<EstadoMatch, string> = {
  pendiente: 'Pendiente',
  envivo: 'En Vivo',
  finalizado: 'Finalizado',
  anulado: 'Anulado',
  suspendido: 'Suspendido',
};

export const TORNEO_LABELS: Record<TorneoType | 'acumulado', string> = {
  apertura: 'Torneo Apertura',
  clausura: 'Torneo Clausura',
  acumulado: 'Tabla Acumulada',
};
