import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { Message } from "firebase-admin/messaging";
import { adminDb, messaging } from "@/core/config/firebase-admin";
import {
  FIRESTORE_COLLECTIONS,
  TEAM_NAMES,
  type TorneoType,
} from "@/core/config/firestore-constants";
import { GENERAL_TOPIC, getTeamTopic } from "@/core/config/fcm-topics";
import { LiveFootballProvider } from "@/data/providers/live-football.provider";
import type {
  SofaScoreEvent,
  SofaScoreIncident,
} from "@/data/providers/sofascore/sofascore.types";
import { mapProviderTeam } from "./team-mapping";

export type LiveSyncMode = "live" | "fixtures" | "reconcile";

type LocalStatus =
  | "pendiente"
  | "envivo"
  | "finalizado"
  | "anulado"
  | "suspendido";

interface StoredMatch {
  jornadaId: string;
  matchId: string;
  torneo: TorneoType;
  equipoLocalId: string | null;
  equipoVisitanteId: string | null;
  fecha: Date;
  golesEquipoLocal: number;
  golesEquipoVisitante: number;
  estado: LocalStatus;
  suspendido: boolean;
  minutoActual?: string;
  golesDetalle: StoredGoalDetail[];
  providerEventId?: string | number;
  provider?: "sofascore" | "espn";
  syncMode?: "auto" | "manual";
}

interface StoredGoalDetail {
  id: string;
  nombre: string;
  minuto: string;
  equipo: "local" | "visitante";
  tipo: "gol" | "penal" | "autogol";
}

interface MatchChange {
  before: StoredMatch;
  after: StoredMatch;
  event: SofaScoreEvent;
  fields: string[];
}

interface StandingStats {
  matchesPlayed: number;
  matchesWon: number;
  matchesDrawn: number;
  matchesLost: number;
  goalsScored: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface LiveSyncResult {
  mode: LiveSyncMode;
  dryRun: boolean;
  providerEvents: number;
  matched: number;
  changed: number;
  skippedManual: number;
  unmatched: Array<{ eventId: number; home: string; away: string }>;
  notifications: number;
  standingsRebuilt: boolean;
  adoptUnconfigured: boolean;
  requestedEventId?: number;
}

function asDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate(): Date }).toDate();
  }
  return new Date(String(value));
}

function providerStatus(event: SofaScoreEvent): {
  estado: LocalStatus;
  suspendido: boolean;
  enDescanso: boolean;
} {
  const type = (event.status.type || "").toLowerCase();
  const description = (event.status.description || "").toLowerCase();

  if (["finished", "afterextra", "afterpenalties"].includes(type)) {
    return { estado: "finalizado", suspendido: false, enDescanso: false };
  }
  if (["canceled", "cancelled"].includes(type)) {
    return { estado: "anulado", suspendido: false, enDescanso: false };
  }
  if (["postponed", "suspended", "interrupted"].includes(type)) {
    return { estado: "suspendido", suspendido: true, enDescanso: false };
  }
  if (
    ["inprogress", "halftime", "extra", "penalties"].includes(type) ||
    description.includes("half") ||
    description.includes("tiempo")
  ) {
    return {
      estado: "envivo",
      suspendido: false,
      enDescanso: type === "halftime" || description.includes("half time"),
    };
  }
  return { estado: "pendiente", suspendido: false, enDescanso: false };
}

function getScore(event: SofaScoreEvent, side: "home" | "away", fallback: number): number {
  const score = side === "home" ? event.homeScore : event.awayScore;
  return score?.current ?? score?.display ?? fallback;
}

function parseStoredGoalDetails(value: unknown): StoredGoalDetail[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const goal = item as Record<string, unknown>;
    if (typeof goal.nombre !== "string" || typeof goal.minuto !== "string") return [];
    return [{
      id: String(goal.id || `${goal.nombre}-${goal.minuto}`),
      nombre: goal.nombre,
      minuto: goal.minuto,
      equipo: goal.equipo === "local" ? "local" as const : "visitante" as const,
      tipo:
        goal.tipo === "penal" || goal.tipo === "autogol"
          ? goal.tipo
          : "gol" as const,
    }];
  });
}

