/**
 * TEXTURA DO MUNDO DRUKALE
 *
 * Gera TRÊS mapas, não um:
 *
 *   cor       — o que a superfície é (rocha, gelo, magma)
 *   relevo    — o quanto cada ponto sobe ou afunda
 *   emissão   — o que brilha por conta própria (lava, cidades)
 *
 * O mapa de relevo é o que tira o planeta da cara de esboço. Dele saem
 * as normais da superfície, e é por isso que cada cratera ganha borda
 * acesa e fundo na sombra, cada fenda afunda de verdade, e tudo isso
 * MUDA conforme o mundo gira. Sem ele a esfera é lisa e o relevo fica
 * sendo só um desenho colado, que não reage à luz.
 *
 * O mapa de emissão existe porque cidade tem de brilhar à noite. Se a
 * luz da cidade estiver só na cor, ela some justamente no lado escuro,
 * que é onde deveria aparecer.
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

  function valor(x: number, y: number) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = suave(x - xi), yf = suave(y - yi);
    const a = pegar(xi, yi), b = pegar(xi + 1, yi);
    const c = pegar(xi, yi + 1), d = pegar(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  }

  /**
   * A mesma coisa, mas repetindo-se a cada P passos.
   *
   * Isto existe por causa da emenda. O mapa do planeta é uma tira que
   * dá a volta no mundo: o lado direito encosta no esquerdo. Se o
   * ruído não se repetir num número exato de vezes ao longo da tira,
   * a emenda aparece como uma cicatriz vertical no globo.
   */
  function valorP(x: number, y: number, P: number) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = suave(x - xi), yf = suave(y - yi);
    // o resto tem que ser sempre positivo, e esta conta roda milhões de
    // vezes: escrita à mão aqui, sem função auxiliar no meio
    let x0 = xi % P; if (x0 < 0) x0 += P;
    let y0 = yi % P; if (y0 < 0) y0 += P;
    const x1 = x0 + 1 === P ? 0 : x0 + 1;
    const y1 = y0 + 1 === P ? 0 : y0 + 1;
    const a = pegar(x0, y0), b = pegar(x1, y0);
    const c = pegar(x0, y1), d = pegar(x1, y1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  }

  const base = (x: number, y: number, camadas = 5) => {
    let soma = 0, amp = 1, freq = 1, total = 0;
    for (let i = 0; i < camadas; i++) {
      soma += valor(x * freq, y * freq) * amp;
      total += amp;
      amp *= 0.5;
      freq *= 2.07;
    }
    return soma / total;
  };

  /**
   * Ruído "de cordilheira": dobra o ruído no meio e inverte. Onde o
   * ruído comum faz colinas redondas, este faz cristas afiadas — é o
   * que dá cara de serra e não de duna.
   */
  const crista = (x: number, y: number, camadas = 5) => {
    let soma = 0, amp = 1, freq = 1, total = 0;
    for (let i = 0; i < camadas; i++) {
      const v = 1 - Math.abs(valor(x * freq, y * freq) * 2 - 1);
      soma += v * v * amp;
      total += amp;
      amp *= 0.5;
      freq *= 2.13;
    }
    return soma / total;
  };

  /**
   * Ruído desenhado direto sobre o mapa do planeta.
   *
   * `u` vai de 0 a 1 dando a volta no mundo e `v` de 0 (polo norte) a
   * 1 (polo sul). Cada oitava se repete um número inteiro de vezes ao
   * longo da volta, então a emenda fecha.
   *
   * A versão anterior amostrava num cilindro, e tinha dois defeitos que
   * saltavam aos olhos no globo: o norte saía espelhado no sul, e o
   * terreno virava um borrão de listras verticais, cara de foto tremida.
   * Os dois vinham da mesma origem — o ponto amostrado só andava para
   * dentro e para fora conforme a latitude, em vez de andar pelo mundo.
   */
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

  /** Ruído de mapa, colinas redondas. */
  const mapa = (u: number, v: number, P0: number, camadas = 5, dx = 0, dy = 0) =>
    emMapa(valorP, u, v, P0, camadas, dx, dy);

  /** Ruído de mapa, cristas afiadas — serra, não duna. */
  const mapaCrista = (u: number, v: number, P0: number, camadas = 5, dx = 0, dy = 0) =>
    emMapa(cristaP, u, v, P0, camadas, dx, dy);

  return { base, crista, mapa, mapaCrista };
}

