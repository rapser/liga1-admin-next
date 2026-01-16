/**
 * Mapper para Match
 * Convierte entre MatchDTO (Firestore) y Match (Dominio)
 */

import { Timestamp } from 'firebase/firestore';
import { Match } from '@/domain/entities/match.entity';
import { MatchDTO } from '../dtos/match.dto';

export class MatchMapper {
  /**
   * Convierte un MatchDTO de Firestore a una entidad Match del dominio
   */
  static toDomain(id: string, dto: MatchDTO): Match {
    return {
      id,
      equipoLocalId: dto.equipoLocalId,
      equipoVisitanteId: dto.equipoVisitanteId,
      fecha: dto.fecha.toDate(), // Timestamp → Date
      golesEquipoLocal: dto.golesEquipoLocal,
      golesEquipoVisitante: dto.golesEquipoVisitante,
      estado: dto.estado,
      suspendido: dto.suspendido,
      estadio: dto.estadio,
      jornadaNumero: dto.jornadaNumero,
    };
  }

  /**
   * Convierte una entidad Match del dominio a un MatchDTO para Firestore
   */
  static toDTO(match: Omit<Match, 'id'>): MatchDTO {
    return {
      equipoLocalId: match.equipoLocalId,
      equipoVisitanteId: match.equipoVisitanteId,
      fecha: Timestamp.fromDate(match.fecha), // Date → Timestamp
      golesEquipoLocal: match.golesEquipoLocal,
      golesEquipoVisitante: match.golesEquipoVisitante,
      estado: match.estado,
      suspendido: match.suspendido,
      estadio: match.estadio,
      jornadaNumero: match.jornadaNumero,
    };
  }

  /**
   * Convierte múltiples DTOs a entidades del dominio
   */
  static toDomainList(
    docs: Array<{ id: string; data: MatchDTO }>
  ): Match[] {
    return docs.map((doc) => this.toDomain(doc.id, doc.data));
  }
}