function goalDetailsFromIncidents(incidents: SofaScoreIncident[]): StoredGoalDetail[] {
  return incidents
    .filter((incident) => incident.incidentType === "goal")
    .map((incident, index) => ({
      id: String(incident.id || `goal-${index + 1}`),
      nombre: incident.player?.name || incident.player?.shortName || "Autor por confirmar",
      minuto:
        incident.timeDisplay ||
        (incident.time
          ? `${incident.time}${incident.addedTime ? `+${incident.addedTime}` : ""}'`
          : "—"),
      equipo: incident.isHome ? "local" : "visitante",
      tipo:
        incident.incidentClass === "penalty"
          ? "penal"
          : incident.incidentClass === "ownGoal"
            ? "autogol"
            : "gol",
    }));
}

function statsZero(): StandingStats {
  return {
    matchesPlayed: 0,
    matchesWon: 0,
    matchesDrawn: 0,
    matchesLost: 0,
    goalsScored: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  };
}

function addResult(stats: StandingStats, scored: number, conceded: number): void {
  stats.matchesPlayed += 1;
  stats.goalsScored += scored;
  stats.goalsAgainst += conceded;
  stats.goalDifference = stats.goalsScored - stats.goalsAgainst;
  if (scored > conceded) {
    stats.matchesWon += 1;
    stats.points += 3;
  } else if (scored === conceded) {
    stats.matchesDrawn += 1;
    stats.points += 1;
  } else {
    stats.matchesLost += 1;
  }
}

export class LiveSyncService {
  constructor(private readonly provider = new LiveFootballProvider()) {}

  async run(
    mode: LiveSyncMode,
    dryRun = false,
    adoptUnconfigured = false,
    requestedEventId?: number,
  ): Promise<LiveSyncResult> {
    const [allEvents, matches] = await Promise.all([
      this.fetchEvents(mode),
      this.fetchStoredMatches(),
    ]);
    const events = requestedEventId
      ? allEvents.filter((event) => event.id === requestedEventId)
      : allEvents;
    const result: LiveSyncResult = {
      mode,
      dryRun,
      providerEvents: events.length,
      matched: 0,
      changed: 0,
      skippedManual: 0,
      unmatched: [],
      notifications: 0,
      standingsRebuilt: false,
      adoptUnconfigured,
      requestedEventId,
    };
    const changes: MatchChange[] = [];

    for (const event of events) {
      const stored = this.findMatch(event, matches);
      if (!stored) {
        result.unmatched.push({
          eventId: event.id,
          home: event.homeTeam.name,
          away: event.awayTeam.name,
        });
        continue;
      }
      result.matched += 1;
      if (
        stored.syncMode === "manual" ||
        (!stored.syncMode && !adoptUnconfigured)
      ) {
        result.skippedManual += 1;
        continue;
      }

      const nextHomeScore = getScore(event, "home", stored.golesEquipoLocal);
      const nextAwayScore = getScore(event, "away", stored.golesEquipoVisitante);
      const nextGoalTotal = nextHomeScore + nextAwayScore;
      const scoreChanged =
        stored.golesEquipoLocal !== nextHomeScore ||
        stored.golesEquipoVisitante !== nextAwayScore;
      let goalDetails: StoredGoalDetail[] | undefined;

      if (nextGoalTotal === 0 && stored.golesDetalle.length > 0) {
        goalDetails = [];
      } else if (
        nextGoalTotal > 0 &&
        (scoreChanged || stored.golesDetalle.length !== nextGoalTotal)
      ) {
        try {
          event.incidents = await this.provider.fetchIncidents(event);
          const fetchedGoals = goalDetailsFromIncidents(event.incidents);
          if (fetchedGoals.length > 0) goalDetails = fetchedGoals;
        } catch (error) {
          console.warn("No se pudieron consultar goleadores", error);
        }
      }

      const change = this.buildChange(stored, event, goalDetails);
      if (!change) continue;
      result.changed += 1;
      changes.push(change);

      if (!dryRun) await this.persistChange(change);
    }

    if (!dryRun && changes.length > 0) {
      const affectsStandings = changes.some((change) =>
        change.fields.some((field) =>
          [
            "golesEquipoLocal",
            "golesEquipoVisitante",
            "estado",
            "suspendido",
          ].includes(field),
        ),
      );
      if (affectsStandings) {
        const freshMatches = await this.fetchStoredMatches();
        await this.rebuildStandings(freshMatches);
        result.standingsRebuilt = true;
      }
      if (mode !== "reconcile") {
        for (const change of changes) {
          const requiresClientRefresh = change.fields.some((field) =>
            [
              "fecha",
              "golesEquipoLocal",
              "golesEquipoVisitante",
              "estado",
              "suspendido",
            ].includes(field),
          );
          if (!requiresClientRefresh) continue;
          const allowVisible =
            mode === "live" &&
            String(change.before.providerEventId || "") === String(change.event.id);
          result.notifications += await this.notifyChange(change, allowVisible);
        }
      }
    }

    return result;
  }

