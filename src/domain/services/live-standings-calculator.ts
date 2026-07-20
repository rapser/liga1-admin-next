export interface LiveStandingStats {
  partidosJugados: number;
  partidosGanados: number;
  partidosEmpatados: number;
  partidosPerdidos: number;
  golesFavor: number;
  golesContra: number;
  diferenciaGoles: number;
  puntos: number;
}

export interface LiveScore {
  local: number;
  visitante: number;
}

type TeamSide = "local" | "visitante";

interface ResultContribution {
  ganados: number;
  empatados: number;
  perdidos: number;
}

const validateScore = (score: LiveScore): void => {
  if (
    !Number.isInteger(score.local) ||
    !Number.isInteger(score.visitante) ||
    score.local < 0 ||
    score.visitante < 0
  ) {
    throw new Error("El marcador debe contener goles enteros no negativos");
  }
};

const getResultContribution = (
  score: LiveScore,
  side: TeamSide,
): ResultContribution => {
  const golesFavor = side === "local" ? score.local : score.visitante;
  const golesContra = side === "local" ? score.visitante : score.local;

  return {
    ganados: golesFavor > golesContra ? 1 : 0,
    empatados: golesFavor === golesContra ? 1 : 0,
    perdidos: golesFavor < golesContra ? 1 : 0,
  };
};

/**
 * Calcula la nueva estadística en vivo retirando primero la contribución
 * del marcador anterior y aplicando después la del marcador actual.
 *
 * previousScore=null representa el inicio del partido: todavía no existe
 * una contribución previa que retirar, por lo que el 0-0 inicial se registra
 * como empate provisional para ambos equipos.
 */
export const calculateLiveStandingTransition = (
  team: LiveStandingStats,
  side: TeamSide,
  currentScore: LiveScore,
  previousScore: LiveScore | null,
  incrementMatchesPlayed = false,
): LiveStandingStats => {
  validateScore(currentScore);
  if (previousScore) validateScore(previousScore);

  const currentResult = getResultContribution(currentScore, side);
  const previousResult = previousScore
    ? getResultContribution(previousScore, side)
    : { ganados: 0, empatados: 0, perdidos: 0 };

  const previousGoalsFor = previousScore
    ? side === "local"
      ? previousScore.local
      : previousScore.visitante
    : 0;
  const previousGoalsAgainst = previousScore
    ? side === "local"
      ? previousScore.visitante
      : previousScore.local
    : 0;
  const currentGoalsFor =
    side === "local" ? currentScore.local : currentScore.visitante;
  const currentGoalsAgainst =
    side === "local" ? currentScore.visitante : currentScore.local;

  const partidosGanados =
    Math.max(0, team.partidosGanados - previousResult.ganados) +
    currentResult.ganados;
  const partidosEmpatados =
    Math.max(0, team.partidosEmpatados - previousResult.empatados) +
    currentResult.empatados;
  const partidosPerdidos =
    Math.max(0, team.partidosPerdidos - previousResult.perdidos) +
    currentResult.perdidos;
  const golesFavor =
    team.golesFavor - previousGoalsFor + currentGoalsFor;
  const golesContra =
    team.golesContra - previousGoalsAgainst + currentGoalsAgainst;

  return {
    partidosJugados:
      team.partidosJugados + (incrementMatchesPlayed ? 1 : 0),
    partidosGanados,
    partidosEmpatados,
    partidosPerdidos,
    golesFavor,
    golesContra,
    diferenciaGoles: golesFavor - golesContra,
    puntos: partidosGanados * 3 + partidosEmpatados,
  };
};
