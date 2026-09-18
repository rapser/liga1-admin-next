export interface SofaScoreTeam {
  id: number;
  name: string;
  shortName?: string;
  nameCode?: string;
}

export interface SofaScoreTournament {
  uniqueTournament?: { id?: number; name?: string };
  name?: string;
}

export interface SofaScoreScore {
  current?: number;
  display?: number;
  period1?: number;
  period2?: number;
}

export interface SofaScoreStatus {
  type?: string;
  code?: number;
  description?: string;
}

export interface SofaScoreEvent {
  provider?: "sofascore" | "espn";
  id: number;
  startTimestamp: number;
  homeTeam: SofaScoreTeam;
  awayTeam: SofaScoreTeam;
  homeScore?: SofaScoreScore;
  awayScore?: SofaScoreScore;
  status: SofaScoreStatus;
  /** Reloj oficial ya formateado: 23', 45+2', ET, FT, etc. */
  displayClock?: string;
  tournament?: SofaScoreTournament;
  roundInfo?: { round?: number };
  venue?: { stadium?: { name?: string }; name?: string };
  time?: { currentPeriodStartTimestamp?: number };
}

export interface SofaScoreIncident {
  id?: number;
  incidentType?: string;
  incidentClass?: string;
  isHome?: boolean;
  time?: number;
  addedTime?: number;
  homeScore?: number;
  awayScore?: number;
  player?: { name?: string; shortName?: string };
}

export interface SofaScoreEventsResponse {
  events?: SofaScoreEvent[];
  hasNextPage?: boolean;
}

export interface SofaScoreIncidentsResponse {
  incidents?: SofaScoreIncident[];
}

export interface SofaScoreSeason {
  id: number;
  name?: string;
  year?: string;
}