  private async fetchEvents(mode: LiveSyncMode): Promise<SofaScoreEvent[]> {
    if (mode === "fixtures" || mode === "reconcile") {
      return this.provider.fetchCurrentSeasonEvents();
    }

    const now = new Date();
    const yesterday = new Date(now.getTime() - 86_400_000);
    const tomorrow = new Date(now.getTime() + 86_400_000);
    const groups = await Promise.all([
      this.provider.fetchLiveEvents(),
      this.provider.fetchScheduledEvents(yesterday),
      this.provider.fetchScheduledEvents(now),
      this.provider.fetchScheduledEvents(tomorrow),
    ]);
    const unique = new Map<number, SofaScoreEvent>();
    groups.flat().forEach((event) => unique.set(event.id, event));
    return [...unique.values()];
  }

  private async fetchStoredMatches(): Promise<StoredMatch[]> {
    const jornadas = await adminDb.collection(FIRESTORE_COLLECTIONS.JORNADAS).get();
    const matchGroups = await Promise.all(
      jornadas.docs.map(async (jornadaDoc) => {
        const jornadaData = jornadaDoc.data();
        const torneo: TorneoType =
          jornadaData.torneo === "clausura" || jornadaDoc.id.includes("clausura")
            ? "clausura"
            : "apertura";
        const snapshot = await jornadaDoc.ref
          .collection(FIRESTORE_COLLECTIONS.MATCHES)
          .get();
        return snapshot.docs.map((matchDoc): StoredMatch => {
          const data = matchDoc.data();
          const parts = matchDoc.id.split("_");
          return {
            jornadaId: jornadaDoc.id,
            matchId: matchDoc.id,
            torneo,
            equipoLocalId: data.equipoLocalId || parts[0] || null,
            equipoVisitanteId: data.equipoVisitanteId || parts[1] || null,
            fecha: asDate(data.fecha),
            golesEquipoLocal: data.golesEquipoLocal ?? 0,
            golesEquipoVisitante: data.golesEquipoVisitante ?? 0,
            estado: data.estado || "pendiente",
            suspendido: data.suspendido ?? false,
            minutoActual: data.minutoActual,
            golesDetalle: parseStoredGoalDetails(data.golesDetalle),
            providerEventId: data.providerEventId,
            provider: data.provider,
            syncMode: data.syncMode,
          };
        });
      }),
    );
    return matchGroups.flat();
  }

  private findMatch(event: SofaScoreEvent, matches: StoredMatch[]): StoredMatch | undefined {
    const byProviderId = matches.find(
      (match) =>
        String(match.providerEventId || "") === String(event.id) &&
        (!match.provider || match.provider === event.provider),
    );
    if (byProviderId) return byProviderId;

    const homeId = mapProviderTeam(event.homeTeam.name, event.homeTeam.shortName);
    const awayId = mapProviderTeam(event.awayTeam.name, event.awayTeam.shortName);
    if (!homeId || !awayId) return undefined;

    const kickoff = event.startTimestamp * 1000;
    return matches
      .filter(
        (match) =>
          match.equipoLocalId === homeId && match.equipoVisitanteId === awayId,
      )
      .sort(
        (a, b) =>
          Math.abs(a.fecha.getTime() - kickoff) -
          Math.abs(b.fecha.getTime() - kickoff),
      )[0];
  }

