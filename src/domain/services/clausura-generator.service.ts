import { writeBatch, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { JornadaRepository } from '@/data/repositories/jornada.repository';
import { MatchRepository } from '@/data/repositories/match.repository';
import { FIRESTORE_COLLECTIONS } from '@/core/config/firestore-constants';

// Fecha placeholder para todos los partidos del Clausura.
// El admin actualizará cada partido manualmente a medida que
// la programación oficial se vaya anunciando.
const CLAUSURA_PLACEHOLDER_DATE = new Date('2026-07-17T11:00:00');

// Límite seguro por debajo del máximo de Firestore (500 ops/batch)
const BATCH_LIMIT = 400;

export class ClausuraGeneratorService {
  constructor(
    private jornadaRepository: JornadaRepository,
    private matchRepository: MatchRepository,
  ) {}

  /**
   * Lee todas las jornadas del Apertura, invierte local/visitante y genera
   * las jornadas del Clausura usando writeBatch para máximo rendimiento.
   *
   * Idempotente: ejecutar varias veces sobreescribe los mismos documentos.
   */
  async generateClausuraFromApertura(): Promise<{
    jornadasCreated: number;
    matchesCreated: number;
  }> {
    const aperturaJornadas =
      await this.jornadaRepository.fetchAllAperturaJornadas();

    if (aperturaJornadas.length === 0) {
      throw new Error(
        'No se encontraron jornadas del Apertura en Firestore. ' +
        'Verifica que la colección "jornadas" tiene documentos con IDs apertura_01, apertura_02, etc.',
      );
    }

    // Obtener todos los partidos en paralelo (1 round-trip por jornada simultáneamente)
    const allData = await Promise.all(
      aperturaJornadas.map(async (jornada) => ({
        jornada,
        matches: await this.matchRepository.fetchMatches(jornada.id),
      })),
    );

    const fechaTimestamp = Timestamp.fromDate(CLAUSURA_PLACEHOLDER_DATE);

    let batch = writeBatch(db);
    let opCount = 0;
    let jornadasCreated = 0;
    let matchesCreated = 0;

    const commitIfNeeded = async () => {
      if (opCount >= BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
      }
    };

    for (const { jornada, matches } of allData) {
      // Extraer el número desde el ID (apertura_01 → "01", apertura_17 → "17")
      // porque el campo 'numero' puede no existir en Firestore y el mapper lo pone en 1 por defecto
      const numStr = jornada.id.split('_')[1] ?? '01';
      const clausuraId = `clausura_${numStr}`;

      // Escribir jornada con los mismos campos que apertura: fechaInicio y mostrar
      // torneo, numero y esActiva los infiere el mapper desde el ID del documento
      const jornadaRef = doc(db, FIRESTORE_COLLECTIONS.JORNADAS, clausuraId);
      batch.set(jornadaRef, {
        fechaInicio: fechaTimestamp,
        mostrar: false,
      });
      opCount++;
      jornadasCreated++;
      await commitIfNeeded();

      // Escribir partidos invertidos
      for (const match of matches) {
        if (!match.equipoLocalId || !match.equipoVisitanteId) continue;

        const newMatchId = `${match.equipoVisitanteId}_${match.equipoLocalId}`;
        const matchRef = doc(
          db,
          FIRESTORE_COLLECTIONS.JORNADAS,
          clausuraId,
          FIRESTORE_COLLECTIONS.MATCHES,
          newMatchId,
        );

        batch.set(matchRef, {
          equipoLocalId: match.equipoVisitanteId,
          equipoVisitanteId: match.equipoLocalId,
          fecha: fechaTimestamp,
          golesEquipoLocal: 0,
          golesEquipoVisitante: 0,
          estado: 'pendiente',
          suspendido: false,
        });
        opCount++;
        matchesCreated++;
        await commitIfNeeded();
      }
    }

    // Commit final con las operaciones restantes
    if (opCount > 0) {
      await batch.commit();
    }

    return { jornadasCreated, matchesCreated };
  }
}
