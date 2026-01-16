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
  static toDomain(id: string, dto: JornadaDTO): Jornada {
    return {
      id,
      torneo: dto.torneo,
      numero: dto.numero,
      mostrar: dto.mostrar,
      fechaInicio: dto.fechaInicio.toDate(), // Timestamp → Date
      fechaFin: dto.fechaFin?.toDate(), // Timestamp → Date (opcional)
      esActiva: dto.esActiva,
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
