import { EspnProvider } from "./espn/espn.provider";
import { SofaScoreProvider } from "./sofascore/sofascore.provider";
import type {
  SofaScoreEvent,
  SofaScoreIncident,
} from "./sofascore/sofascore.types";

type ProviderChoice = "espn" | "sofascore" | "auto";

export class LiveFootballProvider {
  private readonly espn = new EspnProvider();
  private readonly sofascore = new SofaScoreProvider();
  private readonly choice = (process.env.LIVE_DATA_PROVIDER || "espn") as ProviderChoice;

  private async select<T>(sofascore: () => Promise<T>, espn: () => Promise<T>): Promise<T> {
    if (this.choice === "sofascore") return sofascore();
    if (this.choice === "espn") return espn();
    try {
      return await sofascore();
    } catch (error) {
      console.warn("SofaScore no disponible; se usará ESPN", error);
      return espn();
    }
  }

  fetchLiveEvents(): Promise<SofaScoreEvent[]> {
    return this.select(
      async () => (await this.sofascore.fetchLiveEvents()).map((event) => ({ ...event, provider: "sofascore" })),
      () => this.espn.fetchLiveEvents(),
    );
  }

  fetchScheduledEvents(date: Date): Promise<SofaScoreEvent[]> {
    return this.select(
      async () => (await this.sofascore.fetchScheduledEvents(date)).map((event) => ({ ...event, provider: "sofascore" })),
      () => this.espn.fetchScheduledEvents(date),
    );
  }

  fetchCurrentSeasonEvents(): Promise<SofaScoreEvent[]> {
    return this.select(
      async () => (await this.sofascore.fetchCurrentSeasonEvents()).map((event) => ({ ...event, provider: "sofascore" })),
      () => this.espn.fetchCurrentSeasonEvents(),
    );
  }

  fetchIncidents(event: SofaScoreEvent): Promise<SofaScoreIncident[]> {
    if (event.incidents) return Promise.resolve(event.incidents);
    if (event.provider === "espn") return this.espn.fetchIncidents(event.id);
    return this.sofascore.fetchIncidents(event.id);
  }
}
