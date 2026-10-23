/** Mesma projeção usada para pintar a textura do globo. */
export function projetarMapaPlano(lat: number, lon: number): { x: number; y: number } | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { x: ((lon + 180) / 360) * 100, y: ((90 - lat) / 180) * 100 };
}
