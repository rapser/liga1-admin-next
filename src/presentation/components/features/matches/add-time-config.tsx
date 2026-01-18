/**
 * Componente AddTimeConfig
 * Permite configurar los minutos adicionales cuando el partido llega a 90 minutos
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MatchStateService } from '@/domain/services/match-state.service';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AddTimeConfigProps {
  jornadaId: string;
  matchId: string;
  currentAddedTime: number;
  matchStateService: MatchStateService;
  onTimeUpdated?: () => void;
}

export function AddTimeConfig({
  jornadaId,
  matchId,
  currentAddedTime,
  matchStateService,
  onTimeUpdated,
}: AddTimeConfigProps) {
  const [addedTime, setAddedTime] = useState(currentAddedTime || 0);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (addedTime < 0 || addedTime > 15) {
      toast.error('Los minutos adicionales deben estar entre 0 y 15');
      return;
    }

    setIsUpdating(true);
    try {
      await matchStateService.updateAddedTime(jornadaId, matchId, addedTime);
      toast.success(`Minutos adicionales configurados: ${addedTime}`);
      onTimeUpdated?.();
    } catch (error: any) {
      console.error('Error al actualizar tiempo agregado:', error);
      toast.error(error?.message || 'Error al actualizar minutos adicionales');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-[#f8f9fa] rounded-lg border border-[#e9ecef]">
      <Label htmlFor="addedTime" className="text-sm font-semibold text-[#344767] whitespace-nowrap">
        Minutos Adicionales:
      </Label>
      <Input
        id="addedTime"
        type="number"
        min="0"
        max="15"
        value={addedTime}
        onChange={(e) => setAddedTime(parseInt(e.target.value) || 0)}
        className="w-20 h-9 text-center"
        disabled={isUpdating}
      />
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
  );
}
