/**
 * Página de Equipos
 * Plantilla de cada equipo (equipos/{code}/players), sincronizada con Transfermarkt
 * pegando la tabla de la plantilla; búsqueda de fotos en Wikidata y edición manual
 * de la foto de cada jugador.
 * También gestiona las sanciones de puntos (equipos/{code}.sanctions), que solo
 * restan en la tabla acumulada.
 */

"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  deleteField,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { toast } from "sonner";
import { Gavel, ImageIcon, Loader2, Plus, Trash2, Users } from "lucide-react";
import { db } from "@/core/config/firebase";
import {
  FIRESTORE_COLLECTIONS,
  TEAM_NAMES,
} from "@/core/config/firestore-constants";
import { useRequireAuth } from "@/presentation/hooks/use-require-auth";
import { TeamRepository } from "@/data/repositories/team.repository";
import {
  PointSanction,
  totalSanctionPoints,
} from "@/domain/entities/point-sanction.entity";
import { PageHeader } from "@/presentation/components/shared";
import { TransfermarktSyncDialog } from "@/presentation/components/features/squads/transfermarkt-sync-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Position = "GK" | "DF" | "MF" | "FW";
type PhotoSource = "manual" | "wikidata" | "transfermarkt";

interface Player {
  id: string;
  name: string;
  number: number | null;
  position: Position;
  active: boolean;
  photoURL?: string;
  photoSource?: PhotoSource;
}

const POSITION_ORDER: Position[] = ["GK", "DF", "MF", "FW"];
const POSITION_LABELS: Record<Position, string> = {
  GK: "Portero",
  DF: "Defensa",
  MF: "Mediocampista",
  FW: "Delantero",
};
const SOURCE_LABELS: Record<PhotoSource, string> = {
  manual: "Manual",
  wikidata: "Wikimedia",
  transfermarkt: "Transfermarkt",
};

/** Fotos de Transfermarkt: se guardan con su crédito, que la app muestra al pie de la plantilla. */
const TRANSFERMARKT_IMAGE_HOST = /(^|\.)transfermarkt\.technology$/;

const teamRepository = new TeamRepository();

const teamEntries = Object.entries(TEAM_NAMES).sort((a, b) =>
  a[1].localeCompare(b[1]),
);

async function fetchPlayers(teamCode: string): Promise<Player[]> {
  const snapshot = await getDocs(
    collection(
      db,
      FIRESTORE_COLLECTIONS.TEAMS,
      teamCode,
      FIRESTORE_COLLECTIONS.PLAYERS,
    ),
  );
  const players = snapshot.docs.map(
    (playerDoc) => ({ id: playerDoc.id, ...playerDoc.data() }) as Player,
  );
  return players.sort(
    (a, b) =>
      Number(b.active !== false) - Number(a.active !== false) ||
      POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) ||
      (a.number ?? 999) - (b.number ?? 999),
  );
}

