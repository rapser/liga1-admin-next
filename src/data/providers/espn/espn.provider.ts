import type {
  SofaScoreEvent,
  SofaScoreIncident,
} from "../sofascore/sofascore.types";

interface EspnCompetitor {
  homeAway?: "home" | "away";
  score?: string;
  team?: {
    id?: string;
    displayName?: string;
    shortDisplayName?: string;
    abbreviation?: string;
  };
}

interface EspnEvent {
  id: string;
  date: string;
  status?: {
    type?: {
      state?: "pre" | "in" | "post";
      completed?: boolean;
      name?: string;
      description?: string;
      detail?: string;
    };
  };
  competitions?: Array<{
    competitors?: EspnCompetitor[];
    venue?: { fullName?: string };
  }>;
}

interface EspnKeyEvent {
  id?: string;
  scoringPlay?: boolean;
  text?: string;
  type?: { type?: string; text?: string };
  clock?: { value?: number; displayValue?: string };
  team?: { id?: string };
  participants?: Array<{
    athlete?: { displayName?: string; shortName?: string };
  }>;
}

interface EspnSummary {
  header?: {
    competitions?: Array<{
      competitors?: Array<{ id?: string; homeAway?: "home" | "away" }>;
    }>;
  };
  keyEvents?: EspnKeyEvent[];
}

const DEFAULT_BASE_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/per.1";

function normalizeDisplayClock(value?: string): string | undefined {
  return value?.replace(/^(\d+)'?\+(\d+)'?$/, "$1+$2'");
}

export class EspnProvider {
  private readonly baseUrl = (
    process.env.ESPN_BASE_URL || DEFAULT_BASE_URL
  ).replace(/\/$/, "");

  private async request(params: URLSearchParams): Promise<SofaScoreEvent[]> {
    const response = await fetch(`${this.baseUrl}/scoreboard?${params}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      throw new Error(`ESPN respondió ${response.status}`);
    }
    const data = (await response.json()) as { events?: EspnEvent[] };
    return (data.events || []).map((event) => this.normalize(event)).filter(Boolean) as SofaScoreEvent[];
  }

  private normalize(event: EspnEvent): SofaScoreEvent | null {
    const competition = event.competitions?.[0];
    const home = competition?.competitors?.find((item) => item.homeAway === "home");
    const away = competition?.competitors?.find((item) => item.homeAway === "away");
    if (!home?.team || !away?.team) return null;
    const rawStatus = event.status?.type;
    const label = `${rawStatus?.name || ""} ${rawStatus?.description || ""}`.toLowerCase();
    let statusType = "notstarted";
    if (rawStatus?.completed) statusType = "finished";
    else if (label.includes("postpon")) statusType = "postponed";
    else if (label.includes("suspend") || label.includes("interrupt")) statusType = "suspended";
    else if (label.includes("cancel")) statusType = "canceled";
    else if (rawStatus?.state === "in") {
      statusType =
        label.includes("half time") || label.includes("halftime")
          ? "halftime"
          : "inprogress";
    }

    return {
      provider: "espn",
      id: Number(event.id),
      startTimestamp: Math.floor(new Date(event.date).getTime() / 1000),
      homeTeam: {
        id: Number(home.team.id || 0),
        name: home.team.displayName || home.team.shortDisplayName || "Local",
        shortName: home.team.shortDisplayName,
        nameCode: home.team.abbreviation,
      },
      awayTeam: {
        id: Number(away.team.id || 0),
        name: away.team.displayName || away.team.shortDisplayName || "Visitante",
        shortName: away.team.shortDisplayName,
        nameCode: away.team.abbreviation,
      },
      homeScore: { current: Number(home.score || 0) },
      awayScore: { current: Number(away.score || 0) },
      status: {
        type: statusType,
        description: rawStatus?.description || rawStatus?.detail,
      },
      displayClock: normalizeDisplayClock(rawStatus?.detail || rawStatus?.description),
      tournament: { uniqueTournament: { id: 406, name: "Peruvian Liga 1" } },
      venue: { name: competition?.venue?.fullName },
    };
  }

  private dateParam(date: Date): string {
    return date.toISOString().slice(0, 10).replaceAll("-", "");
  }

  async fetchScheduledEvents(date: Date): Promise<SofaScoreEvent[]> {
    return this.request(new URLSearchParams({ dates: this.dateParam(date), limit: "100" }));
  }

  async fetchLiveEvents(): Promise<SofaScoreEvent[]> {
    const events = await this.fetchScheduledEvents(new Date());
    return events.filter((event) => ["inprogress", "halftime"].includes(event.status.type || ""));
  }

  async fetchCurrentSeasonEvents(): Promise<SofaScoreEvent[]> {
    const year = process.env.LIGA1_SEASON || String(new Date().getFullYear());
    return this.request(new URLSearchParams({ dates: year, limit: "500" }));
  }

  async fetchIncidents(eventId: number): Promise<SofaScoreIncident[]> {
    const response = await fetch(`${this.baseUrl}/summary?event=${eventId}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      throw new Error(`ESPN respondió ${response.status} al consultar incidencias`);
    }

    const data = (await response.json()) as EspnSummary;
    const competitors = data.header?.competitions?.[0]?.competitors || [];
    const homeId = competitors.find((item) => item.homeAway === "home")?.id;
    let homeScore = 0;
    let awayScore = 0;

    return (data.keyEvents || [])
      .filter((item) => {
        const type = `${item.type?.type || ""} ${item.type?.text || ""}`.toLowerCase();
        return item.scoringPlay === true || type.includes("red card");
      })
      .map((item) => {
        const isHome = Boolean(homeId && item.team?.id === homeId);
        const isGoal = item.scoringPlay === true;
        if (isGoal && isHome) homeScore += 1;
        else if (isGoal) awayScore += 1;
        const display = item.clock?.displayValue || "";
        const minuteParts = display.match(/(\d+)(?:\+(\d+))?/);
        const text = `${item.type?.type || ""} ${item.type?.text || ""} ${item.text || ""}`.toLowerCase();
        return {
          id: Number(item.id || 0),
          incidentType: isGoal ? "goal" : "card",
          incidentClass: isGoal
            ? text.includes("own goal")
              ? "ownGoal"
              : text.includes("penalty")
                ? "penalty"
                : "regular"
            : "red",
          isHome,
          time: minuteParts ? Number(minuteParts[1]) : undefined,
          addedTime: minuteParts?.[2] ? Number(minuteParts[2]) : undefined,
          timeDisplay: display,
          homeScore,
          awayScore,
          player: {
            name: item.participants?.[0]?.athlete?.displayName,
            shortName: item.participants?.[0]?.athlete?.shortName,
          },
        } satisfies SofaScoreIncident;
      });
  }
}
