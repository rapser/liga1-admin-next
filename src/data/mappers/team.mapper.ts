/**
 * Mapper para Team
 * Convierte entre TeamDTO (Firestore) y Team (Dominio)
 */

import { Team } from '@/domain/entities/team.entity';
import { TeamDTO } from '../dtos/team.dto';
import { TeamCode } from '@/core/config/firestore-constants';

export class TeamMapper {
  /**
   * Convierte un TeamDTO de Firestore a una entidad Team del dominio
   */
  static toDomain(id: string, dto: TeamDTO): Team {
    return {
      id: id as TeamCode,
      nombre: dto.nombre,
      ciudad: dto.ciudad,
      estadio: dto.estadio,
      logo: dto.logo,
      partidosJugados: dto.partidosJugados,
      partidosGanados: dto.partidosGanados,
      partidosEmpatados: dto.partidosEmpatados,
      partidosPerdidos: dto.partidosPerdidos,
      golesFavor: dto.golesFavor,
      golesContra: dto.golesContra,
      diferenciaGoles: dto.diferenciaGoles,
      puntos: dto.puntos,
    };
  }

  /**
   * Convierte una entidad Team del dominio a un TeamDTO para Firestore
   */
  static toDTO(team: Omit<Team, 'id' | 'posicion'>): TeamDTO {
    return {
      nombre: team.nombre,
      ciudad: team.ciudad,
      estadio: team.estadio,
      logo: team.logo,
      partidosJugados: team.partidosJugados,
      partidosGanados: team.partidosGanados,
      partidosEmpatados: team.partidosEmpatados,
      partidosPerdidos: team.partidosPerdidos,
      golesFavor: team.golesFavor,
      golesContra: team.golesContra,
      diferenciaGoles: team.diferenciaGoles,
      puntos: team.puntos,
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
