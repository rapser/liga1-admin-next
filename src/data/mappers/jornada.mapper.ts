/**
 * Mapper para Jornada
 * Convierte entre JornadaDTO (Firestore) y Jornada (Dominio)
 */

import { Timestamp } from 'firebase/firestore';
import { Jornada } from '@/domain/entities/jornada.entity';
import { JornadaDTO } from '../dtos/jornada.dto';

export class JornadaMapper {
  /**
   * Convierte un JornadaDTO de Firestore a una entidad Jornada del dominio
   */
  static toDomain(id: string, dto: Partial<JornadaDTO>): Jornada {
    // Inferir el torneo desde el ID si no está presente
    // Formato del ID: "apertura_01" o "clausura_15"
    let torneo: 'apertura' | 'clausura' = 'apertura';
    if (dto.torneo) {
      torneo = dto.torneo;
    } else if (id.includes('clausura')) {
      torneo = 'clausura';
    }

    return {
      id,
      torneo,
      numero: dto.numero || 1,
      mostrar: dto.mostrar ?? true,
      fechaInicio: dto.fechaInicio?.toDate() || new Date(),
      fechaFin: dto.fechaFin?.toDate(),
      esActiva: dto.esActiva ?? false,
    };
  }

  /**
   * Convierte una entidad Jornada del dominio a un JornadaDTO para Firestore
   */
  static toDTO(jornada: Omit<Jornada, 'id'>): JornadaDTO {
    return {
      torneo: jornada.torneo,
      numero: jornada.numero,
      mostrar: jornada.mostrar,
      fechaInicio: Timestamp.fromDate(jornada.fechaInicio), // Date → Timestamp
      fechaFin: jornada.fechaFin
        ? Timestamp.fromDate(jornada.fechaFin)
        : undefined,
      esActiva: jornada.esActiva,
    };
  }

  /**
   * Convierte múltiples DTOs a entidades del dominio
   */
  static toDomainList(
    docs: Array<{ id: string; data: JornadaDTO }>
  ): Jornada[] {
    return docs.map((doc) => this.toDomain(doc.id, doc.data));
  }
}
