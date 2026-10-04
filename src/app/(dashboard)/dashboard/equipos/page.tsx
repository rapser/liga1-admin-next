/**
 * Página de Equipos
 * Plantilla de cada equipo (equipos/{code}/players): importación desde ESPN,
 * búsqueda de fotos en Wikidata y edición manual de la foto de cada jugador.
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
import { Download, ImageIcon, Loader2, Users } from "lucide-react";
import { db } from "@/core/config/firebase";
import {
  FIRESTORE_COLLECTIONS,
  TEAM_NAMES,
} from "@/core/config/firestore-constants";
import { useRequireAuth } from "@/presentation/hooks/use-require-auth";
import { PageHeader } from "@/presentation/components/shared";
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
type PhotoSource = "manual" | "espn" | "wikidata";

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
  espn: "ESPN",
  wikidata: "Wikimedia",
};

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
  const [runningTask, setRunningTask] = useState<"import" | "photos" | null>(
    null,
  );

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["players", teamCode],
    queryFn: () => fetchPlayers(teamCode),
    enabled: !authLoading,
  });

  const runTask = async (task: "import" | "photos") => {
    setRunningTask(task);
    try {
      const response = await fetch(
        task === "import" ? "/api/squads/import" : "/api/squads/photos",
        { method: "POST", credentials: "include" },
      );
      const data = await response.json();
      if (!response.ok || data.ok !== true) {
        throw new Error(data.error ?? `HTTP ${response.status}`);
      }

      toast.success(
        task === "import" ? "Plantillas importadas" : "Búsqueda de fotos lista",
        {
          description:
            task === "import"
              ? `${data.players} jugadores en ${data.teams} equipos` +
                (data.deactivated ? ` · ${data.deactivated} dados de baja` : "")
              : `${data.matched} fotos nuevas de ${data.wikidataPlayers} en Wikidata`,
        },
      );
      await queryClient.invalidateQueries({ queryKey: ["players"] });
    } catch (error) {
      toast.error("No se pudo completar la operación", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setRunningTask(null);
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

        <Card className="shadow-soft border-0 lg:col-span-3">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-accent-foreground text-2xl">
                  {TEAM_NAMES[teamCode]}
                </CardTitle>
                <CardDescription>
                  {players.length} {players.length === 1 ? "jugador" : "jugadores"}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={runningTask !== null}
                  onClick={() => runTask("import")}
                >
                  {runningTask === "import" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Importar plantillas (ESPN)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={runningTask !== null}
                  onClick={() => runTask("photos")}
                >
                  {runningTask === "photos" ? (
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
                  Este equipo aún no tiene plantilla. Usa &quot;Importar
                  plantillas&quot;.
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
    </>
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
    if (normalized) {
      try {
        const { protocol } = new URL(normalized);
        if (protocol !== "https:") throw new Error("Debe ser https");
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
      // Una foto puesta a mano (photoSource: "manual") no la pisa ninguna importación.
      await updateDoc(
        playerRef,
        normalized
          ? { photoURL: normalized, photoSource: "manual", photoCredit: deleteField() }
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
          placeholder="https://… (URL de la foto)"
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
