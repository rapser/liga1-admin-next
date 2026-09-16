/**
 * Panel de Encuesta Arbitral (admin) — visible mientras el partido está en vivo.
 * Permite lanzar una micro-encuesta ("¿fue penal?"), verla en vivo y cerrarla.
 * El conteo se lee de la subcolección de shards (contador distribuido).
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Gavel, Loader2, Plus, X, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Poll,
  PollTally,
  isPollOpen,
  pollOptionPct,
  pollTotalVotes,
  DEFAULT_POLL_OPTIONS,
  DEFAULT_POLL_DURATION_MIN,
} from "@/domain/entities/poll.entity";
import { PollRepository } from "@/data/repositories/poll.repository";

const pollRepository = new PollRepository();

interface RefereePollPanelProps {
  matchId: string;
  jornadaId: string;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export function RefereePollPanel({ matchId, jornadaId }: RefereePollPanelProps) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [tally, setTally] = useState<PollTally>({});
  const [creating, setCreating] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Formulario
  const [pregunta, setPregunta] = useState("");
  const [opciones, setOpciones] = useState(DEFAULT_POLL_OPTIONS.map((o) => o.texto));
  const [duracion, setDuracion] = useState(DEFAULT_POLL_DURATION_MIN);

  useEffect(() => {
    return pollRepository.observePollsForMatch(matchId, setPolls);
  }, [matchId]);

  const activePoll = useMemo(
    () => polls.find((p) => isPollOpen(p)) ?? null,
    [polls],
  );
  const lastClosed = useMemo(
    () => polls.find((p) => !isPollOpen(p)) ?? null,
    [polls],
  );

  useEffect(() => {
    const shown = activePoll ?? lastClosed;
    if (!shown) {
      setTally({});
      return;
    }
    return pollRepository.observeTally(
      shown.id,
      shown.opciones.map((o) => o.id),
      setTally,
    );
  }, [activePoll, lastClosed]);

  const handleCreate = async () => {
    const textos = opciones.map((t) => t.trim()).filter(Boolean);
    if (!pregunta.trim()) {
      toast.error("Escribe la pregunta");
      return;
    }
    if (textos.length < 2) {
      toast.error("Se necesitan al menos 2 opciones");
      return;
    }
    setCreating(true);
    try {
      await pollRepository.createPoll({
        matchId,
        jornadaId,
        pregunta: pregunta.trim(),
        opciones: textos.map((texto, i) => ({ id: slug(texto) || `op${i}`, texto })),
        durationMinutes: Math.min(15, Math.max(1, duracion)),
      });
      toast.success("Encuesta lanzada");
      setShowForm(false);
      setPregunta("");
      setOpciones(DEFAULT_POLL_OPTIONS.map((o) => o.texto));
      setDuracion(DEFAULT_POLL_DURATION_MIN);
    } catch (e) {
      toast.error("No se pudo crear la encuesta", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setCreating(false);
    }
  };

  const handleClose = async (pollId: string) => {
    setClosing(true);
    try {
      await pollRepository.closePoll(pollId);
      toast.success("Encuesta cerrada");
    } catch (e) {
      toast.error("No se pudo cerrar", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setClosing(false);
    }
  };

  const renderTally = (poll: Poll) => {
    const total = pollTotalVotes(tally);
    return (
      <div className="space-y-2">
        {poll.opciones.map((o) => {
          const pct = pollOptionPct(tally, o.id);
          return (
            <div key={o.id}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium">{o.texto}</span>
                <span className="text-muted-foreground">
                  {tally[o.id] ?? 0} · {pct}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground pt-1">{total} voto(s)</p>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3 pt-2 border-t border-muted">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Gavel className="h-4 w-4" />
        Encuesta arbitral
      </div>

      {activePoll ? (
        <div className="rounded-lg border p-3 space-y-3">
          <p className="text-sm font-medium">{activePoll.pregunta}</p>
          {renderTally(activePoll)}
          <Button
            onClick={() => handleClose(activePoll.id)}
            disabled={closing}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {closing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            Cerrar ahora
          </Button>
        </div>
      ) : showForm ? (
        <div className="rounded-lg border p-3 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="poll-pregunta" className="text-xs">
              Pregunta
            </Label>
            <Input
              id="poll-pregunta"
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              placeholder="¿Fue penal el reclamo del minuto 63?"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Opciones</Label>
            {opciones.map((op, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={op}
                  onChange={(e) =>
                    setOpciones((prev) =>
                      prev.map((v, idx) => (idx === i ? e.target.value : v)),
                    )
                  }
                  placeholder={`Opción ${i + 1}`}
                />
                {opciones.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setOpciones((prev) => prev.filter((_, idx) => idx !== i))
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {opciones.length < 4 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpciones((prev) => [...prev, ""])}
              >
                <Plus className="h-4 w-4" />
                Agregar opción
              </Button>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="poll-duracion" className="text-xs">
              Duración (min)
            </Label>
            <Input
              id="poll-duracion"
              type="number"
              min={1}
              max={15}
              value={duracion}
              onChange={(e) => setDuracion(Number(e.target.value) || 1)}
              className="w-24"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={creating} size="sm" className="flex-1">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}
              Lanzar encuesta
            </Button>
            <Button
              onClick={() => setShowForm(false)}
              variant="ghost"
              size="sm"
              disabled={creating}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <>
          {lastClosed && (
            <div className="rounded-lg border p-3 space-y-2 opacity-80">
              <p className="text-xs text-muted-foreground">Última encuesta (cerrada)</p>
              <p className="text-sm font-medium">{lastClosed.pregunta}</p>
              {renderTally(lastClosed)}
            </div>
          )}
          <Button onClick={() => setShowForm(true)} variant="outline" size="sm" className="w-full">
            <Plus className="h-4 w-4" />
            Nueva encuesta arbitral
          </Button>
        </>
      )}
    </div>
  );
}