export default function EquiposPage() {
  const { loading: authLoading } = useRequireAuth();
  const queryClient = useQueryClient();
  const [teamCode, setTeamCode] = useState(teamEntries[0]?.[0] ?? "ali");
  const [searchingPhotos, setSearchingPhotos] = useState(false);

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["players", teamCode],
    queryFn: () => fetchPlayers(teamCode),
    enabled: !authLoading,
  });

  const activeCount = players.filter((player) => player.active !== false).length;

  const searchPhotos = async () => {
    setSearchingPhotos(true);
    try {
      const response = await fetch("/api/squads/photos", {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || data.ok !== true) {
        throw new Error(data.error ?? `HTTP ${response.status}`);
      }

      toast.success("Búsqueda de fotos lista", {
        description: `${data.matched} fotos nuevas de ${data.wikidataPlayers} en Wikidata`,
      });
      await queryClient.invalidateQueries({ queryKey: ["players"] });
    } catch (error) {
      toast.error("No se pudo completar la operación", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSearchingPhotos(false);
    }
  };

  if (authLoading) return null;

  return (
    <>
      <PageHeader
        title="Equipos"
        description="Plantillas y fotos de jugadores"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="shadow-soft border-0 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-accent-foreground text-lg">
              Equipos
            </CardTitle>
            <CardDescription>Liga 1 · 18 equipos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {teamEntries.map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => setTeamCode(code)}
                  className={`w-full text-left p-3 rounded-xl transition-all font-semibold ${
                    teamCode === code
                      ? "bg-gradient-liga1 text-white shadow-soft"
                      : "bg-background hover:bg-muted text-accent-foreground"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-6">
        <SanctionsCard key={teamCode} teamCode={teamCode} />

        <Card className="shadow-soft border-0">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-accent-foreground text-2xl">
                  {TEAM_NAMES[teamCode]}
                </CardTitle>
                <CardDescription>
                  {activeCount} {activeCount === 1 ? "jugador activo" : "jugadores activos"}
                  {players.length > activeCount && ` · ${players.length - activeCount} de baja`}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <TransfermarktSyncDialog
                  key={teamCode}
                  teamCode={teamCode}
                  teamName={TEAM_NAMES[teamCode] ?? teamCode}
                  onSynced={() =>
                    queryClient.invalidateQueries({ queryKey: ["players", teamCode] })
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={searchingPhotos}
                  onClick={searchPhotos}
                >
                  {searchingPhotos ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                  Buscar fotos (Wikidata)
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-foreground text-sm">
                Cargando plantilla...
              </p>
            ) : players.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-foreground opacity-50" />
                <p className="text-foreground">
                  Este equipo aún no tiene plantilla. Usa “Sincronizar con Transfermarkt”.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {players.map((player) => (
                  <PlayerRow
                    key={player.id}
                    teamCode={teamCode}
                    player={player}
                    onSaved={() =>
                      queryClient.invalidateQueries({
                        queryKey: ["players", teamCode],
                      })
                    }
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  );
}

interface SanctionDraft {
  points: string;
  resolution: string;
}

const toDraft = (sanction: PointSanction): SanctionDraft => ({
  points: String(sanction.points),
  resolution: sanction.resolution,
});

/**
 * Sanciones de puntos del equipo. Los puntos se guardan negativos y se suman
 * solo a la tabla acumulada; la app muestra la resolución en la leyenda.
 */
function SanctionsCard({ teamCode }: { teamCode: string }) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<SanctionDraft[] | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: saved = [], isLoading } = useQuery({
    queryKey: ["sanctions", teamCode],
    queryFn: () => teamRepository.fetchPointSanctions(teamCode),
  });

  const rows = drafts ?? saved.map(toDraft);
  const dirty = drafts !== null;
  const updateRow = (index: number, patch: Partial<SanctionDraft>) =>
    setDrafts(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const save = async () => {
    const sanctions: PointSanction[] = [];
    for (const row of rows) {
      const value = Number(row.points);
      if (!Number.isInteger(value) || value === 0) {
        toast.error("Cada sanción necesita puntos enteros distintos de cero");
        return;
      }
      if (!row.resolution.trim()) {
        toast.error("Indica la resolución de cada sanción");
        return;
      }
      // Siempre negativos, aunque se escriba "10".
      sanctions.push({ points: -Math.abs(value), resolution: row.resolution.trim() });
    }

    setSaving(true);
    try {
      await teamRepository.savePointSanctions(teamCode, sanctions);
      toast.success("Sanciones guardadas", {
        description: "La tabla acumulada se recalculó.",
      });
      setDrafts(null);
      await queryClient.invalidateQueries({ queryKey: ["sanctions", teamCode] });
    } catch (error) {
      toast.error("No se pudieron guardar las sanciones", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const total = totalSanctionPoints(saved);

  return (
    <Card className="shadow-soft border-0">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-accent-foreground text-lg flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Sanciones de puntos
              {total < 0 && <Badge variant="destructive">{total} pts</Badge>}
            </CardTitle>
            <CardDescription>
              Solo restan en la tabla acumulada. La resolución aparece en la leyenda de la app.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setDrafts([...rows, { points: "", resolution: "" }])}
          >
            <Plus className="h-4 w-4" />
            Agregar sanción
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-foreground">Cargando sanciones...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-foreground">Este equipo no tiene sanciones.</p>
        ) : (
          rows.map((row, index) => (
            <div key={index} className="flex flex-col gap-2 sm:flex-row">
              <Input
                className="sm:w-28"
                inputMode="numeric"
                value={row.points}
                onChange={(event) => updateRow(index, { points: event.target.value })}
                placeholder="-3"
                aria-label="Puntos descontados"
              />
              <Input
                className="flex-1"
                value={row.resolution}
                onChange={(event) => updateRow(index, { resolution: event.target.value })}
                placeholder="Resolución N.° 080-CL-LFPP-2026"
                aria-label="Resolución"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Eliminar sanción"
                onClick={() => setDrafts(rows.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
        {dirty && (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={saving} onClick={() => setDrafts(null)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={save}>
              {saving ? "Guardando..." : "Guardar sanciones"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PlayerRowProps {
  teamCode: string;
  player: Player;
  onSaved: () => void;
}

function PlayerRow({ teamCode, player, onSaved }: PlayerRowProps) {
  const [photoURL, setPhotoURL] = useState(player.photoURL ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const normalized = photoURL.trim();
    let isTransfermarkt = false;
    if (normalized) {
      try {
        const { protocol, hostname } = new URL(normalized);
        if (protocol !== "https:") throw new Error("Debe ser https");
        isTransfermarkt = TRANSFERMARKT_IMAGE_HOST.test(hostname);
      } catch {
        toast.error("Ingresa un enlace https válido");
        return;
      }
    }

    setSaving(true);
    try {
      const playerRef = doc(
        db,
        FIRESTORE_COLLECTIONS.TEAMS,
        teamCode,
        FIRESTORE_COLLECTIONS.PLAYERS,
        player.id,
      );
      // Una foto puesta a mano (manual o Transfermarkt) no la pisa la búsqueda en Wikidata.
      await updateDoc(
        playerRef,
        normalized
          ? isTransfermarkt
            ? { photoURL: normalized, photoSource: "transfermarkt", photoCredit: "Transfermarkt" }
            : { photoURL: normalized, photoSource: "manual", photoCredit: deleteField() }
          : {
              photoURL: deleteField(),
              photoSource: deleteField(),
              photoCredit: deleteField(),
            },
      );
      toast.success(normalized ? "Foto guardada" : "Foto eliminada");
      onSaved();
    } catch (error) {
      toast.error("No se pudo guardar la foto", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`p-3 rounded-xl bg-background flex flex-col gap-3 sm:flex-row sm:items-center ${
        player.active === false ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-3 sm:w-72 shrink-0">
        <Avatar className="size-12">
          {player.photoURL && <AvatarImage src={player.photoURL} alt={player.name} />}
          <AvatarFallback className="font-bold">
            {player.number ?? "–"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-semibold text-accent-foreground truncate">
            {player.name}
          </p>
          <div className="flex flex-wrap items-center gap-1 text-xs text-foreground">
            <span>{POSITION_LABELS[player.position] ?? player.position}</span>
            {player.photoSource && (
              <Badge variant="secondary">{SOURCE_LABELS[player.photoSource]}</Badge>
            )}
            {player.active === false && <Badge variant="outline">Baja</Badge>}
          </div>
        </div>
      </div>
      <div className="flex flex-1 gap-2">
        <Input
          type="url"
          value={photoURL}
          onChange={(event) => setPhotoURL(event.target.value)}
          placeholder="https://img.a.transfermarkt.technology/portrait/big/… (URL de la foto)"
          aria-label={`URL de la foto de ${player.name}`}
        />
        <Button
          type="button"
          variant="outline"
          disabled={saving || photoURL.trim() === (player.photoURL ?? "")}
          onClick={save}
        >
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
