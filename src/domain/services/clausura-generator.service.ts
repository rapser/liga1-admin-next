import { JornadaRepository } from '@/data/repositories/jornada.repository';
import { MatchRepository } from '@/data/repositories/match.repository';
import { createEmptyMatch } from '@/domain/entities/match.entity';

// Fecha placeholder para todos los partidos del Clausura.
// El admin actualizará cada partido manualmente a medida que
// la programación oficial se vaya anunciando.
const CLAUSURA_PLACEHOLDER_DATE = new Date('2026-11-22T15:30:00');

export class ClausuraGeneratorService {
  constructor(
    private jornadaRepository: JornadaRepository,
    private matchRepository: MatchRepository,
  ) {}

  /**
   * Lee todas las jornadas del Apertura desde Firestore, invierte local/visitante
   * en cada partido y genera las jornadas del Clausura con IDs clausura_01, clausura_02…
   *
   * Idempotente: si se ejecuta varias veces sobreescribe los mismos documentos.
   */
  async generateClausuraFromApertura(): Promise<{
    jornadasCreated: number;
    matchesCreated: number;
  }> {
    const aperturaJornadas =
      await this.jornadaRepository.fetchAllAperturaJornadas();

    let jornadasCreated = 0;
    let matchesCreated = 0;

    for (const jornada of aperturaJornadas) {
      const clausuraId = `clausura_${jornada.numero.toString().padStart(2, '0')}`;

      await this.jornadaRepository.setJornadaById(clausuraId, {
        torneo: 'clausura',
        numero: jornada.numero,
        fechaInicio: CLAUSURA_PLACEHOLDER_DATE,
        mostrar: true,
        esActiva: false,
      });
      jornadasCreated++;

      const matches = await this.matchRepository.fetchMatches(jornada.id);

      for (const match of matches) {
        if (!match.equipoLocalId || !match.equipoVisitanteId) continue;

        // Invertir: el visitante del apertura pasa a ser local en clausura
        const newMatchId = `${match.equipoVisitanteId}_${match.equipoLocalId}`;
        const newMatch = createEmptyMatch(
          match.equipoVisitanteId,
          match.equipoLocalId,
          CLAUSURA_PLACEHOLDER_DATE,
        );

        await this.matchRepository.setMatchById(clausuraId, newMatchId, newMatch);
        matchesCreated++;
      }
    }

    return { jornadasCreated, matchesCreated };
  }
}