  private buildChange(
    stored: StoredMatch,
    event: SofaScoreEvent,
    goalDetails?: StoredGoalDetail[],
  ): MatchChange | null {
    const state = providerStatus(event);
    const nextDate = new Date(event.startTimestamp * 1000);
    const after: StoredMatch = {
      ...stored,
      fecha: nextDate,
      golesEquipoLocal: getScore(event, "home", stored.golesEquipoLocal),
      golesEquipoVisitante: getScore(event, "away", stored.golesEquipoVisitante),
      estado: state.estado,
      suspendido: state.suspendido,
      minutoActual: event.displayClock,
      golesDetalle: goalDetails ?? stored.golesDetalle,
      providerEventId: String(event.id),
      provider: event.provider || "sofascore",
      syncMode: stored.syncMode || "auto",
    };
    const fields: string[] = [];
    if (Math.abs(stored.fecha.getTime() - nextDate.getTime()) >= 60_000) fields.push("fecha");
    if (stored.golesEquipoLocal !== after.golesEquipoLocal) fields.push("golesEquipoLocal");
    if (stored.golesEquipoVisitante !== after.golesEquipoVisitante) fields.push("golesEquipoVisitante");
    if (stored.estado !== after.estado) fields.push("estado");
    if (stored.suspendido !== after.suspendido) fields.push("suspendido");
    if (stored.minutoActual !== after.minutoActual) fields.push("minutoActual");
    if (JSON.stringify(stored.golesDetalle) !== JSON.stringify(after.golesDetalle)) {
      fields.push("golesDetalle");
    }
    if (String(stored.providerEventId || "") !== String(event.id)) fields.push("providerEventId");
    if (stored.provider !== after.provider) fields.push("provider");
    if (!stored.syncMode) fields.push("syncMode");

    return fields.length > 0 ? { before: stored, after, event, fields } : null;
  }

  private async persistChange(change: MatchChange): Promise<void> {
    const { after, event } = change;
    const state = providerStatus(event);
    const ref = adminDb
      .collection(FIRESTORE_COLLECTIONS.JORNADAS)
      .doc(after.jornadaId)
      .collection(FIRESTORE_COLLECTIONS.MATCHES)
      .doc(after.matchId);
    const description = (event.status.description || "").toLowerCase();
    await ref.set(
      {
        fecha: Timestamp.fromDate(after.fecha),
        golesEquipoLocal: after.golesEquipoLocal,
        golesEquipoVisitante: after.golesEquipoVisitante,
        estado: after.estado,
        suspendido: after.suspendido,
        minutoActual: after.minutoActual || null,
        golesDetalle: after.golesDetalle,
        enDescanso: state.enDescanso,
        primeraParte:
          after.estado === "envivo" &&
          !description.includes("2nd") &&
          !description.includes("second"),
        ...(after.estado === "envivo" && change.before.estado !== "envivo"
          ? { horaInicio: Timestamp.fromDate(new Date()) }
          : {}),
        provider: event.provider || "sofascore",
        providerEventId: String(event.id),
        providerStatus: event.status.type || event.status.description || "unknown",
        providerHomeTeamId: String(event.homeTeam.id),
        providerAwayTeamId: String(event.awayTeam.id),
        lastProviderSyncAt: FieldValue.serverTimestamp(),
        syncMode: after.syncMode || "auto",
      },
      { merge: true },
    );
  }

