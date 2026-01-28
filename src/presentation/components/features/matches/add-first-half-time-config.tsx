/**
 * Componente AddFirstHalfTimeConfig
 * Permite configurar los minutos adicionales del primer tiempo cuando el partido llega a 45 minutos
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MatchStateService } from '@/domain/services/match-state.service';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

  // Sincronizar el estado cuando cambia currentAddedTime desde las props
  useEffect(() => {
    setAddedTime(currentAddedTime || 0);
  }, [currentAddedTime]);

  const handleUpdate = async () => {
    if (addedTime < 0 || addedTime > 15) {
      toast.error('Los minutos adicionales deben estar entre 0 y 15');
      return;
    }

    setIsUpdating(true);
    try {
      await matchStateService.updateFirstHalfAddedTime(jornadaId, matchId, addedTime);
      toast.success(
        addedTime > 0 
          ? `Minutos adicionales configurados: ${addedTime}. El partido seguirá contando hasta completar los ${45 + addedTime} minutos.`
          : `Minutos adicionales configurados: ${addedTime}`
      );
      // Actualizar el estado local para reflejar el cambio
      setAddedTime(addedTime);
      // Notificar al componente padre para que refresque los datos
      onTimeUpdated?.();
    } catch (error: any) {
      console.error('Error al actualizar tiempo agregado del primer tiempo:', error);
      toast.error(error?.message || 'Error al actualizar minutos adicionales');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-[#f8f9fa] rounded-lg border border-[#e9ecef]">
      <Label htmlFor="firstHalfAddedTime" className="text-sm font-semibold text-[#344767]">
        Minutos Adicionales del Primer Tiempo
      </Label>
      <div className="flex items-center gap-3">
        <Input
          id="firstHalfAddedTime"
          type="number"
          min="0"
          max="15"
          value={addedTime}
          onChange={(e) => setAddedTime(parseInt(e.target.value) || 0)}
          className="w-24 h-9 text-center"
          disabled={isUpdating}
          placeholder="0"
        />
        <span className="text-sm text-[#67748e]">minutos</span>
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
            'Guardar'
          )}
        </Button>
      </div>
      <p className="text-xs text-[#67748e]">
        Ingresa los minutos adicionales del primer tiempo (0-15). El partido seguirá contando hasta completar los 45 + minutos adicionales, luego entrará en descanso automáticamente.
      </p>
    </div>
  );
}
