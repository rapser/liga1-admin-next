const TEAM_ALIASES: Record<string, string[]> = {
  ali: ["alianza lima"],
  uni: ["universitario", "universitario de deportes"],
  cri: ["sporting cristal"],
  cie: ["cienciano", "cs cienciano", "cienciano del cusco"],
  cus: ["cusco fc"],
  adt: ["adt", "asociacion deportiva tarma", "ad tarma"],
  atl: ["alianza atletico", "alianza atletico de sullana"],
  mel: ["melgar", "fbc melgar"],
  gra: ["atletico grau"],
  gar: ["deportivo garcilaso"],
  sba: ["sport boys", "sport boys association"],
  cha: ["los chankas", "cultural santa rosa"],
  utc: ["utc", "utc cajamarca", "universidad tecnica de cajamarca"],
  hua: ["sport huancayo"],
  cou: ["comerciantes unidos"],
  jpa: ["juan pablo ii", "juan pablo ii college"],
  caj: ["fc cajamarca", "cajamarca fc"],
  moq: ["deportivo moquegua", "club deportivo moquegua"],
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function mapProviderTeam(name: string, shortName?: string): string | null {
  const candidates = [name, shortName || ""].map(normalize).filter(Boolean);

  for (const [teamId, aliases] of Object.entries(TEAM_ALIASES)) {
    const normalizedAliases = aliases.map(normalize);
    if (candidates.some((candidate) => normalizedAliases.includes(candidate))) {
      return teamId;
    }
  }

  return null;
}
