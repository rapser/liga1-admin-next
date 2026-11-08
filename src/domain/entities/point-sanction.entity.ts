/**
 * Sanción de puntos de un equipo (CCRD-FPF, Comisión de Licencias, etc.).
 * Se guarda en `equipos/{code}.sanctions[]` y SOLO afecta la tabla acumulada:
 * Apertura y Clausura muestran los puntos ganados en cancha.
 * La app iOS lee el mismo campo (FirestoreConstants.TeamMasterField.sanctions).
 */
export interface PointSanction {
  /** Puntos de la sanción, siempre negativos (ej. -10). */
  points: number;
  /** Resolución o motivo que explica la sanción. */
  resolution: string;
}

/** Normaliza el array crudo de Firestore descartando entradas inválidas. */
export const parsePointSanctions = (raw: unknown): PointSanction[] => {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const points = Number(item?.points);
    if (!Number.isInteger(points) || points >= 0) return [];
    const resolution = typeof item?.resolution === 'string' ? item.resolution.trim() : '';
    return [{ points, resolution }];
  });
};

/** Total (negativo o cero) a sumar a los puntos del acumulado. */
export const totalSanctionPoints = (sanctions: PointSanction[]): number =>
  sanctions.reduce((total, sanction) => total + sanction.points, 0);
