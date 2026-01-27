/**
 * Componente LiveMatchTimer
 * Muestra el minutero en tiempo real para un partido en vivo
 */

'use client';

import { Match } from '@/domain/entities/match.entity';
import { useMatchTimer } from '@/presentation/hooks/use-match-timer';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LiveMatchTimerProps {
  match: Match;
}

export function LiveMatchTimer({ match }: LiveMatchTimerProps) {
  const { minutoFormateado, primeraParte, isActive } = useMatchTimer(match);

  if (!isActive) {
    return null;
  }

  // Si está en descanso, mostrar badge diferente
  if (match.enDescanso) {
    return (
      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 border-0 shadow-soft flex items-center gap-2 px-3 py-1.5">
        <Clock className="h-4 w-4" />
        <span className="text-base font-bold">{minutoFormateado}</span>
        <span className="text-sm font-semibold">Descanso</span>
      </Badge>
    );
  }

  return (
    <Badge className="bg-gradient-success border-0 shadow-soft flex items-center gap-2 px-3 py-1.5">
      <div className="h-2 w-2 rounded-full bg-white animate-pulse"></div>
      <Clock className="h-4 w-4" />
      <span className="text-base font-bold">{minutoFormateado}</span>
      <span className="text-sm font-semibold">
        {primeraParte ? '1er Tiempo' : '2do Tiempo'}
      </span>
    </Badge>
  );
}
