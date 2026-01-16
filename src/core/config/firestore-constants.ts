/**
 * Constantes de Firestore para Liga 1 Admin
 * Refleja la estructura de la base de datos Firebase
 */

export const FIRESTORE_COLLECTIONS = {
  JORNADAS: "jornadas",
  MATCHES: "matches", // Subcolección de jornadas
  APERTURA: "apertura",
  CLAUSURA: "clausura",
  ACUMULADO: "acumulado",
  NEWS: "news",
  USERS: "admins", // Cambiar a 'admins' para coincidir con la app iOS
} as const;

export const TEAM_CODES = {
  ALI: "ali", // Alianza Lima
  UNI: "uni", // Universitario
  CRI: "cri", // Sporting Cristal
  CIE: "cie", // Cienciano
  CUS: "cus", // Cusco FC
  ADT: "adt", // ADT
  ATL: "atl", // Alianza Atlético
  MEL: "mel", // Melgar
  GRA: "gra", // Atlético Grau
  GAR: "gar", // Deportivo Garcilaso
  SBA: "sba", // Sport Boys
  CHA: "cha", // Los Chankas
  UTC: "utc", // UTC
  HUA: "hua", // Sport Huancayo
  COU: "cou", // Comerciantes Unidos
  JPA: "jpa", // Juan Pablo II College
  CAJ: "caj", // FC Cajamarca
  MOQ: "moq", // Deportivo Moquegua
} as const;

/**
 * Mapeo de códigos de equipos a nombres completos
 */
export const TEAM_NAMES: Record<string, string> = {
  ali: "Alianza Lima",
  uni: "Universitario",
  cri: "Sporting Cristal",
  cie: "Cienciano",
  cus: "Cusco FC",
  adt: "ADT",
  atl: "Alianza Atlético",
  mel: "Melgar",
  gra: "Atlético Grau",
  gar: "Deportivo Garcilaso",
  sba: "Sport Boys",
  cha: "Los Chankas",
  utc: "UTC",
  hua: "Sport Huancayo",
  cou: "Comerciantes Unidos",
  jpa: "Juan Pablo II College",
  caj: "FC Cajamarca",
  moq: "Deportivo Moquegua",
};

/**
 * Obtiene el nombre completo de un equipo a partir de su código
 */
export const getTeamFullName = (teamId: string): string => {
  return TEAM_NAMES[teamId.toLowerCase()] || "Equipo Desconocido";
};

export type TeamCode = (typeof TEAM_CODES)[keyof typeof TEAM_CODES];
export type TorneoType = "apertura" | "clausura";
export type EstadoMatch =
  | "pendiente"
  | "envivo"
  | "finalizado"
  | "anulado"
  | "suspendido";

export const ESTADO_MATCH_LABELS: Record<EstadoMatch, string> = {
  pendiente: "Pendiente",
  envivo: "En Vivo",
  finalizado: "Finalizado",
  anulado: "Anulado",
  suspendido: "Suspendido",
};

export const TORNEO_LABELS: Record<TorneoType | "acumulado", string> = {
  apertura: "Torneo Apertura",
  clausura: "Torneo Clausura",
  acumulado: "Tabla Acumulada",
};