  private async rebuildStandings(matches: StoredMatch[]): Promise<void> {
    const tournamentStats: Record<TorneoType, Record<string, StandingStats>> = {
      apertura: {},
      clausura: {},
    };
    for (const torneo of ["apertura", "clausura"] as const) {
      for (const teamId of Object.keys(TEAM_NAMES)) {
        tournamentStats[torneo][teamId] = statsZero();
      }
    }

    for (const match of matches) {
      if (
        !match.equipoLocalId ||
        !match.equipoVisitanteId ||
        match.suspendido ||
        !["envivo", "finalizado"].includes(match.estado)
      ) continue;
      const home = tournamentStats[match.torneo][match.equipoLocalId];
      const away = tournamentStats[match.torneo][match.equipoVisitanteId];
      if (!home || !away) continue;
      addResult(home, match.golesEquipoLocal, match.golesEquipoVisitante);
      addResult(away, match.golesEquipoVisitante, match.golesEquipoLocal);
    }

    const batch = adminDb.batch();
    for (const teamId of Object.keys(TEAM_NAMES)) {
      const apertura = tournamentStats.apertura[teamId] || statsZero();
      const clausura = tournamentStats.clausura[teamId] || statsZero();
      batch.set(adminDb.collection(FIRESTORE_COLLECTIONS.APERTURA).doc(teamId), apertura, { merge: true });
      batch.set(adminDb.collection(FIRESTORE_COLLECTIONS.CLAUSURA).doc(teamId), clausura, { merge: true });
      const acumulado = statsZero();
      for (const key of Object.keys(acumulado) as Array<keyof StandingStats>) {
        acumulado[key] = apertura[key] + clausura[key];
      }
      batch.set(adminDb.collection(FIRESTORE_COLLECTIONS.ACUMULADO).doc(teamId), acumulado, { merge: true });
    }
    await batch.commit();
  }

