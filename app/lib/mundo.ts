/**
 * O MUNDO DRUKALE — tipos e contas de coordenada
 *
 * Um local é guardado por latitude e longitude, como no mundo real:
 * é assim que ele continua no lugar certo quando o globo gira, e é
 * assim que você consegue mudar o desenho do planeta um dia sem perder
 * onde cada império estava.
 */

export type TipoLocal =
  | 'capital' | 'cidade' | 'base' | 'quartel' | 'ruina' | 'orbital';

export const TIPOS: {
  id: TipoLocal;
  rotulo: string;
  cor: string;
  orbital?: boolean;
  dica: string;
}[] = [
  { id: 'capital', rotulo: 'capital', cor: '#f4f0e2',
    dica: 'a sede do império — cidade grande com castelo' },
  { id: 'cidade', rotulo: 'cidade', cor: '#ffc978',
    dica: 'núcleo habitado' },
  { id: 'base', rotulo: 'base', cor: '#5fd0ff',
    dica: 'instalação militar ou de pesquisa' },
  { id: 'quartel', rotulo: 'quartel-general', cor: '#7ef0a8',
    dica: 'centro de comando' },
  { id: 'ruina', rotulo: 'ruína', cor: '#c07a5a',
    dica: 'o que sobrou de alguma coisa' },
  { id: 'orbital', rotulo: 'cidadela orbital', cor: '#dfe9f5', orbital: true,
    dica: 'não fica no chão: orbita o planeta' },
];

export const tipoDe = (id: string) =>
  TIPOS.find((t) => t.id === id) ?? TIPOS[1];

export type Local = {
  id: string;
  nome: string;
  tipo: TipoLocal;
  resumo: string | null;
  lat: number;      // -90 (sul) a 90 (norte)
  lon: number;      // -180 a 180
  altitude: number; // 0 no chão; acima disso, em órbita
};

export const LIMITES_LOCAL = { nome: 60, resumo: 600, total: 300 };

/**
 * Latitude/longitude para um ponto na esfera de raio 1.
 *
 * A esfera do globo é construída com o polo norte em +Y e a longitude
 * correndo no plano XZ. Estas duas funções são a ponte entre o jeito
 * humano de dizer "onde" e o jeito que a placa de vídeo entende.
 */
export function paraVetor(lat: number, lon: number, raio = 1): [number, number, number] {
  const fi = ((90 - lat) * Math.PI) / 180;
  const teta = (((lon + 180) / 360) * 2 * Math.PI);
  const sf = Math.sin(fi);
  return [sf * Math.cos(teta) * raio, Math.cos(fi) * raio, sf * Math.sin(teta) * raio];
}

/** O caminho de volta: do ponto na esfera para latitude/longitude. */
export function paraLatLon(x: number, y: number, z: number) {
  const n = Math.hypot(x, y, z) || 1;
  const fi = Math.acos(Math.min(1, Math.max(-1, y / n)));
  let teta = Math.atan2(z / n, x / n);
  if (teta < 0) teta += Math.PI * 2;
  return {
    lat: 90 - (fi * 180) / Math.PI,
    lon: (teta / (Math.PI * 2)) * 360 - 180,
  };
}

/** "12.34° S, 56.78° O" — como o painel mostra a coordenada. */
export function coordenadaLegivel(lat: number, lon: number) {
  const ns = lat >= 0 ? 'N' : 'S';
  const lo = lon >= 0 ? 'L' : 'O';
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lon).toFixed(2)}° ${lo}`;
}

/** Lê a lista vinda do banco sem confiar no formato. */
export function lerLocais(valor: unknown): Local[] {
  if (!Array.isArray(valor)) return [];
  const out: Local[] = [];
  for (const item of valor) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const lat = Number(o.lat), lon = Number(o.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    out.push({
      id: String(o.id ?? ''),
      nome: typeof o.nome === 'string' && o.nome.trim() ? o.nome.trim() : 'sem nome',
      tipo: (TIPOS.some((t) => t.id === o.tipo) ? o.tipo : 'cidade') as TipoLocal,
      resumo: typeof o.resumo === 'string' ? o.resumo : null,
      lat: Math.min(90, Math.max(-90, lat)),
      lon: ((((lon + 180) % 360) + 360) % 360) - 180,
      altitude: Number.isFinite(Number(o.altitude)) ? Number(o.altitude) : 0,
    });
    if (out.length >= LIMITES_LOCAL.total) break;
  }
  return out;
}
