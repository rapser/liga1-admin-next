export interface FootballTeam {
  id: number;
  name: string;
  shortName?: string;
  nameCode?: string;
}

export interface FootballTournament {
  uniqueTournament?: { id?: number; name?: string };
  name?: string;
}

export interface FootballScore {
  current?: number;
  display?: number;
  period1?: number;
  period2?: number;
}

export interface FootballStatus {
  type?: string;
  code?: number;
  description?: string;
}

/** Formato interno normalizado, independiente del proveedor externo. */
export interface FootballEvent {
  provider: "espn";
  id: number;
  startTimestamp: number;
  homeTeam: FootballTeam;
  awayTeam: FootballTeam;
  homeScore?: FootballScore;
  awayScore?: FootballScore;
  status: FootballStatus;
  displayClock?: string;
  incidents?: FootballIncident[];
  tournament?: FootballTournament;
  roundInfo?: { round?: number };
  venue?: { stadium?: { name?: string }; name?: string };
  time?: { currentPeriodStartTimestamp?: number };
}

export interface FootballIncident {
  id?: number;
  incidentType?: string;
  incidentClass?: string;
  isHome?: boolean;
  time?: number;
  timeDisplay?: string;
  addedTime?: number;
  homeScore?: number;
  awayScore?: number;
  player?: { name?: string; shortName?: string };
}