/** Canvas auxiliar, já limpo. */
function tela(L: number, A: number, fundo?: string) {
  const c = document.createElement('canvas');
  c.width = L; c.height = A;
  const x = c.getContext('2d')!;
  if (fundo) { x.fillStyle = fundo; x.fillRect(0, 0, L, A); }
  return c;
}

/**
 * Converte o mapa de relevo em mapa de normais.
 *
 * A normal sai da inclinação do terreno: mede-se o quanto a altura muda
 * para os lados e para cima/baixo, e a normal aponta para o lado oposto
 * da subida. Perto dos polos as colunas do mapa ficam espremidas, então
 * a variação horizontal é corrigida pelo seno da latitude — sem isso o
 * relevo aparece esticado feito chiclete nas calotas.
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
    const escX = forca / Math.max(0.25, Math.sin((y / A) * Math.PI));

    for (let x = 0; x < L; x++) {
      const esq = (x - 1 + L) % L;
      const dir = (x + 1) % L;

      const dx = (altura[linha + dir] - altura[linha + esq]) * escX;
      const dy = (altura[abaixo + x] - altura[acima + x]) * forca;

      const nx = -dx, ny = -dy, nz = 1;
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const i = (linha + x) * 4;
      p[i] = (nx * inv * 0.5 + 0.5) * 255;
      p[i + 1] = (ny * inv * 0.5 + 0.5) * 255;
      p[i + 2] = (nz * inv * 0.5 + 0.5) * 255;
      p[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

/**
 * @returns { cor, normal, emissivo } — três canvas prontos para virar textura
 */
export type Mapas = { cor: HTMLCanvasElement; normal: HTMLCanvasElement; emissivo: HTMLCanvasElement };
export type AjustesMundo = {
  sementeNum?: number; fendas?: number; brilhoLava?: number; gelo?: number; relevo?: number;
  mar?: number;
};

