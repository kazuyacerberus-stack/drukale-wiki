import { projetarMapaPlano } from '../../lib/cartografia';
import type { Local } from '../../lib/mundo';

/** Dados exclusivos da carta 2D. Não há malhas, materiais ou estado do globo. */
export const BIOMA = { mar: 0, campo: 1, floresta: 2, deserto: 3, serra: 4, neve: 5, vulcanico: 6 } as const;
export type BiomaCarta = typeof BIOMA[keyof typeof BIOMA];
export type SegmentoCarta = [number, number, number, number];
export type DetalheCarta = { x: number; y: number; tamanho: number; variacao: number; bioma: BiomaCarta };
export type TerrenoCarta = {
  largura: number; altura: number; biomas: Uint8Array; distanciaCosta: Uint8Array;
  costas: SegmentoCarta[]; isobatas: SegmentoCarta[][]; detalhes: DetalheCarta[];
};
export type CasaCarta = { x: number; y: number; largura: number; fundo: number; altura: number; telhado: number };
export type LocalCarta = {
  id: string; tipo: Local['tipo']; x: number; y: number; tamanho: number; semente: number;
  casas: CasaCarta[]; regiao: { x: number; y: number }[][]; pendente: boolean;
};

export function sementeCarta(texto: string): number {
  let n = 2166136261;
  for (let i = 0; i < texto.length; i++) n = Math.imul(n ^ texto.charCodeAt(i), 16777619);
  return n >>> 0;
}
export function sorteioCarta(semente: number) {
  let n = semente >>> 0;
  return () => { n += 0x6d2b79f5; let t = Math.imul(n ^ n >>> 15, 1 | n); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

/** A cor é lida apenas para identificar o bioma; nenhum pixel da textura 3D é copiado. */
export function biomaDaAmostra(r: number, g: number, b: number, agua: number, neve: number, lava: number): BiomaCarta {
  if (neve > 105) return BIOMA.neve;
  if (agua > 127) return BIOMA.mar;
  if (lava > 75) return BIOMA.vulcanico;
  if (g > r * 1.12 && g > b * 1.15) return BIOMA.floresta;
  if (r > g * 1.13 && g > b * 1.2) return BIOMA.deserto;
  if ((Math.max(r, g, b) - Math.min(r, g, b) < 38 && r > 40) || (r < 65 && g < 65)) return BIOMA.serra;
  return BIOMA.campo;
}

/** Marching squares: traços de costa e curvas de profundidade independentes da resolução da tela. */
function isolinhas(valores: ArrayLike<number>, L: number, A: number, corte: number): SegmentoCarta[] {
  const linhas: SegmentoCarta[] = [];
  for (let y = 0; y < A - 1; y++) for (let x = 0; x < L - 1; x++) {
    const k = y * L + x;
    const v = [valores[k], valores[k + 1], valores[k + L + 1], valores[k + L]];
    const cantos = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
    const cruzamentos: number[][] = [];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      if ((v[i] >= corte) === (v[j] >= corte)) continue;
      const t = (corte - v[i]) / (v[j] - v[i]);
      cruzamentos.push([cantos[i][0] + (cantos[j][0] - cantos[i][0]) * t, cantos[i][1] + (cantos[j][1] - cantos[i][1]) * t]);
    }
    for (let i = 0; i + 1 < cruzamentos.length; i += 2) linhas.push([...cruzamentos[i], ...cruzamentos[i + 1]] as SegmentoCarta);
  }
  return linhas;
}

export function prepararTerrenoCarta(cor: Uint8ClampedArray, mascara: Uint8ClampedArray, L: number, A: number, resolucao = 720): TerrenoCarta | null {
  if (!Number.isInteger(L) || !Number.isInteger(A) || L < 2 || A < 2 || cor.length < L * A * 4 || mascara.length < L * A * 4) return null;
  const largura = Math.max(24, Math.min(960, Math.round(resolucao))), altura = Math.max(12, Math.round(largura * A / L));
  const biomas = new Uint8Array(largura * altura), terra = new Uint8Array(biomas.length), distanciaCosta = new Uint8Array(biomas.length);
  for (let y = 0; y < altura; y++) for (let x = 0; x < largura; x++) {
    const sx = Math.min(L - 1, Math.floor((x + .5) / largura * L)), sy = Math.min(A - 1, Math.floor((y + .5) / altura * A)), k = (sy * L + sx) * 4;
    const bioma = biomaDaAmostra(cor[k], cor[k + 1], cor[k + 2], mascara[k], mascara[k + 1], mascara[k + 2]);
    const i = y * largura + x; biomas[i] = bioma; terra[i] = bioma === BIOMA.mar ? 0 : 1; distanciaCosta[i] = terra[i] ? 0 : 100;
  }
  // Campo de distância limitado: só o mar recebe as curvas da plataforma costeira.
  for (let y = 0; y < altura; y++) for (let x = 0; x < largura; x++) {
    const i = y * largura + x;
    if (x) distanciaCosta[i] = Math.min(distanciaCosta[i], distanciaCosta[i - 1] + 1);
    if (y) distanciaCosta[i] = Math.min(distanciaCosta[i], distanciaCosta[i - largura] + 1);
  }
  for (let y = altura - 1; y >= 0; y--) for (let x = largura - 1; x >= 0; x--) {
    const i = y * largura + x;
    if (x < largura - 1) distanciaCosta[i] = Math.min(distanciaCosta[i], distanciaCosta[i + 1] + 1);
    if (y < altura - 1) distanciaCosta[i] = Math.min(distanciaCosta[i], distanciaCosta[i + largura] + 1);
  }
  const rnd = sorteioCarta(614409), detalhes: DetalheCarta[] = [];
  for (let y = 5; y < altura - 5; y += 6) for (let x = 5; x < largura - 5; x += 6) {
    const xx = x + (rnd() - .5) * 4, yy = y + (rnd() - .5) * 3, k = Math.floor(yy) * largura + Math.floor(xx), bioma = biomas[k] as BiomaCarta;
    const variacao = rnd(), chance = rnd();
    if (bioma === BIOMA.mar ? distanciaCosta[k] < 6 || chance > .055 : chance > (bioma === BIOMA.floresta ? .94 : bioma === BIOMA.serra ? .70 : .34)) continue;
    detalhes.push({ x: xx, y: yy, tamanho: 1.7 + rnd() * 1.8, variacao, bioma });
  }
  detalhes.sort((a, b) => a.y - b.y);
  return { largura, altura, biomas, distanciaCosta, costas: isolinhas(terra, largura, altura, .5), isobatas: [3.5, 7.5, 13.5].map(n => isolinhas(distanciaCosta, largura, altura, n)), detalhes };
}

/** Circunferência geográfica do raio cadastrado, cortada ao cruzar a emenda do mapa. */
export function regiaoNaCarta(lat: number, lon: number, raio: number): LocalCarta['regiao'] {
  if (!projetarMapaPlano(lat, lon) || !Number.isFinite(raio) || raio <= 0) return [];
  const rad = Math.PI / 180, phi = lat * rad, lambda = lon * rad, d = Math.min(25, raio) * rad;
  const segmentos: LocalCarta['regiao'] = [[]];
  let anterior: { x: number; y: number } | null = null;
  for (let i = 0; i <= 96; i++) {
    const rumo = i / 96 * Math.PI * 2;
    const p = Math.asin(Math.max(-1, Math.min(1, Math.sin(phi) * Math.cos(d) + Math.cos(phi) * Math.sin(d) * Math.cos(rumo))));
    const l = lambda + Math.atan2(Math.sin(rumo) * Math.sin(d) * Math.cos(phi), Math.cos(d) - Math.sin(phi) * Math.sin(p));
    const ponto = { x: ((l / rad + 540) % 360) / 360, y: (90 - p / rad) / 180 };
    if (anterior && Math.abs(anterior.x - ponto.x) > .5) segmentos.push([]);
    segmentos[segmentos.length - 1].push(ponto); anterior = ponto;
  }
  return segmentos.filter(s => s.length > 1);
}

/** Sem registros não existem cidades decorativas. O ID mantém o desenho estável ao renomear. */
export function planejarLocaisCarta(locais: Pick<Local, 'id' | 'nome' | 'tipo' | 'lat' | 'lon' | 'raio' | 'statusAprovacao'>[]): LocalCarta[] {
  return locais.flatMap(local => {
    const p = projetarMapaPlano(local.lat, local.lon); if (!p) return [];
    const semente = sementeCarta(local.id), rnd = sorteioCarta(semente);
    const civil = local.tipo === 'cidade' || local.tipo === 'capital', fortificado = local.tipo === 'base' || local.tipo === 'quartel';
    const tamanho = local.tipo === 'capital' ? 13 : civil ? 10 : fortificado ? 8 : 7;
    const casas: CasaCarta[] = [];
    if (civil || fortificado || local.tipo === 'ruina') {
      const densidade = local.tipo === 'capital' ? 5 : civil ? 4 : 2;
      for (let y = -densidade; y <= densidade; y++) for (let x = -densidade; x <= densidade; x++) {
        if (x * x + y * y > densidade * densidade || (Math.abs(x) <= 1 && Math.abs(y) <= 1) || rnd() < .17) continue;
        const passo = tamanho / (densidade + 1);
        casas.push({ x: x * passo + (rnd() - .5) * passo * .25, y: y * passo * .72 + (rnd() - .5) * passo * .2,
          largura: passo * (.22 + rnd() * .10), fundo: passo * (.17 + rnd() * .10), altura: passo * (.32 + rnd() * .4), telhado: rnd() });
      }
    }
    casas.sort((a, b) => a.y - b.y);
    return [{ id: local.id, tipo: local.tipo, x: p.x / 100, y: p.y / 100, tamanho, semente, casas,
      regiao: local.tipo === 'orbital' || local.tipo === 'serpente' ? [] : regiaoNaCarta(local.lat, local.lon, local.raio), pendente: local.statusAprovacao !== 'aprovado' }];
  });
}
