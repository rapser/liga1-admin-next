/**
 * Mapper para Match
 * Convierte entre MatchDTO (Firestore) y Match (Dominio)
 */

import { Timestamp } from "firebase/firestore";
import { Match } from "@/domain/entities/match.entity";
import { MatchDTO } from "../dtos/match.dto";

export class MatchMapper {
  /**
   * Convierte un MatchDTO de Firestore a una entidad Match del dominio
   * IMPORTANTE: Si equipoLocalId o equipoVisitanteId no están en el DTO,
   * los extrae del ID del documento (ej: "hua_ali" -> local: "hua", visitante: "ali")
   */
  static toDomain(id: string, dto: Partial<MatchDTO>): Match {
    // Extraer IDs de equipos del ID del documento si no están en el DTO
    // El ID del partido es "local_visitante" (ej: "hua_ali")
    let equipoLocalId = dto.equipoLocalId || "";
    let equipoVisitanteId = dto.equipoVisitanteId || "";

    // Si los campos están vacíos, extraer del ID del documento
    if (!equipoLocalId || !equipoVisitanteId) {
      const parts = id.split("_");
      if (parts.length >= 2) {
        equipoLocalId = parts[0] || equipoLocalId || "";
        equipoVisitanteId = parts[1] || equipoVisitanteId || "";
      }
    }

    return {
      id,
      equipoLocalId,
      equipoVisitanteId,
      fecha: dto.fecha?.toDate() || new Date(),
      golesEquipoLocal: dto.golesEquipoLocal ?? 0,
      golesEquipoVisitante: dto.golesEquipoVisitante ?? 0,
      estado: dto.estado || "pendiente",
      suspendido: dto.suspendido ?? false,
      estadio: dto.estadio,
      jornadaNumero: dto.jornadaNumero,
      horaInicio: dto.horaInicio?.toDate(),
      tiempoAgregado: dto.tiempoAgregado,
      tiempoAgregadoPrimeraParte: dto.tiempoAgregadoPrimeraParte,
      primeraParte: dto.primeraParte,
      enDescanso: dto.enDescanso,
      horaInicioSegundaParte: dto.horaInicioSegundaParte?.toDate(),
    };
  }

  /**
   * Convierte una entidad Match del dominio a un MatchDTO para Firestore
   */
  static toDTO(match: Omit<Match, "id">): MatchDTO {
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
      horaInicio: match.horaInicio
        ? Timestamp.fromDate(match.horaInicio)
        : undefined,
      tiempoAgregado: match.tiempoAgregado,
      tiempoAgregadoPrimeraParte: match.tiempoAgregadoPrimeraParte,
      primeraParte: match.primeraParte,
      enDescanso: match.enDescanso,
      horaInicioSegundaParte: match.horaInicioSegundaParte
        ? Timestamp.fromDate(match.horaInicioSegundaParte)
        : undefined,
    };
  }

  /**
   * Convierte múltiples DTOs a entidades del dominio
   */
  static toDomainList(docs: Array<{ id: string; data: MatchDTO }>): Match[] {
    return docs.map((doc) => this.toDomain(doc.id, doc.data));
  }
}
