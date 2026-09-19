import { EspnProvider } from "./espn/espn.provider";
import type {
  FootballEvent,
  FootballIncident,
} from "./football.types";

export class LiveFootballProvider {
  private readonly espn = new EspnProvider();

  fetchLiveEvents(): Promise<FootballEvent[]> {
    return this.espn.fetchLiveEvents();
  }

  fetchScheduledEvents(date: Date): Promise<FootballEvent[]> {
    return this.espn.fetchScheduledEvents(date);
  }

  fetchCurrentSeasonEvents(): Promise<FootballEvent[]> {
    return this.espn.fetchCurrentSeasonEvents();
  }

  fetchIncidents(event: FootballEvent): Promise<FootballIncident[]> {
    if (event.incidents) return Promise.resolve(event.incidents);
    return this.espn.fetchIncidents(event.id);
  }
}