export function gerarMundo(L: number, A: number, cfg: AjustesMundo = {}): Mapas {
  const {
    sementeNum = 20260915,
    fendas = 34,
    brilhoLava = 1.0,
    gelo = 0.32,
    relevo = 2.6,        // exagero do relevo; 0 deixa a esfera lisa
    mar = 0.46,          // nível do mar: quanto maior, mais água
  } = cfg;
  const MAR = Math.min(0.85, Math.max(0, mar));

  const rnd = semente(sementeNum);
  const ruido = fazerRuido(rnd);
  const escala = L / 2048;

  const cvCor = tela(L, A);
  const ctx = cvCor.getContext('2d')!;
  const cvEmi = tela(L, A, '#000');
  const emi = cvEmi.getContext('2d')!;

  // relevo em escala de cinza; no fim vira o mapa de normais
  const cvAlt = tela(L, A, '#808080');
  const alt = cvAlt.getContext('2d')!;

  const img = ctx.createImageData(L, A);
  const px = img.data;
  const imgAlt = alt.createImageData(L, A);
  const pxAlt = imgAlt.data;

  // o véu de nuvens é pintado numa camada própria e só entra no fim,
  // por cima de tudo — e só no mapa de cor: nuvem não faz relevo
  const cvNuv = tela(L, A);
  const nuvCtx = cvNuv.getContext('2d')!;
  const imgNuv = nuvCtx.createImageData(L, A);
  const pxNuv = imgNuv.data;

  /* ============================================================
     1) ROCHA E TERRENO
     ------------------------------------------------------------
     O ruído é amostrado em coordenadas cilíndricas usando as DUAS
     componentes. Numa versão anterior eu usava só o cosseno, e como
     cos(u) vale o mesmo para u e -u, os dois lados do mundo saíam
     idênticos e espelhados — dava cara de nuvem, não de pedra.
     ============================================================ */
  for (let y = 0; y < A; y++) {
    const lat = (y / A) * Math.PI;
    const v = y / A;

    for (let x = 0; x < L; x++) {
      const u = x / L;

      // continentes: uma camada grossa e outra mais larga ainda, para
      // que as massas de terra tenham tamanhos diferentes entre si
      const n1 = ruido.mapa(u, v, 6, 5, 40, 7) * 0.55
               + ruido.mapa(u, v, 3, 4, 120, 205) * 0.45;
      const n2 = ruido.mapa(u, v, 20, 4, 90, 13);
      const n3 = ruido.mapa(u, v, 56, 2, 11, 44);
      // cordilheiras: cristas afiadas, não colinas redondas
      const serra = ruido.mapaCrista(u, v, 11, 5, 200, 77);
      // umidade: um mapa próprio, independente do relevo. É ele que
      // decide onde a vida pega e onde fica só areia — e é por isso
      // que mata e deserto não caem sempre na mesma altitude.
      const umid = ruido.mapa(u, v, 5, 4, 310, 88);

      // altura do terreno, de 0 (fundo do mar) a 1 (pico)
      const terra = n1 * 0.78 + n2 * 0.13 + n3 * 0.07
                  + Math.max(0, serra - 0.5) * 0.5;

      let r: number, g: number, b: number, h: number;

      if (terra < MAR) {
        /* ---------- mar ---------- */
        const raso = terra / MAR;                  // 0 no abismo, 1 na praia
        r = 7 + raso * 19;
        g = 24 + raso * 58;
        b = 41 + raso * 64;
        r += n3 * 5; g += n3 * 9; b += n3 * 11;
        // o fundo do mar é liso: onda não é montanha
        h = 84 + raso * 20;
      } else {
        /* ---------- terra ---------- */
        const acima = (terra - MAR) / (1 - MAR);   // 0 na praia, 1 no pico
        // a mata rareia conforme sobe: no alto falta ar e sobra pedra
        const vida = Math.max(0, Math.min(1, (umid - 0.4) * 4.2 - acima * 0.7));

        // planície seca, cor de ocre queimado
        r = 86; g = 68; b = 45;
        // onde chove, vira mata escura
        r += (30 - r) * vida; g += (66 - g) * vida; b += (38 - b) * vida;
        // subindo, tudo cede à rocha
        const rocha = Math.max(0, Math.min(1, (acima - 0.4) / 0.36));
        r += (80 - r) * rocha; g += (74 - g) * rocha; b += (81 - b) * rocha;
        // faixa de areia na beira d'água
        const praia = Math.max(0, 1 - acima / 0.045);
        r += praia * 42; g += praia * 31; b += praia * 9;
        // cume: rocha nua e clara nas cristas altas
        const cume = Math.max(0, serra - 0.6) * 2.4 * Math.min(1, acima * 1.7);
        r += cume * 86; g += cume * 88; b += cume * 96;
        // granulado fino, para nada ficar com cara de tinta chapada
        const gr3 = 0.87 + n3 * 0.26;
        r *= gr3; g *= gr3; b *= gr3;

        h = 106 + acima * 60 + serra * serra * 70 + n2 * 9;
      }

      /* ---------- calotas polares ---------- */
      // o gelo se acumula onde o sol bate de raspão: nos polos, não de
      // um lado só do mundo
      const doPolo = Math.abs(y / A - 0.5) * 2;                  // 0 equador, 1 polo
      const frio = Math.max(0, (doPolo - 0.58) / 0.42);
      const gi = Math.min(1, Math.pow(frio, 1.35) * gelo * 3.1 * (0.55 + n1 * 0.6));
      if (gi > 0) {
        r += (212 - r) * gi; g += (227 - g) * gi; b += (246 - b) * gi;
        h += gi * 12;
      }

      const i = (y * L + x) * 4;
      px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
      pxAlt[i] = pxAlt[i + 1] = pxAlt[i + 2] = h;
      pxAlt[i + 3] = 255;

      /* ---------- nuvens ---------- */
      // em faixas, como num planeta que gira: o vento organiza o céu
      const nuv = ruido.mapa(u, v, 6, 5, 610, 320);
      const faixa = 0.5 + 0.5 * Math.sin(lat * 7.5 + n1 * 2.2);
      // perto dos polos o mapa espreme tudo na horizontal, e a nuvem
      // vira uma tarja branca de ponta a ponta; então ela some lá
      const some = 1 - Math.max(0, (doPolo - 0.66) / 0.34);
      const veu = Math.max(0, nuv - 0.56) * 2.6 * faixa * some;
      pxNuv[i] = 228; pxNuv[i + 1] = 234; pxNuv[i + 2] = 245;
      pxNuv[i + 3] = Math.min(150, veu * 215);
    }
  }
  ctx.putImageData(img, 0, 0);
  alt.putImageData(imgAlt, 0, 0);

  /* ============================================================
     2) CRATERAS — na cor E no relevo
     ============================================================ */
  for (let k = 0; k < 110; k++) {
    const cx = rnd() * L;
    const cy = A * (0.1 + rnd() * 0.8);
    const raio = (6 + rnd() * 36) * escala;

    // cor: a borda clareia, o fundo escurece
    const rel = ctx.createLinearGradient(cx - raio, cy - raio, cx + raio, cy + raio);
    rel.addColorStop(0, 'rgba(190,188,205,0.13)');
    rel.addColorStop(0.5, 'rgba(0,0,0,0.04)');
    rel.addColorStop(1, 'rgba(0,0,0,0.26)');
    ctx.fillStyle = rel;
    ctx.beginPath(); ctx.arc(cx, cy, raio, 0, Math.PI * 2); ctx.fill();

    // relevo: anel soerguido em volta de uma depressão
    const aro = alt.createRadialGradient(cx, cy, raio * 0.62, cx, cy, raio);
    aro.addColorStop(0, 'rgba(255,255,255,0)');
    aro.addColorStop(0.55, 'rgba(255,255,255,0.55)');
    aro.addColorStop(1, 'rgba(255,255,255,0)');
    alt.fillStyle = aro;
    alt.beginPath(); alt.arc(cx, cy, raio, 0, Math.PI * 2); alt.fill();

    const cova = alt.createRadialGradient(cx, cy, 0, cx, cy, raio * 0.72);
    cova.addColorStop(0, 'rgba(0,0,0,0.6)');
    cova.addColorStop(1, 'rgba(0,0,0,0)');
    alt.fillStyle = cova;
    alt.beginPath(); alt.arc(cx, cy, raio * 0.72, 0, Math.PI * 2); alt.fill();
  }

  /* ============================================================
     3) FENDAS DE LAVA — cor, relevo e emissão
     ============================================================ */
  const riscos: number[][] = [];
  function rachar(x: number, y: number, ang: number, vida: number, grossura: number) {
    let cx = x, cy = y, a = ang;
    for (let passo = 0; passo < vida; passo++) {
      const comp = (7 + rnd() * 13) * escala;
      const nx = cx + Math.cos(a) * comp;
      const ny = cy + Math.sin(a) * comp;
      const g = grossura * (1 - passo / vida);
      if (g > 0.12) riscos.push([cx, cy, nx, ny, g]);
      cx = nx; cy = ny;
      // vira pouco, e de vez em quando dá uma guinada: fratura tem quina
      a += (rnd() - 0.5) * 0.3;
      if (rnd() < 0.08) a += (rnd() - 0.5) * 1.5;
      if (cy < A * 0.1) a = Math.abs(a);
      if (cy > A * 0.9) a = -Math.abs(a);
      if (rnd() < 0.055 && grossura > 2.2 && passo > 3) {
        rachar(cx, cy, a + (rnd() < 0.5 ? 1 : -1) * (0.6 + rnd() * 0.7),
               vida * 0.5, grossura * 0.55);
      }
    }
  }

  const fx = L * 0.63, fy = A * 0.44;
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + rnd() * 0.5;
    rachar(fx + Math.cos(a) * A * 0.1, fy + Math.sin(a) * A * 0.1,
           a, 55 + rnd() * 35, 1.9 + rnd() * 1.1);
  }
  for (let k = 0; k < fendas; k++) {
    const centro = (0.62 + (rnd() - 0.5) * 0.55) * L;
    const x0 = (centro + (rnd() - 0.5) * L * 0.5 + L) % L;
    const y0 = A * (0.1 + rnd() * 0.8);
    rachar(x0, y0, rnd() * Math.PI * 2, 14 + rnd() * 28, 0.5 + rnd() * 1.1);
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

  // relevo: a fenda é uma vala, com as bordas erguidas dos lados
  tracar(alt, 'rgba(255,255,255,0.22)', 5.5, 'lighter');
  tracar(alt, 'rgba(0,0,0,0.75)', 1.6, 'source-over');

  // cor: largo e fraco por fora, fino e incandescente no miolo
  for (const c of [
    { mult: 6.0, cor: `rgba(130,28,0,${0.075 * brilhoLava})` },
    { mult: 3.0, cor: `rgba(215,66,0,${0.115 * brilhoLava})` },
    { mult: 1.4, cor: `rgba(255,112,10,${0.22 * brilhoLava})` },
    { mult: 0.5, cor: `rgba(255,205,125,${0.5 * brilhoLava})` },
  ]) tracar(ctx, c.cor, c.mult, 'lighter');

  // emissão: a lava continua acesa no lado da noite
  for (const c of [
    { mult: 3.4, cor: `rgba(150,40,0,${0.15 * brilhoLava})` },
    { mult: 1.4, cor: `rgba(255,110,10,${0.3 * brilhoLava})` },
    { mult: 0.45, cor: `rgba(255,220,150,${0.6 * brilhoLava})` },
  ]) tracar(emi, c.cor, c.mult, 'lighter');

  /* ============================================================
     4) A FERIDA
     ============================================================ */
  // Antes ela tinha o dobro deste tamanho e o miolo estourava em
  // branco: de longe o planeta parecia ter um sol grudado na barriga.
  // Menor e sem estourar, vira o que devia ser — uma ferida no chão.
  const gr = A * 0.095;
  const LADOS = 13;
  const raios = Array.from({ length: LADOS }, () => gr * (0.82 + rnd() * 0.3));
  const contorno = (contexto: CanvasRenderingContext2D) => {
    contexto.beginPath();
    for (let k = 0; k <= LADOS * 6; k++) {
      const t = k / 6;
      const i0 = Math.floor(t) % LADOS;
      const f = t - Math.floor(t);
      const s = f * f * (3 - 2 * f);
      const rr = raios[i0] + (raios[(i0 + 1) % LADOS] - raios[i0]) * s;
      const a = (t / LADOS) * Math.PI * 2;
      const X = fx + Math.cos(a) * rr, Y = fy + Math.sin(a) * rr * 0.92;
      k === 0 ? contexto.moveTo(X, Y) : contexto.lineTo(X, Y);
    }
    contexto.closePath();
  };

  ctx.fillStyle = 'rgba(10,7,11,0.7)';
  contorno(ctx); ctx.fill();

  // relevo: borda erguida, cratera funda
  alt.fillStyle = 'rgba(255,255,255,0.4)';
  contorno(alt); alt.fill();
  const covao = alt.createRadialGradient(fx, fy, 0, fx, fy, gr * 0.9);
  covao.addColorStop(0, 'rgba(0,0,0,0.85)');
  covao.addColorStop(1, 'rgba(0,0,0,0)');
  alt.fillStyle = covao;
  alt.beginPath(); alt.arc(fx, fy, gr * 0.9, 0, Math.PI * 2); alt.fill();

  for (const [contexto, forca] of [[ctx, 1], [emi, 0.62]] as [CanvasRenderingContext2D, number][]) {
    contexto.globalCompositeOperation = 'lighter';
    const halo = contexto.createRadialGradient(fx, fy, gr * 0.04, fx, fy, gr * 0.92);
    halo.addColorStop(0, `rgba(255,214,150,${0.5 * brilhoLava * forca})`);
    halo.addColorStop(0.22, `rgba(255,126,26,${0.42 * brilhoLava * forca})`);
    halo.addColorStop(0.55, `rgba(150,34,0,${0.2 * brilhoLava * forca})`);
    halo.addColorStop(1, 'rgba(50,8,0,0)');
    contexto.fillStyle = halo;
    contexto.beginPath(); contexto.arc(fx, fy, gr * 0.92, 0, Math.PI * 2); contexto.fill();
    contexto.globalCompositeOperation = 'source-over';
  }

  // placas de crosta boiando no magma — na cor e no relevo
  for (let k = 0; k < 16; k++) {
    const a = rnd() * Math.PI * 2;
    const d = gr * (0.2 + rnd() * 0.55);
    const lr = gr * (0.05 + rnd() * 0.11);
    const X = fx + Math.cos(a) * d, Y = fy + Math.sin(a) * d * 0.85;
    const ry = lr * (0.45 + rnd() * 0.5), rot = rnd() * 3;
    ctx.fillStyle = `rgba(12,9,11,${0.45 + rnd() * 0.35})`;
    ctx.beginPath(); ctx.ellipse(X, Y, lr, ry, rot, 0, Math.PI * 2); ctx.fill();
    alt.fillStyle = 'rgba(255,255,255,0.35)';
    alt.beginPath(); alt.ellipse(X, Y, lr, ry, rot, 0, Math.PI * 2); alt.fill();
  }

  /* ============================================================
     5) CIVILIZAÇÃO DE FUNDO
     ------------------------------------------------------------
     Povoados, torres e a rede de energia. É CENÁRIO: não tem nome,
     não está no banco, ninguém clica. Os locais de verdade entram
     por cima como pontos vivos, e esses sim têm ficha.
     ============================================================ */
  const nucleos: number[][] = [];
  for (let k = 0; k < 15; k++) {
    let cx, cy, tent = 0;
    do {
      cx = rnd() * L; cy = A * (0.2 + rnd() * 0.6); tent++;
    } while (tent < 20 && Math.hypot(cx - fx, cy - fy) < A * 0.24);
    nucleos.push([cx, cy]);

    const raio = (14 + rnd() * 30) * escala;
    const dens = 20 + rnd() * 55;

    // as luzes vão nos DOIS mapas: na cor (para o dia) e na emissão
    // (para a noite). Só na cor, a cidade sumiria justamente no escuro.
    for (const [contexto, alfa] of [[ctx, 0.4], [emi, 1.0]] as [CanvasRenderingContext2D, number][]) {
      contexto.globalCompositeOperation = 'lighter';
      const brilho = contexto.createRadialGradient(cx, cy, 0, cx, cy, raio * 1.7);
      brilho.addColorStop(0, `rgba(255,200,120,${0.4 * alfa})`);
      brilho.addColorStop(1, 'rgba(120,60,10,0)');
      contexto.fillStyle = brilho;
      contexto.beginPath(); contexto.arc(cx, cy, raio * 1.7, 0, Math.PI * 2); contexto.fill();
      contexto.globalCompositeOperation = 'source-over';
    }

    // as janelas, uma a uma
    const pontos: [number, number, string, number][] = [];
    for (let j = 0; j < dens; j++) {
      const a = rnd() * Math.PI * 2, d = raio * Math.sqrt(rnd());
      pontos.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d,
                   `${200 + rnd() * 55 | 0},${140 + rnd() * 80 | 0}`, 0.4 + rnd() * 0.6]);
    }
    const lado = Math.max(1, 1.5 * escala);
    for (const [X, Y, tom, al] of pontos) {
      ctx.fillStyle = `rgba(255,${tom},${al})`;
      ctx.fillRect(X, Y, lado, lado);
      emi.fillStyle = `rgba(255,${tom},${Math.min(1, al * 1.4)})`;
      emi.fillRect(X, Y, lado, lado);
    }

    // torres em volta, ligadas ao núcleo
    const quantas = 2 + (rnd() * 5 | 0);
    for (let t = 0; t < quantas; t++) {
      const a = rnd() * Math.PI * 2;
      const d = (24 + rnd() * 70) * escala;
      const tx = cx + Math.cos(a) * d, ty = cy + Math.sin(a) * d * 0.8;
      const forca = (4 + rnd() * 5) * escala;

      for (const [contexto, alfa] of [[ctx, 0.75], [emi, 1.0]] as [CanvasRenderingContext2D, number][]) {
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

  // linhas de energia entre regiões vizinhas
  for (const [contexto, alfa] of [[ctx, 0.75], [emi, 1.0]] as [CanvasRenderingContext2D, number][]) {
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
     6) O CÉU POR CIMA DE TUDO
     ------------------------------------------------------------
     As nuvens entram por último, tapando um pouco a paisagem — é
     o que faz o mundo parecer um lugar com clima, e não uma bola
     de pedra pintada. Elas não entram no relevo nem na emissão:
     as luzes das cidades continuam atravessando o véu à noite.
     ============================================================ */
  nuvCtx.putImageData(imgNuv, 0, 0);
  ctx.drawImage(cvNuv, 0, 0);

  /* ============================================================
     7) RELEVO -> NORMAIS
     ============================================================ */
  const dadosAlt = alt.getImageData(0, 0, L, A).data;
  const altura = new Float32Array(L * A);
  for (let i = 0, j = 0; i < dadosAlt.length; i += 4, j++) altura[j] = dadosAlt[i] / 255;

  return {
    cor: cvCor,
    normal: mapaNormal(altura, L, A, relevo),
    emissivo: cvEmi,
  };
}