  private async claimNotification(eventId: string): Promise<boolean> {
    const ref = adminDb.collection(FIRESTORE_COLLECTIONS.LIVE_SYNC_EVENTS).doc(eventId);
    return adminDb.runTransaction(async (transaction) => {
      const current = await transaction.get(ref);
      if (current.exists && current.data()?.status !== "failed") return false;
      if (current.exists) {
        transaction.update(ref, {
          status: "claimed",
          retryCount: FieldValue.increment(1),
          claimedAt: FieldValue.serverTimestamp(),
        });
        return true;
      }
      transaction.create(ref, {
        eventId,
        provider: "live-football",
        status: "claimed",
        createdAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
  }

  private async sendOnce(eventId: string, message: Message): Promise<boolean> {
    if (!(await this.claimNotification(eventId))) return false;
    try {
      const messageId = await messaging.send(message);
      await adminDb.collection(FIRESTORE_COLLECTIONS.LIVE_SYNC_EVENTS).doc(eventId).set(
        { status: "sent", messageId, sentAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      return true;
    } catch (error) {
      await adminDb.collection(FIRESTORE_COLLECTIONS.LIVE_SYNC_EVENTS).doc(eventId).set(
        { status: "failed", error: error instanceof Error ? error.message : String(error) },
        { merge: true },
      );
      console.error("No se pudo enviar push", eventId, error);
      return false;
    }
  }

  private visibleMessage(
    topic: string,
    title: string,
    body: string,
    eventType: string,
    eventId: string,
    change: MatchChange,
    extra: Record<string, string> = {},
  ): Message {
    return {
      topic,
      notification: { title, body },
      data: {
        event_type: eventType,
        event_id: eventId,
        match_id: change.after.matchId,
        jornada_id: change.after.jornadaId,
        home_team: change.after.equipoLocalId || "",
        away_team: change.after.equipoVisitanteId || "",
        home_score: String(change.after.golesEquipoLocal),
        away_score: String(change.after.golesEquipoVisitante),
        ...extra,
      },
      apns: { payload: { aps: { sound: "default", badge: 1 } } },
    };
  }

  private async notifyChange(change: MatchChange, allowVisible: boolean): Promise<number> {
    let count = 0;
    const homeName = TEAM_NAMES[change.after.equipoLocalId || ""] || "Local";
    const awayName = TEAM_NAMES[change.after.equipoVisitanteId || ""] || "Visitante";
    const topics = [
      getTeamTopic(change.after.equipoLocalId || ""),
      getTeamTopic(change.after.equipoVisitanteId || ""),
    ].filter((topic): topic is string => Boolean(topic));
    const providerName = change.event.provider || "sofascore";

    if (allowVisible && change.before.estado !== "envivo" && change.after.estado === "envivo") {
      for (const topic of topics) {
        const id = `${providerName}-${change.event.id}-start-${topic}`;
        if (await this.sendOnce(id, this.visibleMessage(topic, "🎯 ¡Comienza el partido!", `${homeName} vs ${awayName} - ¡Ya empezó!`, "match_start", id, change))) count += 1;
      }
    }

    const oldTotal = change.before.golesEquipoLocal + change.before.golesEquipoVisitante;
    const newTotal = change.after.golesEquipoLocal + change.after.golesEquipoVisitante;
    if (allowVisible && newTotal > oldTotal) {
      let incidents: SofaScoreIncident[] = [];
      try {
        incidents = (await this.provider.fetchIncidents(change.event)).filter(
          (incident) =>
            incident.incidentType === "goal" &&
            (incident.homeScore ?? 0) + (incident.awayScore ?? 0) > oldTotal,
        );
      } catch (error) {
        console.warn("No se pudieron consultar incidencias; se usará el marcador", error);
      }
      const goalCount = newTotal - oldTotal;
      for (let index = 0; index < goalCount; index += 1) {
        const incident = incidents[index];
        const homeDelta = change.after.golesEquipoLocal - change.before.golesEquipoLocal;
        const isHome = incident?.isHome ?? index < homeDelta;
        const scoringId = isHome ? change.after.equipoLocalId : change.after.equipoVisitanteId;
        const scoringName = TEAM_NAMES[scoringId || ""] || "un equipo";
        const minute = incident?.timeDisplay || (incident?.time ? `${incident.time}'` : "");
        const scorer = incident?.player?.name || incident?.player?.shortName;
        for (const topic of topics) {
          const goalKey = incident?.id || `${oldTotal + index + 1}-${isHome ? "home" : "away"}`;
          const id = `${providerName}-${change.event.id}-goal-${goalKey}-${topic}`;
          const detail = [minute, scorer].filter(Boolean).join(" - ");
          const body = `${homeName} ${change.after.golesEquipoLocal} - ${change.after.golesEquipoVisitante} ${awayName}${detail ? ` (${detail})` : ""}`;
          if (await this.sendOnce(id, this.visibleMessage(topic, `⚽ ¡Gol de ${scoringName}!`, body, "goal", id, change, { scoring_team: scoringId || "", minute: String(incident?.time || ""), scorer: scorer || "" }))) count += 1;
        }
      }
    }

    if (allowVisible && change.before.estado !== "finalizado" && change.after.estado === "finalizado") {
      for (const topic of topics) {
        const id = `${providerName}-${change.event.id}-end-${topic}`;
        const body = `${homeName} ${change.after.golesEquipoLocal} - ${change.after.golesEquipoVisitante} ${awayName}`;
        if (await this.sendOnce(id, this.visibleMessage(topic, "⏱️ Resultado final", body, "match_end", id, change))) count += 1;
      }
    }

    const silentId = `${providerName}-${change.event.id}-update-${change.after.estado}-${change.after.golesEquipoLocal}-${change.after.golesEquipoVisitante}-${change.after.fecha.getTime()}`;
    if (
      await this.sendOnce(silentId, {
        topic: GENERAL_TOPIC,
        data: {
          type: "score_update",
          event_id: silentId,
          matchId: change.after.matchId,
          jornadaId: change.after.jornadaId,
          golesTeamA: String(change.after.golesEquipoLocal),
          golesTeamB: String(change.after.golesEquipoVisitante),
          estado: change.after.estado,
        },
        apns: {
          headers: { "apns-push-type": "background", "apns-priority": "5" },
          payload: { aps: { "content-available": 1 } },
        },
        android: { priority: "high" },
      })
    ) count += 1;
    return count;
  }
}
