/**
 * Componente MatchScoreEditor
 * Permite editar el marcador de un partido mientras está en vivo
 */

'use client';

import { useState } from 'react';
import { Match } from '@/domain/entities/match.entity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus } from 'lucide-react';

interface MatchScoreEditorProps {
  match: Match;
  onScoreChange: (local: number, visitor: number) => Promise<void>;
  disabled?: boolean;
}

export function MatchScoreEditor({ 
  match, 
  onScoreChange, 
  disabled = false 
}: MatchScoreEditorProps) {
  const [localScore, setLocalScore] = useState(match.golesEquipoLocal || 0);
  const [visitorScore, setVisitorScore] = useState(match.golesEquipoVisitante || 0);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (localScore < 0 || visitorScore < 0) return;
    
    // Verificar si hay cambios
    if (localScore === match.golesEquipoLocal && visitorScore === match.golesEquipoVisitante) {
      return; // No hay cambios
    }

    setIsUpdating(true);
    try {
      await onScoreChange(localScore, visitorScore);
    } catch (error) {
      console.error('Error al actualizar marcador:', error);
      // Revertir valores en caso de error
      setLocalScore(match.golesEquipoLocal || 0);
      setVisitorScore(match.golesEquipoVisitante || 0);
    } finally {
      setIsUpdating(false);
    }
  };

  // Solo incrementar/decrementar localmente, sin actualizar
  const incrementLocal = () => {
    setLocalScore(localScore + 1);
  };

  const decrementLocal = () => {
    if (localScore > 0) {
      setLocalScore(localScore - 1);
    }
  };

  const incrementVisitor = () => {
    setVisitorScore(visitorScore + 1);
  };

  const decrementVisitor = () => {
    if (visitorScore > 0) {
      setVisitorScore(visitorScore - 1);
    }
  };

  const handleLocalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    if (value >= 0) {
      setLocalScore(value);
    }
  };

  const handleVisitorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    if (value >= 0) {
      setVisitorScore(value);
    }
  };

  if (match.estado !== 'envivo') {
    return null;
  }

  const hasChanges = localScore !== match.golesEquipoLocal || visitorScore !== match.golesEquipoVisitante;

  return (
    <div className="flex flex-col gap-3 p-3 bg-[#f8f9fa] rounded-lg">
      {/* Controles de Marcador */}
      <div className="flex items-center justify-center gap-3">
        {/* Marcador Local */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={decrementLocal}
            disabled={disabled || localScore === 0}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            min="0"
            value={localScore}
            onChange={handleLocalInputChange}
            className="w-16 h-10 text-center text-lg font-bold"
            disabled={disabled}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={incrementLocal}
            disabled={disabled}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-xl text-[#67748e] font-bold">-</span>

        {/* Marcador Visitante */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={decrementVisitor}
            disabled={disabled || visitorScore === 0}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            min="0"
            value={visitorScore}
            onChange={handleVisitorInputChange}
            className="w-16 h-10 text-center text-lg font-bold"
            disabled={disabled}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={incrementVisitor}
            disabled={disabled}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Botón Actualizar Marcador */}
      <Button
        type="button"
        onClick={handleUpdate}
        disabled={disabled || isUpdating || !hasChanges}
        className="bg-gradient-liga1 hover:opacity-90 w-full"
        size="sm"
      >
        {isUpdating ? 'Actualizando...' : 'Actualizar Marcador'}
      </Button>
    </div>
  );
}
