import type { SofaScoreEvent } from "../sofascore/sofascore.types";

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

const DEFAULT_BASE_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/per.1";

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
}
