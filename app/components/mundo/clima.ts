export const MAX_FENOMENOS = 4;
export const TIPOS_CLIMA = ['tempestade', 'ciclone', 'tsunami'] as const;
export type TipoClima = typeof TIPOS_CLIMA[number];
export type PontoClima = { lat: number; lon: number; oceano: boolean; costa: boolean };
export type Fenomeno = PontoClima & {
  id: string; tipo: TipoClima; raio: number; intensidade: number;
  progresso: number; opacidade: number;
};
export type EstadoClima = { eventos: Fenomeno[]; tempo: number; raios: boolean };
export const NOMES_CLIMA: Record<TipoClima, string> = {
  tempestade: 'Tempestade', ciclone: 'Ciclone', tsunami: 'Tsunami',
};

const suave = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
export function aleatorio(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Amostra a mesma máscara usada pelo globo: tsunami/ciclone nunca nascem em terra. */
export function candidatosClima(pixels: Uint8ClampedArray, largura: number, altura: number): PontoClima[] {
  if (largura < 1 || altura < 1 || pixels.length < largura * altura * 4) return [];
  const pontos: PontoClima[] = [];
  const amostra = (x: number, y: number) => {
    const xx = ((Math.round(x) % largura) + largura) % largura;
    const yy = Math.max(0, Math.min(altura - 1, Math.round(y)));
    return (yy * largura + xx) * 4;
  };
  for (let linha = 0; linha < 24; linha++) {
    const lat = 58 - (linha / 23) * 116;
    const y = ((90 - lat) / 180) * (altura - 1);
    for (let coluna = 0; coluna < 48; coluna++) {
      const lon = -176.25 + coluna * 7.5;
      const x = ((lon + 180) / 360) * largura;
      const i = amostra(x, y);
      if (pixels[i + 1] > 100 || pixels[i + 2] > 120) continue; // gelo e lava
      const oceano = pixels[i] > 200;
      let costa = false;
      if (oceano) {
        for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2;
          const j = amostra(x + Math.cos(ang) * largura / 36, y + Math.sin(ang) * altura / 18);
          if (pixels[j] < 80 && pixels[j + 1] < 100) { costa = true; break; }
        }
      }
      pontos.push({ lat, lon, oceano, costa });
    }
  }
  return pontos;
}

export function vetorClima(lat: number, lon: number): [number, number, number] {
  const la = lat * Math.PI / 180, lo = (lon + 180) * Math.PI / 180;
  return [Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo)];
}

/** Um relógio independente da taxa de quadros; não salta ao voltar de outra aba. */
export function avancarClima(tempo: number, delta: number, pausado: boolean, visivel: boolean) {
  if (pausado || !visivel || !Number.isFinite(delta) || delta < 0) return tempo;
  return tempo + Math.min(delta, 0.12);
}

/** Quatro ciclos escalonados: o sorteio muda por região, sem regenerar a geografia. */
export function fenomenosNoInstante(semente: number, segundos: number, pontos: PontoClima[], tipos: TipoClima[], forca = 1): Fenomeno[] {
  if (!pontos.length || !tipos.length || !Number.isFinite(segundos)) return [];
  const permitidos = TIPOS_CLIMA.filter(t => tipos.includes(t));
  if (!permitidos.length) return [];
  const agua = pontos.filter(p => p.oceano);
  const costeiros = agua.filter(p => p.costa);
  const resultado: Fenomeno[] = [];
  for (let slot = 0; slot < MAX_FENOMENOS; slot++) {
    const periodo = 100 + slot * 13;
    const relogio = Math.max(0, segundos) + slot * 27 + 19;
    const ciclo = Math.floor(relogio / periodo);
    const progresso = (relogio % periodo) / periodo;
    const rnd = aleatorio((semente >>> 0) ^ Math.imul(slot + 1, 0x9e3779b9) ^ Math.imul(ciclo + 1, 0x85ebca6b));
    const tipo = permitidos[(slot + (semente >>> 0) + ciclo) % permitidos.length];
    const candidatos = tipo === 'tsunami' ? (costeiros.length ? costeiros : agua) : tipo === 'ciclone' ? agua : pontos;
    if (!candidatos.length) continue;
    let local = candidatos[Math.floor(rnd() * candidatos.length)];
    for (let tentativa = 0; tentativa < 8; tentativa++) {
      const v = vetorClima(local.lat, local.lon);
      const perto = resultado.some(e => {
        const q = vetorClima(e.lat, e.lon);
        return v[0] * q[0] + v[1] * q[1] + v[2] * q[2] > 0.94;
      });
      if (!perto) break;
      local = candidatos[Math.floor(rnd() * candidatos.length)];
    }
    resultado.push({ ...local, id: `${semente}-${slot}-${ciclo}`, tipo,
      raio: (tipo === 'ciclone' ? 14 : tipo === 'tsunami' ? 11 : 9) + rnd() * 7,
      intensidade: (0.65 + rnd() * 0.35) * Math.max(0, Math.min(1.5, forca)),
      progresso, opacidade: suave(progresso / 0.1) * suave((1 - progresso) / 0.12),
    });
  }
  return resultado;
}

export function nomeRegiao(evento: Fenomeno, locais: { nome: string; lat: number; lon: number }[]) {
  const p = vetorClima(evento.lat, evento.lon);
  let perto = '', melhor = Math.cos(16 * Math.PI / 180);
  for (const local of locais) {
    const q = vetorClima(local.lat, local.lon);
    const d = p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
    if (d > melhor) { melhor = d; perto = local.nome; }
  }
  if (perto) return `Região de ${perto}`;
  return `${evento.oceano ? 'Oceano' : 'Terras'} ${evento.lat >= 0 ? 'do norte' : 'do sul'} · ${evento.lon >= 0 ? 'leste' : 'oeste'}`;
}
