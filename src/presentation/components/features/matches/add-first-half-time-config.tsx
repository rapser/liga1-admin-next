/**
 * Componente AddFirstHalfTimeConfig
 * Permite configurar los minutos adicionales del primer tiempo
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MatchStateService } from "@/domain/services/match-state.service";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddFirstHalfTimeConfigProps {
  jornadaId: string;
  matchId: string;
  currentAddedTime: number;
  matchStateService: MatchStateService;
  onTimeUpdated?: () => void;
}

export function AddFirstHalfTimeConfig({
  jornadaId,
  matchId,
  currentAddedTime,
  matchStateService,
  onTimeUpdated,
}: AddFirstHalfTimeConfigProps) {
  // Este input es DELTA (minutos a sumar), no el total
  const [deltaTime, setDeltaTime] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Si el total cambia desde props, no pisamos el delta del usuario
  }, [currentAddedTime]);

  const handleUpdate = async () => {
    if (deltaTime < 0 || deltaTime > 15) {
      toast.error("Los minutos adicionales deben estar entre 0 y 15");
      return;
    }
    const newTotal = (currentAddedTime || 0) + deltaTime;
    if (newTotal < 0 || newTotal > 15) {
      toast.error("El total de minutos adicionales debe estar entre 0 y 15");
      return;
    }
    if (deltaTime === 0) {
      return;
    }

    setIsUpdating(true);
    try {
      await matchStateService.updateFirstHalfAddedTime(
        jornadaId,
        matchId,
        newTotal,
      );
      toast.success(`Minutos adicionales actualizados: +${newTotal}`);
      setDeltaTime(0);
      onTimeUpdated?.();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar minutos adicionales");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <div className="text-2xl font-semibold text-foreground">[</div>
      <Input
        type="number"
        min="0"
        max="15"
        value={deltaTime}
        onChange={(e) => setDeltaTime(parseInt(e.target.value) || 0)}
        className="w-16 h-10 text-center text-lg font-bold"
        disabled={isUpdating}
        placeholder="0"
      />
      <div className="text-2xl font-semibold text-foreground">]</div>
      <Button
        onClick={handleUpdate}
        disabled={isUpdating || deltaTime === 0}
        size="sm"
        className="bg-gradient-liga1 hover:opacity-90"
      >
        {isUpdating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Guardando...
          </>
        ) : (
          "Guardar"
        )}
      </Button>
    </div>
  );
}
