/**
 * TEXTURA DO MUNDO DRUKALE
 *
 * Gera os mapas que o globo usa:
 *
 *   cor       — o que a superfície é (mar, mata, deserto, rocha, neve, lava)
 *   normal    — de que lado cada ponto está virado (sai do mapa de altura)
 *   emissão   — o que brilha por conta própria (lava, cidades)
 *   máscara   — R = água, G = gelo/neve, B = lava: diz ao shader como
 *               cada material reflete a luz e o que pulsa
 *   nuvens    — camada à parte, que o shader faz andar e projetar sombra
 *
 * e ainda devolve a altura crua (para a malha subir nas montanhas) e
 * onde ficam os redemoinhos e os monstros marinhos.
 *
 * O terreno sai em duas passadas: a primeira só mede a altura bruta de
 * cada ponto; o nível do mar é escolhido depois, pela proporção de área
 * que deve ficar debaixo d'água. Assim o mundo sempre tem a mesma cara
 * — nem afogado, nem deserto — por mais que o ruído mude.
 */

/* ---------- sorteio com semente: o mesmo mundo toda vez ---------- */
function semente(s: number) {
  let a = s >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- ruído ---------- */
function fazerRuido(rnd: () => number) {
  const TAM = 256;
  const tabela = new Uint8Array(TAM * TAM);
  for (let i = 0; i < tabela.length; i++) tabela[i] = rnd() * 255;

  const suave = (t: number) => t * t * (3 - 2 * t);
  const pegar = (x: number, y: number) => tabela[(y & 255) * TAM + (x & 255)] / 255;

  /**
   * Ruído que se repete a cada P passos na horizontal.
   *
   * O mapa do planeta é uma tira que dá a volta no mundo: o lado direito
   * encosta no esquerdo. Se o ruído não fechar certinho, a emenda aparece
   * como uma cicatriz vertical no globo.
   */
  function valorP(x: number, y: number, P: number) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = suave(x - xi), yf = suave(y - yi);
    let x0 = xi % P; if (x0 < 0) x0 += P;
    let y0 = yi % P; if (y0 < 0) y0 += P;
    const x1 = x0 + 1 === P ? 0 : x0 + 1;
    const y1 = y0 + 1 === P ? 0 : y0 + 1;
    const a = pegar(x0, y0), b = pegar(x1, y0);
    const c = pegar(x0, y1), d = pegar(x1, y1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  }

  /** Várias oitavas, cada uma repetindo um número inteiro de vezes na volta do mundo. */
  function emMapa(
    nucleo: (x: number, y: number, P: number) => number,
    u: number, v: number, P0: number, camadas: number, dx = 0, dy = 0,
  ) {
    let soma = 0, amp = 1, P = P0, total = 0;
    for (let i = 0; i < camadas; i++) {
      soma += nucleo(u * P + dx, v * (P / 2) + dy, P) * amp;
      total += amp;
      amp *= 0.5;
      P *= 2;
    }
    return soma / total;
  }

  const cristaP = (x: number, y: number, P: number) => {
    const t = 1 - Math.abs(valorP(x, y, P) * 2 - 1);
    return t * t;
  };

  /** Colinas redondas. */
  const mapa = (u: number, v: number, P0: number, camadas = 5, dx = 0, dy = 0) =>
    emMapa(valorP, u, v, P0, camadas, dx, dy);

  /** Cristas afiadas — serra, não duna. */
  const mapaCrista = (u: number, v: number, P0: number, camadas = 5, dx = 0, dy = 0) =>
    emMapa(cristaP, u, v, P0, camadas, dx, dy);

  return { mapa, mapaCrista };
}

/** Canvas auxiliar, já limpo. */
function tela(L: number, A: number, fundo?: string) {
  const c = document.createElement('canvas');
  c.width = L; c.height = A;
  const x = c.getContext('2d')!;
  if (fundo) { x.fillStyle = fundo; x.fillRect(0, 0, L, A); }
  return c;
}

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
/** Degrau suave de a até b (funciona também com a > b, invertido). */
const entre = (a: number, b: number, t: number) => {
  const s = clamp01((t - a) / (b - a));
  return s * s * (3 - 2 * s);
};

/**
 * Converte o mapa de altura em mapa de normais.
 *
 * A normal aponta para o lado oposto da subida. Perto dos polos as
 * colunas do mapa ficam espremidas, então a variação horizontal é
 * corrigida pelo seno da latitude — sem isso o relevo aparece esticado
 * nas calotas.
 */
function mapaNormal(altura: Float32Array, L: number, A: number, forca: number) {
  const cv = tela(L, A);
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(L, A);
  const p = img.data;

  for (let y = 0; y < A; y++) {
    const linha = y * L;
    const acima = (y > 0 ? y - 1 : 0) * L;
    const abaixo = (y < A - 1 ? y + 1 : A - 1) * L;
    const sinFi = Math.sin(((y + 0.5) / A) * Math.PI);
    // perto do polo todas as colunas do mapa convergem num ponto: qualquer
    // relevo ali vira raio de estrela. O relevo some suave nas calotas
    const some = entre(0.2, 0.45, sinFi);
    const escX = (forca * some) / Math.max(0.25, sinFi);
    const forcaY = forca * some;

    for (let x = 0; x < L; x++) {
      const esq = x === 0 ? L - 1 : x - 1;
      const dir = x === L - 1 ? 0 : x + 1;

      const dx = (altura[linha + dir] - altura[linha + esq]) * escX;
      const dy = (altura[abaixo + x] - altura[acima + x]) * forcaY;

      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const i = (linha + x) * 4;
      p[i] = (-dx * inv * 0.5 + 0.5) * 255;
      p[i + 1] = (-dy * inv * 0.5 + 0.5) * 255;
      p[i + 2] = (inv * 0.5 + 0.5) * 255;
      p[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

export type PontoMundo = { lat: number; lon: number };
export type Mapas = {
  cor: HTMLCanvasElement;
  normal: HTMLCanvasElement;
  emissivo: HTMLCanvasElement;
  mascara: HTMLCanvasElement;
  nuvens: HTMLCanvasElement;
  /** altura acima do mar, por pixel (0 no mar); a malha do globo sobe com ela */
  altura: Float32Array;
  L: number;
  A: number;
  /** onde o mar gira — o shader desenha e anima */
  redemoinhos: PontoMundo[];
  /** mar aberto grande o bastante para um leviatã nadar sem encostar em terra */
  monstros: PontoMundo[];
};
export type AjustesMundo = {
  sementeNum?: number;
  fendas?: number;
  brilhoLava?: number;
  /** quanto do frio vira neve/gelo (1 = normal) */
  gelo?: number;
  /** força do relevo nas normais; 0 deixa a esfera lisa */
  relevo?: number;
  /** fração da superfície debaixo d'água, 0 a 0.9 */
  mar?: number;
};

type RGB = [number, number, number];
const DESERTO: RGB = [206, 170, 116];
const ESTEPE: RGB = [136, 126, 80];
const TUNDRA: RGB = [108, 102, 86];
const TROPICAL: RGB = [24, 54, 22];
const TEMPERADA: RGB = [42, 70, 32];
const TAIGA: RGB = [30, 48, 36];
const ROCHA_ESC: RGB = [84, 77, 70];
const ROCHA_CLA: RGB = [140, 130, 118];
const ROCHA_QUENTE: RGB = [132, 92, 66];
const PRAIA: RGB = [212, 194, 150];
const NEVE: RGB = [238, 242, 248];
const GELO: RGB = [200, 218, 238];
const BASALTO: RGB = [44, 39, 38];

export function gerarMundo(L: number, A: number, cfg: AjustesMundo = {}): Mapas {
  const {
    sementeNum = 20260915,
    fendas = 18,
    brilhoLava = 1.0,
    gelo = 1.0,
    relevo = 11,
    mar = 0.6,
  } = cfg;
  const OCEANO = Math.min(0.9, Math.max(0, mar));

  const rnd = semente(sementeNum);
  const ruido = fazerRuido(rnd);
  const escala = L / 2048;
  const N = L * A;

  // a ferida: o grande rasgo de lava do mundo. Em volta dela o chão é
  // forçado a ser terra firme e vira um ermo de basalto
  const fx = L * 0.63, fy = A * 0.44;
  const zonaFerida = (x: number, y: number, sinFi: number) => {
    let dx = Math.abs(x - fx); if (dx > L / 2) dx = L - dx;
    return Math.max(0, 1 - Math.hypot(dx * sinFi, y - fy) / (A * 0.24));
  };

  /* ---------- campos largos numa grade reduzida ----------
     O que muda devagar pelo mapa (continentes, umidade, a linha das
     cordilheiras, a torção do litoral) é calculado a cada 4 pixels e
     interpolado. Só o detalhe fino roda pixel a pixel — é o que deixa
     a geração umas três vezes mais rápida sem perder nitidez. */
  const G = 4;
  const LG = L / G, AG = Math.floor(A / G) + 1;
  const grade = (f: (u: number, v: number, i: number) => number) => {
    const out = new Float32Array(LG * AG);
    for (let gy = 0; gy < AG; gy++) {
      const v = Math.min(1, (gy * G) / A);
      for (let gx = 0; gx < LG; gx++) out[gy * LG + gx] = f((gx * G) / L, v, gy * LG + gx);
    }
    return out;
  };
  const ler = (g: Float32Array, x: number, y: number) => {
    const gx = x / G, gy = y / G;
    const x0 = gx | 0, y0 = gy | 0;
    const tx = gx - x0, ty = gy - y0;
    const x1 = x0 + 1 === LG ? 0 : x0 + 1;
    const y1 = Math.min(AG - 1, y0 + 1);
    const a = g[y0 * LG + x0], b = g[y0 * LG + x1];
    const c = g[y1 * LG + x0], d = g[y1 * LG + x1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
  const tortoX = (u: number, v: number) => ruido.mapa(u, v, 4, 3, 17, 3) - 0.5;
  const tortoY = (u: number, v: number) => ruido.mapa(u, v, 4, 3, 53, 29) - 0.5;
  const gWx = grade(tortoX);
  const gWy = grade(tortoY);
  const gN1 = grade((u, v, i) => {
    const uu = u + gWx[i] * 0.09, vv = v + gWy[i] * 0.06;
    return ruido.mapa(uu, vv, 3, 5, 120, 205) * 0.5 + ruido.mapa(uu, vv, 6, 4, 40, 7) * 0.5;
  });
  // a cordilheira corre ao longo da curva de nível do meio de um ruído
  // largo: isso desenha cadeias compridas e sinuosas, como bordas de placa
  const gCinto = grade((u, v, i) => ruido.mapa(u + gWx[i] * 0.09, v + gWy[i] * 0.06, 4, 3, 400, 150));
  const gTrecho = grade((u, v) => ruido.mapa(u, v, 3, 2, 77, 501));
  const gUmid = grade((u, v) => ruido.mapa(u, v, 5, 4, 310, 88));
  const gNuvT = grade((u, v) => ruido.mapa(u, v, 5, 2, 700, 11) - 0.5);

  /**
   * O valor abaixo do qual fica a fração `p` do campo.
   *
   * Ruído de poucas oitavas não tem média 0,5 garantida: com a semente
   * errada ele sai todo puxado para um lado, e um corte fixo em 0,5 some
   * com as cordilheiras (ou afoga o mundo em nuvem). Cortar pelo
   * percentil do próprio campo dá sempre a mesma proporção.
   */
  const percentil = (g: Float32Array, p: number) => {
    const copia = Float32Array.from(g).sort();
    return copia[Math.min(copia.length - 1, Math.floor(copia.length * p))];
  };
  const MEIO_CINTO = percentil(gCinto, 0.5);
  const CORTE_TRECHO = percentil(gTrecho, 0.3);
  const MEIO_UMID = percentil(gUmid, 0.5);
  const CORTE_NUVEM = percentil(grade((u, v) => ruido.mapa(u, v, 7, 4, 610, 320)), 0.6);

  /* ============================================================
     1) ALTURA BRUTA
     ============================================================ */
  const bruto = new Float32Array(N);
  const montF = new Float32Array(N);
  const envB = new Uint8Array(N);
  const umidB = new Uint8Array(N);
  const detB = new Uint8Array(N);
  const serraB = new Uint8Array(N);

  for (let y = 0; y < A; y++) {
    const v = y / A;
    const sinFi = Math.sin(((y + 0.5) / A) * Math.PI);
    for (let x = 0; x < L; x++) {
      const u = x / L;
      const uu = u + ler(gWx, x, y) * 0.09, vv = v + ler(gWy, x, y) * 0.06;

      const n1 = ler(gN1, x, y);
      const n2 = ruido.mapa(uu, vv, 20, 3, 90, 13);
      const n3 = ruido.mapa(u, v, 64, 2, 11, 44);

      // o detalhe médio torce a beirada da serra: sem isso a cordilheira
      // sai com a borda lisa, feito uma minhoca
      const linha = Math.max(0, 1 - Math.abs(ler(gCinto, x, y) + (n2 - 0.5) * 0.05 - MEIO_CINTO) * 15);
      const liga = clamp01((ler(gTrecho, x, y) - CORTE_TRECHO) / 0.12);
      // envoltória: o planalto em volta da serra; crista: o pico em si
      const env = linha * linha * liga;
      let serra = ruido.mapaCrista(uu, vv, 12, 4, 200, 77);
      // dentro da cordilheira, mais duas oitavas finas: aresta, ravina,
      // vale estreito. Fora dela ninguém veria a diferença, então não roda
      if (env > 0.02) serra = serra * 0.75 + ruido.mapaCrista(uu, vv, 96, 2, 31, 9) * 0.25;
      const mont = env * Math.pow(serra, 1.6);
      const zf = zonaFerida(x, y, sinFi);

      const k = y * L + x;
      bruto[k] = n1 * 0.8 + n2 * 0.13 + n3 * 0.04 + env * 0.14 + mont * 0.3 + zf * zf * 0.16;
      montF[k] = mont;
      envB[k] = env * 255;
      umidB[k] = clamp01(ler(gUmid, x, y) - MEIO_UMID + 0.5) * 255;
      detB[k] = n3 * 255;
      serraB[k] = serra * 255;
    }
  }

  /* ---------- nível do mar pela área, não pelo pixel ---------- */
  // cada linha do mapa cobre menos chão perto dos polos; sem o peso do
  // seno, as calotas contariam como se fossem continentes inteiros
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < N; i++) { const b = bruto[i]; if (b < min) min = b; if (b > max) max = b; }
  const BINS = 2048;
  const hist = new Float64Array(BINS);
  const faixaB = max - min || 1;
  let pesoTotal = 0;
  for (let y = 0; y < A; y++) {
    const w = Math.sin(((y + 0.5) / A) * Math.PI);
    for (let x = 0; x < L; x++) {
      hist[Math.min(BINS - 1, ((bruto[y * L + x] - min) / faixaB * BINS) | 0)] += w;
    }
    pesoTotal += w * L;
  }
  let MAR = min, TOPO = max, acum = 0;
  let achouMar = false;
  for (let i = 0; i < BINS; i++) {
    acum += hist[i];
    if (!achouMar && acum >= pesoTotal * OCEANO) { MAR = min + ((i + 1) / BINS) * faixaB; achouMar = true; }
    // o topo é o percentil 99,7 e não o máximo: um único pico isolado não
    // pode achatar o resto do mundo
    if (acum >= pesoTotal * 0.997) { TOPO = min + ((i + 1) / BINS) * faixaB; break; }
  }

  /* ============================================================
     2) SUPERFÍCIE — bioma, gelo, oceano e nuvens
     ============================================================ */
  const cvCor = tela(L, A);
  const ctx = cvCor.getContext('2d')!;
  const img = ctx.createImageData(L, A);
  const px = img.data;

  const cvMsk = tela(L, A);
  const mctx = cvMsk.getContext('2d')!;
  const imgM = mctx.createImageData(L, A);
  const pm = imgM.data;

  const cvEmi = tela(L, A);
  const emi = cvEmi.getContext('2d')!;
  const imgE = emi.createImageData(L, A);
  const pe = imgE.data;

  const cvNuv = tela(L, A);
  const nctx = cvNuv.getContext('2d')!;
  const imgN = nctx.createImageData(L, A);
  const pn = imgN.data;

  const H = new Float32Array(N);

  // ciclones: espirais de nuvem nas faixas tropicais
  // (tempestade tropical nasce e vive no mar — em cima de terra ela morre)
  const ciclones = Array.from({ length: 3 }, (_, i) => {
    const sul = i % 2 === 1;
    let x = 0, y = 0;
    for (let t = 0; t < 60; t++) {
      const latC = (12 + rnd() * 18) * (sul ? -1 : 1);
      x = rnd() * L; y = ((90 - latC) / 180) * A;
      if (bruto[(y | 0) * L + (x | 0)] < MAR) break;
    }
    return { x, y, R: A * (0.045 + rnd() * 0.03), giro: sul ? -1 : 1 };
  });

  for (let y = 0; y < A; y++) {
    const v = y / A;
    const latG = 90 - ((y + 0.5) / A) * 180;
    const doPolo = Math.abs(latG) / 90;
    const sinFi = Math.sin(((y + 0.5) / A) * Math.PI);
    // o cinturão seco dos trópicos (onde nascem os grandes desertos) e a
    // faixa de chuva do equador (onde nasce a mata fechada)
    const secaSub = Math.exp(-Math.pow((Math.abs(latG) - 24) / 10, 2)) * 0.3;
    const chuvaEq = Math.exp(-Math.pow(latG / 11, 2)) * 0.35;
    // nas calotas o mapa espreme cada detalhe fino num risco que aponta
    // para o polo: perto dele, o detalhe se apaga e o gelo fica liso
    const qPolo = entre(0.95, 0.7, doPolo);

    for (let x = 0; x < L; x++) {
      const u = x / L;
      const k = y * L + x;
      const i = k * 4;
      const b = bruto[k];
      const mont = montF[k];
      let umid = umidB[k] / 255;
      let det = detB[k] / 255;
      let serra = serraB[k] / 255;
      if (qPolo < 1) {
        // nas calotas o ruído do mapa troca por um ruído amostrado numa
        // projeção centrada no próprio polo: lá ele não tem emenda nem
        // cunha, e o gelo racha em placas de verdade em vez de raios
        const colat = (1 - doPolo) * (Math.PI / 2);
        const ang = u * Math.PI * 2;
        const px0 = 0.5 + colat * Math.cos(ang) * 0.9 + (latG < 0 ? 0.37 : 0);
        const py0 = 0.5 + colat * Math.sin(ang) * 0.9;
        const w = 1 - qPolo;
        const pd = ruido.mapa(px0, py0, 16, 3, 5, 9);
        const ps = ruido.mapaCrista(px0, py0, 12, 3, 17, 3);
        det = det * qPolo + pd * w;
        serra = serra * qPolo + ps * w;
        umid = umid * qPolo + 0.5 * w;
      }

      let r: number, g: number, bl: number;
      let h = 0, agua = 0, neve = 0;

      if (b < MAR) {
        /* ---------- mar ---------- */
        const d = Math.min(1, ((MAR - b) / (MAR - min)) * 1.6);   // 0 costa, 1 abismo
        const plat = Math.max(0, 1 - d / 0.22);                    // plataforma continental
        const raso = Math.max(0, 1 - d / 0.05);                    // beirada turquesa
        r = 4 + 8 * (1 - d);
        g = 14 + 26 * (1 - d);
        bl = 38 + 42 * (1 - d);
        r += plat * 8; g += plat * 26; bl += plat * 22;
        r += raso * 24; g += raso * 52; bl += raso * 30;
        const vr = (det - 0.5) * 6;
        r += vr; g += vr * 1.5; bl += vr * 2;
        agua = 1;

        // banquisa: placas de gelo boiando no mar polar
        const banq = doPolo + (det - 0.5) * 0.12 + (umid - 0.5) * 0.1;
        const mg = clamp01((banq - 0.8) / 0.08);
        // a banquisa racha em placas: as cristas do ruído de serra formam
        // uma rede de polígonos — dentro é gelo, na linha é mar escuro
        const placa = mg >= 1 ? (serra > 0.8 ? 0.45 : 1) : mg * (serra < 0.5 ? 1 : 0.1);
        if (placa > 0) {
          r += (222 - r) * placa; g += (233 - g) * placa; bl += (245 - bl) * placa;
          agua = 1 - placa;
          neve = placa;
          h = placa * 0.012;
        }
      } else {
        /* ---------- terra ---------- */
        const e = Math.min(1, (b - MAR) / (TOPO - MAR));   // 0 praia, 1 pico
        const env = envB[k] / 255;
        // o frio vem da latitude e da altitude — mas só a CRISTA da serra
        // fica branca, não a cordilheira inteira
        const tempLat = 1 - Math.pow(doPolo, 1.4) * 1.3 + (umid - 0.5) * 0.1 + (det - 0.5) * 0.06;
        const temp = tempLat - (mont * 0.9 + e * 0.2) * 1.1;
        const hum = clamp01((umid - 0.5) * 4 + 0.5 + chuvaEq - secaSub
                            + Math.max(0, 0.1 - e) * 1.5 - env * 0.25);

        const quente = entre(0.55, 0.78, temp);
        const frio = 1 - entre(0.2, 0.42, temp);
        const ameno = Math.max(0, 1 - quente - frio);
        const molhado = entre(0.4, 0.6, hum);

        // dunas: ondulação fina que fecha certinho na volta do mundo
        const duna = 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * 110 + det * 9 + v * 140);
        const dRes = 1 + (duna - 0.5) * 0.12 * quente * (1 - molhado);

        const sr = (DESERTO[0] * dRes) * quente + ESTEPE[0] * ameno + TUNDRA[0] * frio;
        const sg = (DESERTO[1] * dRes) * quente + ESTEPE[1] * ameno + TUNDRA[1] * frio;
        const sb = (DESERTO[2] * dRes) * quente + ESTEPE[2] * ameno + TUNDRA[2] * frio;
        const ur = TROPICAL[0] * quente + TEMPERADA[0] * ameno + TAIGA[0] * frio;
        const ug = TROPICAL[1] * quente + TEMPERADA[1] * ameno + TAIGA[1] * frio;
        const ub = TROPICAL[2] * quente + TEMPERADA[2] * ameno + TAIGA[2] * frio;
        r = sr + (ur - sr) * molhado;
        g = sg + (ug - sg) * molhado;
        bl = sb + (ub - sb) * molhado;

        // dossel: a mata não é tinta lisa, é copa sobre copa
        const copa = 1 + (det - 0.5) * 0.4 * molhado;
        r *= copa; g *= copa; bl *= copa;

        // rocha nua subindo a serra, com estratos
        const rw = entre(0.3, 0.65, e * 0.6 + mont * 0.9 + env * 0.25);
        if (rw > 0) {
          let rr = ROCHA_ESC[0] + (ROCHA_CLA[0] - ROCHA_ESC[0]) * serra;
          let rg = ROCHA_ESC[1] + (ROCHA_CLA[1] - ROCHA_ESC[1]) * serra;
          let rb = ROCHA_ESC[2] + (ROCHA_CLA[2] - ROCHA_ESC[2]) * serra;
          const qt = quente * 0.5;
          rr += (ROCHA_QUENTE[0] - rr) * qt; rg += (ROCHA_QUENTE[1] - rg) * qt; rb += (ROCHA_QUENTE[2] - rb) * qt;
          const estrato = 1 + (serra - 0.5) * 0.25;
          r += (rr * estrato - r) * rw; g += (rg * estrato - g) * rw; bl += (rb * estrato - bl) * rw;
        }

        // areia na beira d'água (não no gelo, não no penhasco)
        const pr = (1 - entre(0, 0.018, e)) * (1 - frio) * (1 - rw);
        if (pr > 0) { r += (PRAIA[0] - r) * pr; g += (PRAIA[1] - g) * pr; bl += (PRAIA[2] - bl) * pr; }

        // o ermo de basalto em volta da ferida
        const zf = zonaFerida(x, y, sinFi);
        if (zf > 0) {
          const t = Math.pow(Math.min(1, zf * 1.7), 0.8) * 0.9;
          const s = 0.85 + det * 0.3;
          r += (BASALTO[0] * s - r) * t; g += (BASALTO[1] * s - g) * t; bl += (BASALTO[2] * s - bl) * t;
        }

        // neve nos picos e nas terras frias
        const sn = entre(0.12, -0.02, temp + (serra - 0.5) * 0.1) * Math.min(1, gelo);
        if (sn > 0) {
          const s = 0.9 + serra * 0.1;
          r += (NEVE[0] * s - r) * sn; g += (NEVE[1] * s - g) * sn; bl += (NEVE[2] * s - bl) * sn;
        }
        // geleira: gelo grosso e azulado, rasgado por fendas — é coisa de
        // polo; no alto da serra o que fica é a neve de cima
        const gi = entre(-0.05, -0.3, tempLat) * Math.min(1, gelo);
        if (gi > 0) {
          r += (GELO[0] - r) * gi; g += (GELO[1] - g) * gi; bl += (GELO[2] - bl) * gi;
          const fenda = Math.pow(serra, 6) * 0.4 * gi;
          r *= 1 - fenda; g *= 1 - fenda * 0.8; bl *= 1 - fenda * 0.45;
        }
        neve = Math.max(sn, gi);

        h = Math.max(0.001,
          e * 0.3 + env * 0.12 + mont * 0.55
          + (det - 0.5) * 0.02 * (1 - gi) + gi * 0.03);
      }

      H[k] = h;
      px[i] = r; px[i + 1] = g; px[i + 2] = bl; px[i + 3] = 255;
      pm[i] = agua * 255; pm[i + 1] = neve * 255; pm[i + 2] = 0; pm[i + 3] = 255;
      pe[i + 3] = 255;

      /* ---------- nuvens ---------- */
      const cw = ler(gNuvT, x, y);
      const nuv = ruido.mapa(u + cw * 0.07, v + cw * 0.03, 7, 4, 610, 320);
      const faixa = 0.6 + 0.4 * Math.sin(latG * 0.105 + cw * 4);
      // limiar alto e subida rápida: nuvem com borda definida e céu limpo
      // entre elas, em vez de um véu leitoso por cima do mundo inteiro
      let dens = (nuv - CORTE_NUVEM) * 5 * faixa;
      for (const c of ciclones) {
        if (Math.abs(y - c.y) > c.R) continue;
        let dx = x - c.x; if (dx > L / 2) dx -= L; if (dx < -L / 2) dx += L;
        dx *= sinFi;
        const dy = y - c.y;
        const rr = Math.hypot(dx, dy) / c.R;
        if (rr < 1) {
          const ang = Math.atan2(dy, dx) * c.giro;
          const braco = 0.5 + 0.5 * Math.sin(ang * 2 + Math.log(rr + 0.05) * 6);
          const olho = rr < 0.08 ? 0.2 : 1;
          dens = Math.max(dens, (braco * 0.85 + 0.25) * Math.pow(1 - rr, 0.8) * olho);
        }
      }
      // perto dos polos o mapa espreme a nuvem em raios que apontam para o
      // polo: ela rareia a partir de uns 60° e some antes das calotas
      const some = 1 - entre(0.62, 0.78, doPolo);
      dens = clamp01(dens) * some;
      pn[i] = 236; pn[i + 1] = 240; pn[i + 2] = 248;
      pn[i + 3] = Math.pow(dens, 1.3) * 235;
    }
  }

  /* ============================================================
     3) ONDE FICA CADA COISA NO MAR
     ============================================================ */
  const pxDe = (lat: number, lon: number) => ({ x: ((lon + 180) / 360) * L, y: ((90 - lat) / 180) * A });
  const latLon = (x: number, y: number): PontoMundo => ({ lat: 90 - (y / A) * 180, lon: (x / L) * 360 - 180 });
  const ehMar = (x: number, y: number) => {
    const yy = Math.min(A - 1, Math.max(0, y | 0));
    const xx = (((x | 0) % L) + L) % L;
    return bruto[yy * L + xx] < MAR - (MAR - min) * 0.03;
  };
  /** Um disco de raio `raio` (radianos) inteiro no mar, sem gelo por perto. */
  const marAberto = (x: number, y: number, raio: number) => {
    const sinFi = Math.max(0.3, Math.sin((y / A) * Math.PI));
    for (const fr of [0, 0.4, 0.75, 1]) {
      for (let a = 0; a < 12; a++) {
        const ang = (a / 12) * Math.PI * 2;
        const dy = Math.sin(ang) * fr * (raio / Math.PI) * A;
        const dx = (Math.cos(ang) * fr * (raio / (Math.PI * 2)) * L) / sinFi;
        if (!ehMar(x + dx, y + dy)) return false;
      }
    }
    return true;
  };
  const ocupados: { x: number; y: number }[] = [];
  const livre = (x: number, y: number, dist: number) => ocupados.every((p) => {
    let dx = Math.abs(p.x - x); if (dx > L / 2) dx = L - dx;
    return Math.hypot(dx, p.y - y) > dist;
  });
  const sortearNoMar = (quantos: number, raio: number, latMax: number) => {
    const achados: { x: number; y: number }[] = [];
    for (let t = 0; t < 2500 && achados.length < quantos; t++) {
      const lat = (rnd() * 2 - 1) * latMax;
      const { x, y } = pxDe(lat, rnd() * 360 - 180);
      if (!livre(x, y, A * 0.09)) continue;
      if (!marAberto(x, y, raio)) continue;
      achados.push({ x, y });
      ocupados.push({ x, y });
    }
    return achados;
  };

  const leviatas = sortearNoMar(2, 0.24, 50);
  const redemoinhos = sortearNoMar(5, 0.1, 55);
  const krakens = sortearNoMar(2, 0.09, 55);

  /* ============================================================
     4) VULCÕES — cone, cratera acesa, cinzas e lava escorrendo
     ============================================================ */
  type Vulcao = { x: number; y: number; R: number; ilha: boolean };
  const vulcoes: Vulcao[] = [];
  const afastado = (x: number, y: number, dist: number) => vulcoes.every((p) => {
    let dx = Math.abs(p.x - x); if (dx > L / 2) dx = L - dx;
    return Math.hypot(dx, p.y - y) > dist;
  });
  // nas cordilheiras, onde a crosta dobra
  for (let t = 0; t < 5000 && vulcoes.length < 7; t++) {
    const x = rnd() * L, y = A * (0.18 + rnd() * 0.64);
    const k = (y | 0) * L + (x | 0);
    if (bruto[k] < MAR || montF[k] < 0.3) continue;
    const R = (22 + rnd() * 18) * escala;
    if (x < R * 3 || x > L - R * 3) continue;
    if (!afastado(x, y, A * 0.1)) continue;
    if (Math.hypot(x - fx, y - fy) < A * 0.14) continue;
    vulcoes.push({ x, y, R, ilha: false });
  }
  // dois no ermo da ferida
  for (let t = 0; t < 2; t++) {
    const a = rnd() * Math.PI * 2;
    const d = A * (0.16 + rnd() * 0.07);
    vulcoes.push({ x: fx + Math.cos(a) * d, y: fy + Math.sin(a) * d * 0.8, R: (26 + rnd() * 12) * escala, ilha: false });
  }
  // e ilhas vulcânicas brotando do mar raso
  let ilhas = 0;
  for (let t = 0; t < 4000 && ilhas < 3; t++) {
    const x = rnd() * L, y = A * (0.2 + rnd() * 0.6);
    const k = (y | 0) * L + (x | 0);
    if (bruto[k] >= MAR) continue;
    const d = (MAR - bruto[k]) / (MAR - min);
    if (d < 0.06 || d > 0.35) continue;
    const R = (14 + rnd() * 10) * escala;
    if (x < R * 3 || x > L - R * 3) continue;
    if (!afastado(x, y, A * 0.1) || !livre(x, y, A * 0.06)) continue;
    vulcoes.push({ x, y, R, ilha: true });
    ilhas++;
  }

  for (const vc of vulcoes) {
    const ext = vc.R * 1.9;
    const alto = vc.ilha ? 0.28 : 0.38;
    const y0 = Math.max(0, (vc.y - ext) | 0), y1 = Math.min(A - 1, Math.ceil(vc.y + ext));
    for (let y = y0; y <= y1; y++) {
      const sinFi = Math.max(0.25, Math.sin(((y + 0.5) / A) * Math.PI));
      const extX = ext / sinFi;
      for (let xx = Math.floor(vc.x - extX); xx <= Math.ceil(vc.x + extX); xx++) {
        const x = ((xx % L) + L) % L;
        const dx = (xx - vc.x) * sinFi, dy = y - vc.y;
        const rr = Math.hypot(dx, dy) / vc.R;
        if (rr > 1.9) continue;
        const k = y * L + x, i = k * 4;
        const det = detB[k] / 255;

        if (rr < 1) {
          const cone = Math.pow(1 - rr, 1.35);
          let h = vc.ilha ? cone * alto : H[k] + cone * alto;
          if (rr < 0.2) h -= Math.pow(1 - rr / 0.2, 2) * alto * 0.45;
          H[k] = Math.max(0.001, h);

          // encosta de basalto riscada por ravinas
          const ang = Math.atan2(dy, dx);
          const sulco = 0.5 + 0.5 * Math.sin(ang * 11 + (serraB[k] / 255) * 9 + det * 5);
          const s = 0.85 + sulco * 0.2;
          const t = vc.ilha ? entre(0.97, 0.8, rr) : entre(1, 0.45, rr);
          let br = BASALTO[0] * s, bg = BASALTO[1] * s, bb = BASALTO[2] * s;
          if (vc.ilha) {
            // a base da ilha pega verde, a ponta fica pedra
            const mato = entre(0.45, 0.8, rr);
            br += (40 - br) * mato; bg += (64 - bg) * mato; bb += (34 - bb) * mato;
          }
          px[i] += (br - px[i]) * t; px[i + 1] += (bg - px[i + 1]) * t; px[i + 2] += (bb - px[i + 2]) * t;
          if (vc.ilha && rr < 0.97) { pm[i] = 0; pm[i + 1] = 0; }

          // magma na boca
          if (rr < 0.22) {
            const q = 1 - rr / 0.22;
            px[i] += (255 - px[i]) * q * 0.9; px[i + 1] += (118 - px[i + 1]) * q * 0.9; px[i + 2] += (28 - px[i + 2]) * q * 0.9;
            pe[i] = Math.max(pe[i], 255 * q); pe[i + 1] = Math.max(pe[i + 1], 120 * q); pe[i + 2] = Math.max(pe[i + 2], 30 * q);
            pm[i + 2] = Math.max(pm[i + 2], 255 * q);
          }
        } else if (!vc.ilha || pm[i] < 128) {
          // cinza assentada em volta
          const q = (1 - (rr - 1) / 0.9) * 0.3;
          px[i] += (86 - px[i]) * q; px[i + 1] += (80 - px[i + 1]) * q; px[i + 2] += (76 - px[i + 2]) * q;
        }
      }
    }
  }

  /* ============================================================
     A FERIDA — um lago de lava: crosta escura boiando, rachada, com
     o magma aparecendo nas rachas e tomando conta perto do centro,
     cercado por uma muralha de basalto
     ============================================================ */
  const gr = A * 0.095;
  const LADOS = 13;
  const raiosF = Array.from({ length: LADOS }, () => 0.82 + rnd() * 0.3);
  const raioEm = (ang: number) => {
    const t = ((((ang / (Math.PI * 2)) % 1) + 1) % 1) * LADOS;
    const i0 = Math.floor(t) % LADOS;
    const f = t - Math.floor(t);
    const s = f * f * (3 - 2 * f);
    return gr * (raiosF[i0] + (raiosF[(i0 + 1) % LADOS] - raiosF[i0]) * s);
  };
  {
    const ext = gr * 1.35;
    for (let y = Math.max(0, (fy - ext) | 0); y <= Math.min(A - 1, Math.ceil(fy + ext)); y++) {
      for (let xx = Math.floor(fx - ext); xx <= Math.ceil(fx + ext); xx++) {
        const x = ((xx % L) + L) % L;
        const dx = xx - fx, dy = (y - fy) / 0.92;
        const rr = Math.hypot(dx, dy) / raioEm(Math.atan2(dy, dx));
        if (rr > 1.35) continue;
        const k = y * L + x, i = k * 4;
        if (rr < 1) {
          // a rede de cristas de um ruído fino é onde a crosta racha. Duas
          // redes em ângulos diferentes, e torcidas: uma só, alinhada aos
          // eixos, deixava o lago com cara de piso quadriculado
          const tw = (detB[k] / 255 - 0.5) * 3;
          const ax = xx + tw * 4, ay = y - tw * 3;
          const r1 = ruido.mapaCrista((ax * 0.866 - ay * 0.5) / L, (ax * 0.5 + ay * 0.866) / A, 150, 2, 7, 3);
          const r2 = ruido.mapaCrista((ax * 0.34 + ay * 0.94) / L + 0.37, (ay * 0.34 - ax * 0.94) / A + 0.21, 110, 2, 19, 5);
          const racha = Math.max(r1, r2 * 0.95);
          const centro = 1 - rr;
          const brasa = entre(0.62, 0.92, racha + centro * 0.3);
          const s = 0.75 + (detB[k] / 255) * 0.5;
          const cr = 28 * s, cg = 19 * s, cb = 16 * s;
          const quente = 0.35 + 0.65 * centro;
          const mg = 70 + 130 * quente * brasa * brasa, mb = 10 + 50 * quente * brasa * brasa;
          px[i] = cr + (255 - cr) * brasa;
          px[i + 1] = cg + (mg - cg) * brasa;
          px[i + 2] = cb + (mb - cb) * brasa;
          pe[i] = Math.max(pe[i], 255 * brasa * brilhoLava);
          pe[i + 1] = Math.max(pe[i + 1], mg * brasa * 0.9 * brilhoLava);
          pe[i + 2] = Math.max(pe[i + 2], mb * brasa * 0.6 * brilhoLava);
          pm[i] = 0; pm[i + 1] = 0; pm[i + 2] = Math.max(pm[i + 2], brasa * 255);
          // a crosta boia um pouco acima do magma; a beira sobe em muralha
          H[k] = 0.05 + (1 - brasa) * 0.04 + entre(0.75, 1, rr) * 0.25;
        } else {
          // a muralha por fora, descendo em basalto, com o brilho vazando
          const q = 1 - (rr - 1) / 0.35;
          const t = q * 0.9;
          px[i] += (BASALTO[0] - px[i]) * t;
          px[i + 1] += (BASALTO[1] - px[i + 1]) * t;
          px[i + 2] += (BASALTO[2] - px[i + 2]) * t;
          H[k] = Math.max(H[k], 0.3 * q * q);
          const vaza = q * q * q;
          pe[i] = Math.max(pe[i], 110 * vaza * brilhoLava);
          pe[i + 1] = Math.max(pe[i + 1], 30 * vaza * brilhoLava);
        }
      }
    }
  }

  ctx.putImageData(img, 0, 0);
  mctx.putImageData(imgM, 0, 0);
  emi.putImageData(imgE, 0, 0);
  nctx.putImageData(imgN, 0, 0);

  // relevo desenhado à mão (fendas, ferida, tentáculos) — canvas cinza
  // médio: mais claro sobe, mais escuro afunda; no fim é somado à altura
  const cvRel = tela(L, A, '#808080');
  const rel = cvRel.getContext('2d')!;

  /* ---------- lava escorrendo das encostas ---------- */
  for (const vc of vulcoes) {
    // poucos fluxos, curtos e grossos na boca: muitos e finos, o vulcão
    // virava uma aranha
    // e todos escorrem para o mesmo lado (a encosta mais baixa), com
    // tamanhos diferentes — espalhados por igual em volta, viravam garra
    const fluxos = 1 + ((rnd() * 3) | 0);
    const rumo = rnd() * Math.PI * 2;
    for (let f = 0; f < fluxos; f++) {
      let a = rumo + (rnd() - 0.5) * 1.1;
      const sinFi = Math.max(0.25, Math.sin((vc.y / A) * Math.PI));
      let cx = vc.x + (Math.cos(a) * vc.R * 0.15) / sinFi;
      let cy = vc.y + Math.sin(a) * vc.R * 0.15;
      const alcance = vc.R * (0.3 + rnd() * 0.6);
      const passos = 8;
      const trilha: [number, number][] = [[cx, cy]];
      for (let p = 0; p < passos; p++) {
        a += (rnd() - 0.5) * 0.5;
        cx += (Math.cos(a) * (alcance / passos)) / sinFi;
        cy += Math.sin(a) * (alcance / passos);
        trilha.push([cx, cy]);
      }
      const grossa = vc.R / (24 * escala);
      for (const [contexto, camadas] of [
        [ctx, [[5.5, 'rgba(150,34,0,0.3)'], [3, 'rgba(240,96,12,0.55)'], [1.3, 'rgba(255,200,120,0.7)']]],
        [emi, [[4.5, 'rgba(160,40,0,0.3)'], [2.2, 'rgba(255,110,20,0.65)'], [0.9, 'rgba(255,220,160,0.8)']]],
        [mctx, [[3, 'rgba(0,0,255,0.9)']]],
      ] as [CanvasRenderingContext2D, [number, string][]][]) {
        contexto.globalCompositeOperation = 'lighter';
        contexto.lineCap = 'round';
        contexto.lineJoin = 'round';
        for (const [larg, cor] of camadas) {
          contexto.strokeStyle = cor;
          // traço a traço, afinando da boca para a ponta
          for (let n = 1; n < trilha.length; n++) {
            contexto.lineWidth = Math.max(0.6, larg * escala * grossa * (1 - (n / trilha.length) * 0.75));
            contexto.beginPath();
            contexto.moveTo(trilha[n - 1][0], trilha[n - 1][1]);
            contexto.lineTo(trilha[n][0], trilha[n][1]);
            contexto.stroke();
          }
        }
        contexto.globalCompositeOperation = 'source-over';
      }
    }

    // o clarão da boca, que de noite se vê de longe
    emi.globalCompositeOperation = 'lighter';
    const clarao = emi.createRadialGradient(vc.x, vc.y, 0, vc.x, vc.y, vc.R * 0.5);
    clarao.addColorStop(0, `rgba(255,150,50,${0.4 * brilhoLava})`);
    clarao.addColorStop(1, 'rgba(120,20,0,0)');
    emi.fillStyle = clarao;
    emi.beginPath(); emi.arc(vc.x, vc.y, vc.R * 0.5, 0, Math.PI * 2); emi.fill();
    emi.globalCompositeOperation = 'source-over';

    // fumaça subindo e sendo levada pelo vento, na camada de nuvem
    if (!vc.ilha || rnd() < 0.5) {
      const sinFi = Math.max(0.25, Math.sin((vc.y / A) * Math.PI));
      for (let p = 0; p < 12; p++) {
        const t = p / 12;
        const X = vc.x + (t * vc.R * 3) / sinFi;
        const Y = vc.y - t * vc.R * 0.6 + Math.sin(t * 5) * vc.R * 0.15;
        const raio = vc.R * (0.15 + t * 0.5);
        const g = nctx.createRadialGradient(X, Y, 0, X, Y, raio);
        g.addColorStop(0, `rgba(74,68,64,${0.32 * (1 - t)})`);
        g.addColorStop(1, 'rgba(74,68,64,0)');
        nctx.fillStyle = g;
        nctx.beginPath(); nctx.ellipse(X, Y, raio / sinFi, raio, 0, 0, Math.PI * 2); nctx.fill();
      }
    }
  }

  /* ============================================================
     5) FENDAS DE LAVA — só em terra firme
     ============================================================ */
  const riscos: number[][] = [];
  const emTerra = (x: number, y: number) => {
    const yy = Math.min(A - 1, Math.max(0, y | 0));
    const xx = (((x | 0) % L) + L) % L;
    return H[yy * L + xx] > 0.004 && pm[(yy * L + xx) * 4] < 128;
  };
  function rachar(x: number, y: number, ang: number, vida: number, grossura: number) {
    let cx = x, cy = y, a = ang;
    for (let passo = 0; passo < vida; passo++) {
      const comp = (7 + rnd() * 13) * escala;
      const nx = cx + Math.cos(a) * comp;
      const ny = cy + Math.sin(a) * comp;
      const g = grossura * (1 - passo / vida);
      if (g > 0.12 && emTerra((cx + nx) / 2, (cy + ny) / 2)) riscos.push([cx, cy, nx, ny, g]);
      cx = nx; cy = ny;
      a += (rnd() - 0.5) * 0.3;
      if (rnd() < 0.08) a += (rnd() - 0.5) * 1.5;
      if (cy < A * 0.1) a = Math.abs(a);
      if (cy > A * 0.9) a = -Math.abs(a);
      if (rnd() < 0.055 && grossura > 2.2 && passo > 3) {
        rachar(cx, cy, a + (rnd() < 0.5 ? 1 : -1) * (0.6 + rnd() * 0.7), vida * 0.5, grossura * 0.55);
      }
    }
  }

  // as fendas nascem na borda da ferida e morrem no ermo em volta —
  // compridas demais, riscavam meio planeta feito arranhão
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + rnd() * 0.5;
    rachar(fx + Math.cos(a) * A * 0.1, fy + Math.sin(a) * A * 0.1, a, 6 + rnd() * 8, 1.9 + rnd() * 1.1);
  }
  for (let k = 0; k < fendas; k++) {
    const a = rnd() * Math.PI * 2, d = A * (0.11 + rnd() * 0.1);
    rachar(fx + Math.cos(a) * d, fy + Math.sin(a) * d, a + (rnd() - 0.5) * 1.2, 5 + rnd() * 8, 0.5 + rnd() * 1.1);
  }

  const tracar = (contexto: CanvasRenderingContext2D, cor: string, mult: number, op: GlobalCompositeOperation) => {
    contexto.globalCompositeOperation = op;
    contexto.lineCap = 'round';
    contexto.strokeStyle = cor;
    for (const [x1, y1, x2, y2, g] of riscos) {
      contexto.lineWidth = g * mult * escala;
      contexto.beginPath();
      contexto.moveTo(x1, y1); contexto.lineTo(x2, y2);
      contexto.stroke();
    }
    contexto.globalCompositeOperation = 'source-over';
  };

  // sem relevo próprio: vista de órbita a fenda é um risco aceso no chão.
  // Com vala e borda, a luz lateral transformava cada uma num cano deitado
  // a borda chamuscada escurece (não clareia): somar luz em dezenas de
  // fendas cruzadas desbotava o ermo inteiro para um bege
  tracar(ctx, 'rgba(18,10,8,0.35)', 3.2, 'source-over');
  for (const c of [
    { mult: 1.5, cor: `rgba(230,80,8,${0.35 * brilhoLava})` },
    { mult: 0.55, cor: `rgba(255,205,125,${0.6 * brilhoLava})` },
  ]) tracar(ctx, c.cor, c.mult, 'lighter');
  for (const c of [
    { mult: 3.4, cor: `rgba(150,40,0,${0.15 * brilhoLava})` },
    { mult: 1.4, cor: `rgba(255,110,10,${0.3 * brilhoLava})` },
    { mult: 0.45, cor: `rgba(255,220,150,${0.6 * brilhoLava})` },
  ]) tracar(emi, c.cor, c.mult, 'lighter');
  tracar(mctx, 'rgba(0,0,255,0.9)', 1.6, 'lighter');

  /* ============================================================
     7) KRAKENS — tentáculos rompendo a superfície do mar
     ============================================================ */
  for (const kr of krakens) {
    const S = 34 * escala;
    const sinFi = Math.max(0.3, Math.sin((kr.y / A) * Math.PI));
    const pinta = (contexto: CanvasRenderingContext2D, desenho: () => void) => {
      contexto.save();
      contexto.translate(kr.x, kr.y);
      contexto.scale(1 / sinFi, 1);
      desenho();
      contexto.restore();
    };

    // o corpo, só uma sombra debaixo d'água, e a água revolta em volta
    pinta(ctx, () => {
      const sombra = ctx.createRadialGradient(0, 0, 0, 0, 0, S * 1.1);
      sombra.addColorStop(0, 'rgba(3,8,18,0.6)');
      sombra.addColorStop(1, 'rgba(3,8,18,0)');
      ctx.fillStyle = sombra;
      ctx.beginPath(); ctx.arc(0, 0, S * 1.1, 0, Math.PI * 2); ctx.fill();
      const revolta = ctx.createRadialGradient(0, 0, S * 0.9, 0, 0, S * 1.7);
      revolta.addColorStop(0, 'rgba(120,170,180,0)');
      revolta.addColorStop(0.5, 'rgba(110,150,160,0.12)');
      revolta.addColorStop(1, 'rgba(120,170,180,0)');
      ctx.fillStyle = revolta;
      ctx.beginPath(); ctx.arc(0, 0, S * 1.7, 0, Math.PI * 2); ctx.fill();
    });

    const bracos = 6 + ((rnd() * 3) | 0);
    for (let t = 0; t < bracos; t++) {
      const a = (t / bracos) * Math.PI * 2 + (rnd() - 0.5) * 0.5;
      const enrola = rnd() < 0.5 ? 1 : -1;
      const x0 = Math.cos(a) * S * 0.35, y0 = Math.sin(a) * S * 0.35;
      const cxp = x0 + Math.cos(a) * S * 0.7, cyp = y0 + Math.sin(a) * S * 0.7;
      const comp = S * (0.9 + rnd() * 0.5);
      const x1 = x0 + Math.cos(a + enrola * 1.3) * comp;
      const y1 = y0 + Math.sin(a + enrola * 1.3) * comp;
      const w0 = 4.2 * escala;

      // contorno afinando da raiz à ponta: tentáculo, não cano
      const esq: [number, number][] = [], dir: [number, number][] = [];
      const PASSOS = 16;
      for (let p = 0; p <= PASSOS; p++) {
        const s = p / PASSOS;
        const bx = (1 - s) * (1 - s) * x0 + 2 * (1 - s) * s * cxp + s * s * x1;
        const by = (1 - s) * (1 - s) * y0 + 2 * (1 - s) * s * cyp + s * s * y1;
        const tx = 2 * (1 - s) * (cxp - x0) + 2 * s * (x1 - cxp);
        const ty = 2 * (1 - s) * (cyp - y0) + 2 * s * (y1 - cyp);
        const tn = Math.hypot(tx, ty) || 1;
        const w = w0 * (1 - s) + 0.35 * escala;
        esq.push([bx - (ty / tn) * w, by + (tx / tn) * w]);
        dir.unshift([bx + (ty / tn) * w, by - (tx / tn) * w]);
      }
      const forma = (contexto: CanvasRenderingContext2D) => {
        contexto.beginPath();
        contexto.moveTo(esq[0][0], esq[0][1]);
        for (const [X, Y] of esq.slice(1)) contexto.lineTo(X, Y);
        for (const [X, Y] of dir) contexto.lineTo(X, Y);
        contexto.closePath();
      };

      pinta(ctx, () => {
        forma(ctx);
        const pele = ctx.createLinearGradient(x0, y0, x1, y1);
        pele.addColorStop(0, 'rgba(40,22,30,0.97)');
        pele.addColorStop(1, 'rgba(78,44,54,0.97)');
        ctx.fillStyle = pele;
        ctx.fill();
        ctx.strokeStyle = 'rgba(170,112,118,0.4)';
        ctx.lineWidth = 0.7 * escala;
        ctx.stroke();
        // ventosas ao longo do braço
        ctx.fillStyle = 'rgba(170,130,130,0.3)';
        for (let p = 3; p < esq.length - 3; p += 3) {
          const [ax, ay] = esq[p];
          const [bx, by] = dir[dir.length - 1 - p];
          ctx.beginPath();
          ctx.arc(ax * 0.7 + bx * 0.3, ay * 0.7 + by * 0.3, 0.7 * escala, 0, Math.PI * 2);
          ctx.fill();
        }
        // espuma onde o braço fura a água
        ctx.fillStyle = 'rgba(236,243,247,0.75)';
        ctx.beginPath(); ctx.arc(x0, y0, 1.5 * escala, 0, Math.PI * 2); ctx.fill();
      });
      pinta(rel, () => { forma(rel); rel.fillStyle = 'rgba(255,255,255,0.55)'; rel.fill(); });
      pinta(mctx, () => { forma(mctx); mctx.fillStyle = '#000'; mctx.fill(); });
    }
  }

  /* ============================================================
     8) CIVILIZAÇÃO DE FUNDO
     ------------------------------------------------------------
     Povoados, torres e a rede de energia. É CENÁRIO: não tem nome,
     não está no banco, ninguém clica. Agora só nasce em terra firme,
     fora do gelo e longe da ferida.
     ============================================================ */
  const nucleos: number[][] = [];
  for (let t = 0; t < 600 && nucleos.length < 15; t++) {
    const cx = rnd() * L, cy = A * (0.2 + rnd() * 0.6);
    const k = (cy | 0) * L + (cx | 0);
    if (H[k] < 0.004 || pm[k * 4] > 128 || pm[k * 4 + 1] > 40) continue;
    if (Math.hypot(cx - fx, cy - fy) < A * 0.24) continue;
    nucleos.push([cx, cy]);

    const raio = (14 + rnd() * 30) * escala;
    const dens = 20 + rnd() * 55;

    for (const [contexto, alfa] of [[ctx, 0.15], [emi, 1.0]] as [CanvasRenderingContext2D, number][]) {
      contexto.globalCompositeOperation = 'lighter';
      const brilho = contexto.createRadialGradient(cx, cy, 0, cx, cy, raio * 1.7);
      brilho.addColorStop(0, `rgba(255,200,120,${0.4 * alfa})`);
      brilho.addColorStop(1, 'rgba(120,60,10,0)');
      contexto.fillStyle = brilho;
      contexto.beginPath(); contexto.arc(cx, cy, raio * 1.7, 0, Math.PI * 2); contexto.fill();
      contexto.globalCompositeOperation = 'source-over';
    }

    const lado = Math.max(1, 1.5 * escala);
    for (let j = 0; j < dens; j++) {
      const a = rnd() * Math.PI * 2, d = raio * Math.sqrt(rnd());
      const X = cx + Math.cos(a) * d, Y = cy + Math.sin(a) * d;
      const tom = `${(200 + rnd() * 55) | 0},${(140 + rnd() * 80) | 0}`;
      const al = 0.4 + rnd() * 0.6;
      ctx.fillStyle = `rgba(255,${tom},${al * 0.35})`;
      ctx.fillRect(X, Y, lado, lado);
      emi.fillStyle = `rgba(255,${tom},${Math.min(1, al * 1.4)})`;
      emi.fillRect(X, Y, lado, lado);
    }

    const quantas = 2 + ((rnd() * 5) | 0);
    for (let q = 0; q < quantas; q++) {
      const a = rnd() * Math.PI * 2;
      const d = (24 + rnd() * 70) * escala;
      const tx = cx + Math.cos(a) * d, ty = cy + Math.sin(a) * d * 0.8;
      const forca = (4 + rnd() * 5) * escala;
      for (const [contexto, alfa] of [[ctx, 0.22], [emi, 1.0]] as [CanvasRenderingContext2D, number][]) {
        contexto.globalCompositeOperation = 'lighter';
        const halo = contexto.createRadialGradient(tx, ty, 0, tx, ty, forca);
        halo.addColorStop(0, `rgba(210,245,255,${0.75 * alfa})`);
        halo.addColorStop(0.3, `rgba(80,180,255,${0.24 * alfa})`);
        halo.addColorStop(1, 'rgba(20,80,180,0)');
        contexto.fillStyle = halo;
        contexto.beginPath(); contexto.arc(tx, ty, forca, 0, Math.PI * 2); contexto.fill();
        contexto.strokeStyle = `rgba(90,190,255,${0.34 * alfa})`;
        contexto.lineWidth = Math.max(0.7, 1.3 * escala);
        contexto.beginPath(); contexto.moveTo(cx, cy); contexto.lineTo(tx, ty); contexto.stroke();
        contexto.globalCompositeOperation = 'source-over';
      }
    }
  }

  for (const [contexto, alfa] of [[ctx, 0.22], [emi, 1.0]] as [CanvasRenderingContext2D, number][]) {
    contexto.globalCompositeOperation = 'lighter';
    contexto.strokeStyle = `rgba(70,165,250,${0.26 * alfa})`;
    contexto.lineWidth = Math.max(0.9, 1.7 * escala);
    for (let i = 0; i < nucleos.length; i++)
      for (let j = i + 1; j < nucleos.length; j++) {
        const [ax, ay] = nucleos[i], [bx, by] = nucleos[j];
        if (Math.hypot(ax - bx, ay - by) > L * 0.17) continue;
        contexto.beginPath(); contexto.moveTo(ax, ay); contexto.lineTo(bx, by); contexto.stroke();
      }
    contexto.globalCompositeOperation = 'source-over';
  }

  /* ============================================================
     9) RELEVO DESENHADO -> ALTURA -> NORMAIS
     ============================================================ */
  const dadosRel = rel.getImageData(0, 0, L, A).data;
  for (let k = 0, i = 0; k < N; k++, i += 4) {
    const extra = (dadosRel[i] - 128) / 255;
    if (extra !== 0) H[k] += extra * 0.5;
  }

  return {
    cor: cvCor,
    normal: mapaNormal(H, L, A, relevo * escala),
    emissivo: cvEmi,
    mascara: cvMsk,
    nuvens: cvNuv,
    altura: H,
    L, A,
    redemoinhos: redemoinhos.map((p) => latLon(p.x, p.y)),
    monstros: leviatas.map((p) => latLon(p.x, p.y)),
  };
}
