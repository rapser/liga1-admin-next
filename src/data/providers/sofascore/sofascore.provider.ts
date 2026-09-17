import type {
  SofaScoreEvent,
  SofaScoreEventsResponse,
  SofaScoreIncident,
  SofaScoreIncidentsResponse,
  SofaScoreSeason,
} from "./sofascore.types";

const DEFAULT_BASE_URL = "https://www.sofascore.com/api/v1";
const DEFAULT_TOURNAMENT_ID = 406;
const REQUEST_TIMEOUT_MS = 12_000;

export class SofaScoreProvider {
  readonly tournamentId = Number(
    process.env.SOFASCORE_TOURNAMENT_ID || DEFAULT_TOURNAMENT_ID,
  );

  private readonly baseUrl = (
    process.env.SOFASCORE_BASE_URL || DEFAULT_BASE_URL
  ).replace(/\/$/, "");

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "Liga1LiveSync/1.0 (contact: admin Liga 1)",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`SofaScore respondió ${response.status} para ${path}`);
    }

    return (await response.json()) as T;
  }

  private belongsToLiga1(event: SofaScoreEvent): boolean {
    return event.tournament?.uniqueTournament?.id === this.tournamentId;
  }

  async fetchLiveEvents(): Promise<SofaScoreEvent[]> {
    const data = await this.request<SofaScoreEventsResponse>(
      "/sport/football/events/live",
    );
    return (data.events || []).filter((event) => this.belongsToLiga1(event));
  }

  async fetchScheduledEvents(date: Date): Promise<SofaScoreEvent[]> {
    const day = date.toISOString().slice(0, 10);
    const data = await this.request<SofaScoreEventsResponse>(
      `/sport/football/scheduled-events/${day}`,
    );
    return (data.events || []).filter((event) => this.belongsToLiga1(event));
  }

  async fetchEvent(eventId: number): Promise<SofaScoreEvent> {
    const data = await this.request<{ event: SofaScoreEvent }>(
      `/event/${eventId}`,
    );
    return data.event;
  }

  async fetchIncidents(eventId: number): Promise<SofaScoreIncident[]> {
    const data = await this.request<SofaScoreIncidentsResponse>(
      `/event/${eventId}/incidents`,
    );
    return data.incidents || [];
  }

  async fetchCurrentSeasonEvents(): Promise<SofaScoreEvent[]> {
    const seasons = await this.request<{ seasons?: SofaScoreSeason[] }>(
      `/unique-tournament/${this.tournamentId}/seasons`,
    );
    const targetYear = process.env.LIGA1_SEASON || String(new Date().getFullYear());
    const season = (seasons.seasons || []).find((item) =>
      `${item.name || ""} ${item.year || ""}`.includes(targetYear),
    );

    if (!season) {
      throw new Error(`No se encontró la temporada ${targetYear} en SofaScore`);
    }

    const events = new Map<number, SofaScoreEvent>();
    for (const direction of ["last", "next"] as const) {
      for (let page = 0; page < 10; page += 1) {
        const data = await this.request<SofaScoreEventsResponse>(
          `/unique-tournament/${this.tournamentId}/season/${season.id}/events/${direction}/${page}`,
        );
        for (const event of data.events || []) {
          if (this.belongsToLiga1(event)) events.set(event.id, event);
        }
        if (!data.hasNextPage) break;
      }
    }

    return [...events.values()];
  }
}
