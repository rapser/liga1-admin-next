/**
 * Mapper para Team
 * Convierte entre TeamDTO (Firestore) y Team (Dominio)
 */

import { Team } from '@/domain/entities/team.entity';
import { TeamDTO } from '../dtos/team.dto';
import { TeamCode, getTeamFullName } from '@/core/config/firestore-constants';

export class TeamMapper {
  /**
   * Convierte un TeamDTO de Firestore a una entidad Team del dominio
   * Mapea los campos de Firestore (matchesPlayed, etc) a los campos del dominio (partidosJugados, etc)
   */
  static toDomain(id: string, dto: Partial<TeamDTO>): Team {
    // Mapear campos de Firestore a dominio
    // Campos en Firestore: name, city, stadium, logo, matchesPlayed, matchesWon, matchesDrawn, 
    // matchesLost, goalsScored, goalsAgainst, goalDifference, points
    return {
      id: id as TeamCode,
      nombre: dto.name || getTeamFullName(id),
      ciudad: dto.city || '',
      estadio: dto.stadium || '',
      logo: dto.logo || `/teams/${id}.png`,
      partidosJugados: dto.matchesPlayed ?? 0,
      partidosGanados: dto.matchesWon ?? 0,
      partidosEmpatados: dto.matchesDrawn ?? 0,
      partidosPerdidos: dto.matchesLost ?? 0,
      golesFavor: dto.goalsScored ?? 0,
      golesContra: dto.goalsAgainst ?? 0,
      diferenciaGoles: dto.goalDifference ?? 0,
      puntos: dto.points ?? 0,
    };
  }

  /**
   * Convierte una entidad Team del dominio a un TeamDTO para Firestore
   * Mapea los campos del dominio (partidosJugados, etc) a los campos de Firestore (matchesPlayed, etc)
   */
  static toDTO(team: Omit<Team, 'id' | 'posicion'>): TeamDTO {
    return {
      name: team.nombre,
      city: team.ciudad,
      stadium: team.estadio,
      logo: team.logo,
      matchesPlayed: team.partidosJugados,
      matchesWon: team.partidosGanados,
      matchesDrawn: team.partidosEmpatados,
      matchesLost: team.partidosPerdidos,
      goalsScored: team.golesFavor,
      goalsAgainst: team.golesContra,
      goalDifference: team.diferenciaGoles,
      points: team.puntos,
    };
  }

  /**
   * Convierte múltiples DTOs a entidades del dominio
   */
  static toDomainList(
    docs: Array<{ id: string; data: TeamDTO }>
  ): Team[] {
    return docs.map((doc) => this.toDomain(doc.id, doc.data));
  }
}
