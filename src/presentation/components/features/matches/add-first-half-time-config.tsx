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
  const [addedTime, setAddedTime] = useState(currentAddedTime || 0);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setAddedTime(currentAddedTime || 0);
  }, [currentAddedTime]);

  const handleUpdate = async () => {
    if (addedTime < 0 || addedTime > 15) {
      toast.error("Los minutos adicionales deben estar entre 0 y 15");
      return;
    }

    setIsUpdating(true);
    try {
      await matchStateService.updateFirstHalfAddedTime(
        jornadaId,
        matchId,
        addedTime,
      );
      toast.success(`Minutos adicionales configurados: ${addedTime}`);
      setAddedTime(addedTime);
      onTimeUpdated?.();
    } catch (error: any) {
      console.error(
        "Error al actualizar tiempo agregado del primer tiempo:",
        error,
      );
      toast.error(error?.message || "Error al actualizar minutos adicionales");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <div className="text-2xl font-semibold text-[#67748e]">[</div>
      <Input
        type="number"
        min="0"
        max="15"
        value={addedTime}
        onChange={(e) => setAddedTime(parseInt(e.target.value) || 0)}
        className="w-16 h-10 text-center text-lg font-bold"
        disabled={isUpdating}
        placeholder="0"
      />
      <div className="text-2xl font-semibold text-[#67748e]">]</div>
      <Button
        onClick={handleUpdate}
        disabled={isUpdating || addedTime === currentAddedTime}
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
