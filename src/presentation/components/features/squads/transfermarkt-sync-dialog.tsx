/**
 * "Sincronizar con Transfermarkt": se pega la tabla de la plantilla copiada de
 * Transfermarkt, se revisan altas / bajas / cambios y se confirma.
 * La lógica vive en el servidor (POST /api/squads/transfermarkt-sync).
 */

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import type {
  ExistingPlayer,
  PlayerChange,
  SquadSyncPlan,
} from "@/server/squads/squad-sync-plan";
import type { TransfermarktPlayer } from "@/server/squads/transfermarkt-squad-parser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface PreviewResponse {
  ok: boolean;
  error?: string;
  teamName: string;
  parsedPlayers: number;
  errors: string[];
  plan: SquadSyncPlan | null;
  hasChanges: boolean;
  planId: string | null;
  applied: boolean;
}

const POSITION_LABELS: Record<string, string> = {
  GK: "Portero",
  DF: "Defensa",
  MF: "Mediocampista",
  FW: "Delantero",
};

const FIELD_LABELS: Record<PlayerChange["field"], string> = {
  name: "nombre",
  number: "dorsal",
  position: "posición",
  nationality: "nacionalidad",
  active: "estado",
};

function formatValue(field: PlayerChange["field"], value: PlayerChange["from"]): string {
  if (value === null || value === undefined) return "—";
  if (field === "position") return POSITION_LABELS[String(value)] ?? String(value);
  if (field === "active") return value ? "activo" : "baja";
  if (field === "number") return `#${value}`;
  return String(value);
}

function describePlayer(player: TransfermarktPlayer): string {
  return [
    player.number != null ? `#${player.number}` : "sin dorsal",
    player.positionLabel,
    player.nationality,
  ].join(" · ");
}

interface Props {
  teamCode: string;
  teamName: string;
  onSynced: () => void;
}

export function TransfermarktSyncDialog({ teamCode, teamName, onSynced }: Props) {
  const [open, setOpen] = useState(false);
  const [table, setTable] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState<"preview" | "apply" | null>(null);

  const reset = () => {
    setTable("");
    setPreview(null);
    setLoading(null);
  };

  const call = async (confirmPlanId?: string): Promise<PreviewResponse> => {
    const response = await fetch("/api/squads/transfermarkt-sync", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamCode, table, confirmPlanId }),
    });
    const data = (await response.json()) as PreviewResponse;
    if (!response.ok || !data.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
    return data;
  };

  const runPreview = async () => {
    setLoading("preview");
    try {
      setPreview(await call());
    } catch (error) {
      toast.error("No se pudo leer la tabla", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(null);
    }
  };

  const apply = async () => {
    if (!preview?.planId) return;
    setLoading("apply");
    try {
      const result = await call(preview.planId);
      const plan = result.plan!;
      toast.success(`${teamName} sincronizado con Transfermarkt`, {
        description: `${plan.incoming.length} altas · ${plan.outgoing.length} bajas · ${
          plan.matched.filter((m) => m.changes.length > 0).length
        } con cambios`,
      });
      onSynced();
      setOpen(false);
      reset();
    } catch (error) {
      toast.error("No se pudo guardar", {
        description: error instanceof Error ? error.message : String(error),
      });
      setLoading(null);
    }
  };

  const plan = preview?.plan ?? null;
  const changed = plan?.matched.filter((m) => m.changes.length > 0) ?? [];
  const reviews = plan?.matched.filter((m) => m.review) ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <RefreshCw className="h-4 w-4" />
          Sincronizar con Transfermarkt
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sincronizar {teamName} con Transfermarkt</DialogTitle>
          <DialogDescription>
            En Transfermarkt abre la plantilla de {teamName}, selecciona la tabla desde el dorsal
            del primer jugador hasta el último dato del último, cópiala (Cmd+C) y pégala aquí.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <textarea
            value={table}
            onChange={(event) => setTable(event.target.value)}
            placeholder={"12\t\nÁngel Zamudio\tÁngel Zamudio\nPortero\n29\tPerú\t31/12/2027\t450 mil €\n…"}
            aria-label="Tabla de Transfermarkt"
            spellCheck={false}
            className="border-input placeholder:text-muted-foreground dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 min-h-64 w-full rounded-md border bg-transparent px-3 py-2 font-mono text-xs shadow-xs outline-none focus-visible:ring-[3px]"
          />
        ) : preview.errors.length > 0 ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>No se puede sincronizar todavía</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {preview.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
              <p className="mt-2">
                Revisa que hayas copiado la tabla completa. Si es un país o una posición nueva,
                hay que agregarla en transfermarkt-squad-parser.ts.
              </p>
            </AlertDescription>
          </Alert>
        ) : plan ? (
          <div className="space-y-4 text-sm">
            <p className="text-foreground">
              {preview.parsedPlayers} jugadores en Transfermarkt.
            </p>

            {plan.suspicious && (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertTitle>¿Es la tabla de {teamName}?</AlertTitle>
                <AlertDescription>
                  Casi ningún jugador coincide con la plantilla actual. Puede que hayas pegado la
                  tabla de otro equipo. Revisa antes de confirmar.
                </AlertDescription>
              </Alert>
            )}

            {reviews.length > 0 && (
              <Alert>
                <AlertTriangle />
                <AlertTitle>Revisa que sean el mismo jugador</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {reviews.map((m) => (
                      <li key={m.id}>{m.review}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {!preview.hasChanges && (
              <p className="font-semibold text-accent-foreground">
                La plantilla ya está igual que en Transfermarkt. No hay nada que guardar.
              </p>
            )}

            <PlanSection title="Entran" count={plan.incoming.length} tone="text-green-600">
              {plan.incoming.map(({ id, player }) => (
                <li key={id}>
                  + <strong>{player.name}</strong> · {describePlayer(player)}
                </li>
              ))}
            </PlanSection>

            <PlanSection title="Salen (quedan como baja, no se borran)" count={plan.outgoing.length} tone="text-red-600">
              {plan.outgoing.map((player: ExistingPlayer) => (
                <li key={player.id}>
                  − <strong>{player.name}</strong>
                  {player.number != null ? ` · #${player.number}` : ""}
                </li>
              ))}
            </PlanSection>

            <PlanSection title="Cambian" count={changed.length} tone="text-amber-600">
              {changed.map((m) => (
                <li key={m.id}>
                  ~ <strong>{m.player.name}</strong>:{" "}
                  {m.changes
                    .map(
                      (c) =>
                        `${FIELD_LABELS[c.field]} ${formatValue(c.field, c.from)} → ${formatValue(c.field, c.to)}`,
                    )
                    .join(", ")}
                </li>
              ))}
            </PlanSection>
          </div>
        ) : null}

        <DialogFooter>
          {preview ? (
            <>
              <Button type="button" variant="ghost" disabled={loading !== null} onClick={() => setPreview(null)}>
                Volver a la tabla
              </Button>
              {preview.hasChanges && preview.errors.length === 0 && (
                <Button type="button" disabled={loading !== null} onClick={apply}>
                  {loading === "apply" && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmar y guardar
                </Button>
              )}
            </>
          ) : (
            <Button type="button" disabled={!table.trim() || loading !== null} onClick={runPreview}>
              {loading === "preview" && <Loader2 className="h-4 w-4 animate-spin" />}
              Ver cambios
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanSection({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: string;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div>
      <p className={`font-semibold ${tone}`}>
        {title} ({count})
      </p>
      <ul className="mt-1 space-y-0.5 text-foreground">{children}</ul>
    </div>
  );
}
