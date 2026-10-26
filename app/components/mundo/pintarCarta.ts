import { BIOMA, prepararTerrenoCarta, sorteioCarta, type BiomaCarta, type DetalheCarta, type LocalCarta, type SegmentoCarta, type TerrenoCarta } from './cartografiaArtistica';

const CORES: [number, number, number][] = [[142, 171, 164], [211, 201, 158], [168, 182, 138], [225, 195, 143], [187, 179, 154], [226, 228, 210], [184, 155, 128]];
const TINTA = '#534a36', MAR = '#476e6b';
type Pincel = CanvasRenderingContext2D;
type CartaPronta = { canvas: HTMLCanvasElement; terreno: TerrenoCarta };
const cache = new WeakMap<HTMLCanvasElement, { mascara: HTMLCanvasElement; carta: CartaPronta }>();
const tela = (L: number, A: number) => { const cv = document.createElement('canvas'); cv.width = L; cv.height = A; return cv; };
const contornosSuaves = new WeakMap<SegmentoCarta[], number[][][]>();
function linha(c: Pincel, pontos: number[][]) {
  c.beginPath(); pontos.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
}
function forma(c: Pincel, pontos: number[][], cor: string, contorno = true) {
  c.beginPath(); pontos.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fillStyle = cor; c.fill(); if (contorno) c.stroke();
}
function elipse(c: Pincel, x: number, y: number, rx: number, ry: number, cor: string) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = cor; c.fill();
}
function curvas(c: Pincel, linhas: SegmentoCarta[], cor: string, espessura: number) {
  let caminhos = contornosSuaves.get(linhas);
  if (!caminhos) {
    const nos = new Map<string, { p: number[]; arestas: number[] }>();
    const chave = (x: number, y: number) => `${x},${y}`;
    for (let i = 0; i < linhas.length; i++) for (const p of [linhas[i].slice(0, 2), linhas[i].slice(2)]) {
      const k = chave(p[0], p[1]); const no = nos.get(k) ?? { p, arestas: [] }; no.arestas.push(i); nos.set(k, no);
    }
    const usados = new Set<number>(); caminhos = [];
    const caminhar = (p: number[]) => {
      const caminho = [p]; let atual = p;
      while (true) {
        const i = nos.get(chave(atual[0], atual[1]))?.arestas.find(a => !usados.has(a)); if (i === undefined) break;
        usados.add(i); const s = linhas[i]; atual = s[0] === atual[0] && s[1] === atual[1] ? s.slice(2) : s.slice(0, 2); caminho.push(atual);
      }
      return caminho;
    };
    for (let i = 0; i < linhas.length; i++) {
      if (usados.has(i)) continue;
      const frente = caminhar(linhas[i].slice(0, 2)), tras = caminhar(frente[0]); caminhos.push([...tras.slice(1).reverse(), ...frente]);
    }
    contornosSuaves.set(linhas, caminhos);
  }
  c.strokeStyle = cor; c.lineWidth = espessura; c.beginPath();
  for (const pontos of caminhos) {
    c.moveTo(pontos[0][0], pontos[0][1]);
    for (let i = 1; i < pontos.length - 1; i++) c.quadraticCurveTo(pontos[i][0], pontos[i][1], (pontos[i][0] + pontos[i + 1][0]) / 2, (pontos[i][1] + pontos[i + 1][1]) / 2);
    c.lineTo(pontos[pontos.length - 1][0], pontos[pontos.length - 1][1]);
  }
  c.stroke();
}

function pinheiro(c: Pincel, x: number, y: number, s: number, frio: boolean) {
  c.strokeStyle = frio ? '#637c70' : '#4d6543'; c.lineWidth = .17;
  elipse(c, x + s * .13, y + s * .07, s * .50, s * .14, '#73865c33');
  linha(c, [[x, y], [x, y - s * 1.1]]);
  forma(c, [[x - s * .40, y - s * .18], [x, y - s * 1.2], [x + s * .44, y - s * .18]], frio ? '#b7c9b2' : '#8caa70');
  linha(c, [[x - s * .27, y - s * .47], [x + s * .17, y - s * .36]]);
  linha(c, [[x - s * .16, y - s * .76], [x + s * .12, y - s * .64]]);
  c.strokeStyle = '#e4e6c4a0'; linha(c, [[x - s * .15, y - s * .28], [x, y - s * .97]]);
}
function arvore(c: Pincel, x: number, y: number, s: number, variacao: number) {
  if (variacao < .52) { pinheiro(c, x, y, s, false); return; }
  c.strokeStyle = '#536746'; c.lineWidth = .17;
  elipse(c, x + s * .1, y, s * .55, s * .15, '#75865c38');
  linha(c, [[x, y], [x - s * .03, y - s * .8]]);
  c.beginPath(); c.moveTo(x - s * .5, y - s * .55);
  c.bezierCurveTo(x - s * .8, y - s * .85, x - s * .38, y - s * 1.1, x - s * .25, y - s * 1.05);
  c.bezierCurveTo(x - s * .15, y - s * 1.5, x + s * .5, y - s * 1.4, x + s * .5, y - s * 1.05);
  c.bezierCurveTo(x + s * .95, y - s * .9, x + s * .6, y - s * .35, x + s * .27, y - s * .42);
  c.closePath(); c.fillStyle = '#a1b47c'; c.fill(); c.stroke();
  c.strokeStyle = '#677f51'; linha(c, [[x - s * .25, y - s * .58], [x - s * .05, y - s * .85], [x + s * .14, y - s * .70]]);
  linha(c, [[x + s * .22, y - s * .91], [x + s * .32, y - s * 1.08]]);
}
function pico(c: Pincel, x: number, y: number, s: number, neve: boolean, vulcao = false) {
  c.strokeStyle = vulcao ? '#78543d' : '#76684e'; c.lineWidth = .22;
  elipse(c, x + s * .3, y + s * .12, s * 1.4, s * .27, '#8d75592b');
  const topo = y - s * 2.25;
  forma(c, [[x - s * 1.5, y], [x - s * .45, y - s * 1.25], [x, topo], [x + s * .62, y - s * 1.15], [x + s * 1.7, y]], neve ? '#d9ddc7' : vulcao ? '#baa084' : '#c7b796');
  forma(c, [[x, topo + s * .15], [x + s * .62, y - s * 1.15], [x + s * 1.7, y], [x + s * .22, y - s * .25], [x - s * .09, y - s * .95]], neve ? '#a9b8ad' : '#a7997d', false);
  linha(c, [[x, topo + s * .10], [x - s * .16, y - s * 1.24], [x + s * .05, y - s * 1.02], [x - s * .25, y - s * .4]]);
  for (let i = 0; i < 7; i++) {
    const yy = topo + s * (.55 + i * .22), xx = x + s * (.12 + i * .10);
    linha(c, [[xx, yy], [xx + s * (.3 + i * .06), yy + s * .30]]);
  }
  if (neve) forma(c, [[x - s * .47, topo + s * .77], [x, topo], [x + s * .46, topo + s * .82], [x + s * .10, topo + s * .63], [x - s * .03, topo + s * .83], [x - s * .2, topo + s * .59]], '#f1edd8');
  if (vulcao) {
    elipse(c, x, topo + s * .35, s * .30, s * .11, '#a56842');
    c.strokeStyle = '#a95c39'; c.lineWidth = .25; linha(c, [[x + s * .1, topo + s * .5], [x + s * .36, y - s * 1.1], [x + s * .22, y - s * .65], [x + s * .72, y]]);
    c.strokeStyle = '#80756070'; c.lineWidth = .35; c.beginPath(); c.moveTo(x, topo); c.bezierCurveTo(x - s, topo - s * .7, x + s, topo - s * 1.1, x + s * .35, topo - s * 1.6); c.stroke();
  }
}
function detalhe(c: Pincel, d: DetalheCarta) {
  const { x, y, tamanho: s, variacao: v, bioma } = d;
  c.save();
  if (bioma === BIOMA.floresta) {
    const rnd = sorteioCarta(Math.floor(x * 917 + y * 7103));
    for (let fila = 0; fila < 2; fila++) for (let i = 0; i < 3; i++) arvore(c, x + (i - 1) * s * .85 + rnd() * s * .3, y + fila * s * .6, s * (.6 + rnd() * .38), rnd());
  } else if (bioma === BIOMA.serra || bioma === BIOMA.vulcanico) {
    pico(c, x - s * 1.0, y - s * .3, s * .58, v > .72, false); pico(c, x + s * .65, y, s * .85, v > .42, bioma === BIOMA.vulcanico);
  } else if (bioma === BIOMA.deserto) {
    c.strokeStyle = '#a27f4c'; c.lineWidth = .20;
    for (let i = 0; i < 4; i++) {
      const dx = (i % 2) * s * 1.3 - s, dy = Math.floor(i / 2) * s * .85;
      c.beginPath(); c.moveTo(x + dx - s, y + dy); c.quadraticCurveTo(x + dx, y + dy - s * .95, x + dx + s * 1.5, y + dy - s * .2); c.stroke();
      c.strokeStyle = '#b5925c80'; linha(c, [[x + dx, y + dy - s * .45], [x + dx + s, y + dy - s * .1]]); c.strokeStyle = '#a27f4c';
    }
  } else if (bioma === BIOMA.neve) {
    if (v > .84) pico(c, x, y, s * .72, true);
    else {
      c.strokeStyle = '#869e975e'; c.lineWidth = .18;
      linha(c, [[x - s, y - s], [x - s * .4, y - s * .3], [x - s * .6, y + s * .4], [x + s * .2, y + s]]);
      linha(c, [[x - s * .4, y - s * .3], [x + s * .5, y - s * .6], [x + s, y - s * .4]]);
    }
  } else if (bioma === BIOMA.mar) {
    c.strokeStyle = '#547f798c'; c.lineWidth = .20;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x - s * 1.6 + i * s * .22, y + i * s * .50); c.bezierCurveTo(x - s * .5, y - s * .55 + i * s * .5, x + s * .5, y + s * .5 + i * s * .5, x + s * 1.5, y + i * s * .5); c.stroke(); }
  } else {
    c.strokeStyle = '#7e896057'; c.lineWidth = .18;
    for (let i = 0; i < 4; i++) { const xx = x - s + i * s * .6; linha(c, [[xx - s * .15, y], [xx, y - s * .4], [xx + s * .15, y]]); }
  }
  c.restore();
}

function rosaDosVentos(c: Pincel, terreno: TerrenoCarta) {
  const { largura: L, altura: A, distanciaCosta: dist } = terreno;
  const candidatos = [[.16, .66], [.14, .42], [.30, .65], [.12, .25], [.80, .66]];
  const ponto = candidatos.find(([x, y]) => dist[Math.floor(y * A) * L + Math.floor(x * L)] > 22);
  if (!ponto) return;
  const x = ponto[0] * L, y = ponto[1] * A, R = 16;
  c.save(); c.translate(x, y); c.strokeStyle = '#5c6957'; c.lineWidth = .20;
  for (const r of [R * .74, R, R * 1.09]) { c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); }
  for (let i = 0; i < 16; i++) {
    c.save(); c.rotate(i * Math.PI / 8); const r = i % 2 ? R * .60 : R * 1.35;
    forma(c, [[0, -r], [-R * .1, 0], [0, R * .12]], i % 2 ? '#acaa80' : '#576852');
    forma(c, [[0, -r], [R * .1, 0], [0, R * .12]], '#ddd1a6'); c.restore();
  }
  c.fillStyle = '#56654e'; c.font = 'italic 5px Georgia,serif'; c.textAlign = 'center';
  for (const [texto, xx, yy] of [['N', 0, -R * 1.55], ['S', 0, R * 1.75], ['O', -R * 1.65, 1.5], ['L', R * 1.65, 1.5]] as [string, number, number][]) c.fillText(texto, xx, yy);
  c.restore();
}

export function desenharCarta(mapa: HTMLCanvasElement, mascara: HTMLCanvasElement): CartaPronta | null {
  const anterior = cache.get(mapa); if (anterior?.mascara === mascara) return anterior.carta;
  if (mapa.width !== mascara.width || mapa.height !== mascara.height) return null;
  const cor = mapa.getContext('2d')?.getImageData(0, 0, mapa.width, mapa.height).data;
  const mask = mascara.getContext('2d')?.getImageData(0, 0, mascara.width, mascara.height).data;
  if (!cor || !mask) return null;
  const terreno = prepararTerrenoCarta(cor, mask, mapa.width, mapa.height); if (!terreno) return null;
  const { largura: L, altura: A, biomas, distanciaCosta, detalhes, costas, isobatas } = terreno;
  const canvas = tela(3200, Math.round(3200 * A / L)), c = canvas.getContext('2d'); if (!c) return null;
  const banho = tela(L, A), b = banho.getContext('2d')!, img = b.createImageData(L, A);
  const rnd = sorteioCarta(280426);
  for (let i = 0; i < biomas.length; i++) {
    const bioma = biomas[i], rgb = CORES[bioma], x = i % L, y = Math.floor(i / L);
    const fibra = (rnd() - .5) * 7 + Math.sin(x * .087 + Math.sin(y * .12) * 2) * 2;
    const agua = bioma === BIOMA.mar ? Math.max(0, 1 - distanciaCosta[i] / 28) : 0;
    for (let k = 0; k < 3; k++) img.data[i * 4 + k] = rgb[k] + fibra + agua * (k === 0 ? 30 : 25);
    img.data[i * 4 + 3] = 255;
  }
  b.putImageData(img, 0, 0); c.drawImage(banho, 0, 0, canvas.width, canvas.height); c.scale(canvas.width / L, canvas.height / A);
  c.lineCap = 'round'; c.lineJoin = 'round';
  // Retícula e linhas náuticas muito leves, próprias de uma carta desenhada.
  c.strokeStyle = '#736d4d27'; c.lineWidth = .18; c.setLineDash([1, 1.7]);
  for (let x = L / 12; x < L; x += L / 12) linha(c, [[x, 0], [x, A]]);
  for (let y = A / 6; y < A; y += A / 6) linha(c, [[0, y], [L, y]]);
  c.setLineDash([]);
  for (let i = 0; i < 3; i++) curvas(c, isobatas[i], ['#5e817259', '#6e8a7442', '#7d957832'][i], .22);
  curvas(c, costas, '#8c79573d', 1.8); curvas(c, costas, '#526951d9', .39);
  // O detalhe natural é uma ilustração própria: árvores, hachuras, dunas e picos.
  for (const d of detalhes) detalhe(c, d);
  rosaDosVentos(c, terreno);
  // Papel, fibras e pequenas falhas de tinta sobre toda a pintura.
  c.fillStyle = '#5e4a2b0e';
  for (let i = 0; i < 23000; i++) { const x = rnd() * L, y = rnd() * A; c.fillRect(x, y, .12 + rnd() * .30, .08 + rnd() * .15); }
  c.strokeStyle = '#715d3d99'; c.lineWidth = .25; c.strokeRect(3, 3, L - 6, A - 6); c.strokeRect(4.3, 4.3, L - 8.6, A - 8.6);
  for (const [x, y, a] of [[6, 6, 0], [L - 6, 6, Math.PI / 2], [L - 6, A - 6, Math.PI], [6, A - 6, -Math.PI / 2]]) {
    c.save(); c.translate(x, y); c.rotate(a); c.lineWidth = .3;
    linha(c, [[0, 12], [0, 0], [12, 0]]); c.beginPath(); c.moveTo(0, 8); c.bezierCurveTo(6, 8, 3, 3, 8, 0); c.stroke(); c.restore();
  }
  // Cartucho discreto; não inventa topônimos nem assentamentos.
  c.save(); c.translate(L / 2, A - 15); c.textAlign = 'center'; c.fillStyle = '#e3d5afed';
  c.beginPath(); c.moveTo(-54, -6); c.quadraticCurveTo(0, -12, 54, -6); c.lineTo(51, 8); c.quadraticCurveTo(0, 12, -51, 8); c.closePath(); c.fill(); c.strokeStyle = '#8a7856'; c.lineWidth = .3; c.stroke();
  c.fillStyle = '#5b523c'; c.font = 'small-caps 6px Georgia,serif'; c.fillText('T E R R A   S A V E', 0, 1);
  c.font = 'italic 2.8px Georgia,serif'; c.fillText('Carta dos territórios', 0, 5.5); c.restore();
  const carta = { canvas, terreno }; cache.set(mapa, { mascara, carta }); return carta;
}

function casa(c: Pincel, x: number, y: number, w: number, d: number, h: number, telhado: number, ruina = false) {
  c.lineWidth = .13; c.strokeStyle = '#6b553a';
  forma(c, [[x - w, y - h], [x, y - h + d], [x, y + d], [x - w, y]], '#d9c7a0');
  forma(c, [[x, y - h + d], [x + w, y - h], [x + w, y], [x, y + d]], '#bca680');
  if (ruina) {
    linha(c, [[x - w, y - h], [x - w * .45, y - h * .65], [x - w * .1, y - h * .85], [x, y - h + d]]);
  } else {
    forma(c, [[x - w * 1.1, y - h], [x - w * .22, y - h - d * 1.4], [x + w * 1.12, y - h - d * .05], [x, y - h + d * 1.1]], telhado > .45 ? '#9e7658' : '#738174');
    linha(c, [[x - w * .22, y - h - d * 1.4], [x, y - h + d * 1.1]]);
    c.strokeStyle = '#765c40'; c.lineWidth = .12; linha(c, [[x + w * .36, y - h * .58], [x + w * .36, y - h * .36]]);
  }
}
function torre(c: Pincel, x: number, y: number, s: number, capital: boolean) {
  casa(c, x, y, s * .42, s * .20, s * 1.1, .2);
  c.strokeStyle = '#5b5844'; c.lineWidth = .15;
  forma(c, [[x - s * .49, y - s * 1.1], [x, y - s * 2.15], [x + s * .49, y - s * 1.1], [x, y - s * .92]], capital ? '#798b80' : '#9a8464');
  linha(c, [[x, y - s * 2.15], [x, y - s * 2.8]]);
  forma(c, [[x, y - s * 2.8], [x + s * .70, y - s * 2.62], [x, y - s * 2.42]], '#ab684e');
}
function fortaleza(c: Pincel, s: number, capital: boolean) {
  c.strokeStyle = '#6b5d43'; c.lineWidth = .16;
  forma(c, [[-s, -s * .32], [0, -s * .75], [s, -s * .32], [0, s * .25]], '#d2c5a2');
  for (const [x, y] of [[-s, -s * .32], [0, -s * .75], [s, -s * .32]]) torre(c, x, y, s * .45, capital);
  casa(c, 0, 0, s * .70, s * .30, s * .7, .2);
  torre(c, 0, -s * .10, s * .68, capital);
  c.strokeStyle = '#655840'; c.lineWidth = .28; c.beginPath(); c.moveTo(-s * .15, s * .2); c.lineTo(-s * .15, -s * .25); c.quadraticCurveTo(0, -s * .53, s * .15, -s * .25); c.lineTo(s * .15, s * .2); c.stroke();
}
function serpente(c: Pincel, tamanho: number) {
  c.strokeStyle = '#526f61'; c.lineCap = 'round'; c.lineWidth = tamanho * .60;
  c.beginPath(); c.moveTo(-tamanho * 1.9, tamanho * .2); c.bezierCurveTo(-tamanho, tamanho, -tamanho * .6, -tamanho, tamanho * .15, -tamanho * .1); c.bezierCurveTo(tamanho, tamanho * .9, tamanho * 1.35, tamanho * .3, tamanho * .94, -tamanho * .8); c.stroke();
  c.strokeStyle = '#c2c7a1'; c.lineWidth = tamanho * .38; c.stroke();
  c.strokeStyle = '#5c705c'; c.lineWidth = .15;
  for (let i = 0; i < 14; i++) { const x = -tamanho * 1.7 + i * tamanho * .20, y = Math.sin(i * .51) * tamanho * .35; linha(c, [[x - tamanho * .12, y], [x, y - tamanho * .3], [x + tamanho * .10, y]]); }
  elipse(c, tamanho, -tamanho * .9, tamanho * .56, tamanho * .38, '#a8b894'); c.beginPath(); c.ellipse(tamanho, -tamanho * .9, tamanho * .56, tamanho * .38, 0, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#3b4c3f'; c.beginPath(); c.arc(tamanho * 1.18, -tamanho * 1.03, tamanho * .08, 0, Math.PI * 2); c.fill();
  forma(c, [[tamanho * .65, -tamanho * 1.1], [tamanho * .55, -tamanho * 1.6], [tamanho * .89, -tamanho * 1.2]], '#d5cfaa');
  c.strokeStyle = '#476c6866'; c.lineWidth = .18;
  for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(0, tamanho * .5, tamanho * (2.2 + i * .2), tamanho * (.8 + i * .17), 0, .15, Math.PI - .15); c.stroke(); }
}

/** Camada transparente limpa a cada alteração: remover uma cidade revela de novo a paisagem. */
export function desenharLocaisCarta(canvas: HTMLCanvasElement, terreno: TerrenoCarta, locais: LocalCarta[], selecionado: string | null) {
  const c = canvas.getContext('2d'); if (!c) return;
  c.clearRect(0, 0, canvas.width, canvas.height); c.save();
  c.scale(canvas.width / terreno.largura, canvas.height / terreno.altura); c.lineJoin = 'round'; c.lineCap = 'round';
  const L = terreno.largura, A = terreno.altura;
  for (const local of locais) {
    const cor = local.pendente ? '#83605d' : local.id === selecionado ? '#995333' : '#79673f';
    c.save(); c.strokeStyle = cor; c.lineWidth = local.id === selecionado ? .65 : .32; c.setLineDash(local.pendente ? [.7, .9] : [1.9, .8, .3, .8]);
    for (const regiao of local.regiao) { c.beginPath(); regiao.forEach((p, i) => i ? c.lineTo(p.x * L, p.y * A) : c.moveTo(p.x * L, p.y * A)); c.stroke(); }
    c.restore();
  }
  // Y order keeps the front buildings legible where nearby illustrations touch.
  for (const local of [...locais].sort((a, b) => a.y - b.y || a.id.localeCompare(b.id))) {
    const p = { x: local.x * L, y: local.y * A }, s = local.tamanho;
    const x = Math.max(s * 2, Math.min(L - s * 2, p.x)), y = Math.max(s * 2.3, Math.min(A - s * 1.5, p.y));
    c.save();
    if (x !== p.x || y !== p.y) { c.strokeStyle = '#695c40'; c.lineWidth = .3; linha(c, [[p.x, p.y], [x, y]]); }
    c.translate(x, y);
    if (local.tipo === 'serpente') serpente(c, s * .55);
    else if (local.tipo === 'orbital') {
      c.strokeStyle = '#77643d'; c.lineWidth = .22;
      for (const r of [s * 1.1, s * 1.5]) { c.beginPath(); c.ellipse(0, 0, r, r * .40, -.3, 0, Math.PI * 2); c.stroke(); }
      fortaleza(c, s * .40, true);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; linha(c, [[Math.cos(a) * s * 1.4, Math.sin(a) * s * .7], [Math.cos(a) * s * 1.7, Math.sin(a) * s * .88]]); }
    } else {
      const ix = Math.min(L - 1, Math.max(0, Math.floor(p.x))), iy = Math.min(A - 1, Math.max(0, Math.floor(p.y)));
      const bioma = terreno.biomas[iy * L + ix] as BiomaCarta, rgb = CORES[bioma];
      const halo = c.createRadialGradient(0, 0, s * .6, 0, 0, s * 1.55);
      halo.addColorStop(0, `rgba(${rgb.join(',')},1)`); halo.addColorStop(.6, `rgba(${rgb.join(',')},.92)`); halo.addColorStop(1, `rgba(${rgb.join(',')},0)`);
      c.fillStyle = halo; c.fillRect(-s * 1.6, -s * 1.6, s * 3.2, s * 3.2);
      if (local.id === selecionado) { c.strokeStyle = '#984c3199'; c.lineWidth = .55; c.beginPath(); c.ellipse(0, 0, s * 1.3, s * .9, 0, 0, Math.PI * 2); c.stroke(); }
      c.strokeStyle = '#a18a5a'; c.lineWidth = .8;
      linha(c, [[-s * 1.1, s * .2], [0, 0], [s * .9, -s * .6]]); linha(c, [[-s * .25, -s * .9], [0, 0], [s * .3, s * .9]]);
      c.strokeStyle = '#dfcea5'; c.lineWidth = .4;
      linha(c, [[-s * 1.1, s * .2], [0, 0], [s * .9, -s * .6]]); linha(c, [[-s * .25, -s * .9], [0, 0], [s * .3, s * .9]]);
      if (local.tipo === 'capital' || local.tipo === 'base' || local.tipo === 'quartel') {
        c.strokeStyle = '#6d654b'; c.lineWidth = .42; c.setLineDash([.65, .25]); c.beginPath(); c.ellipse(0, 0, s * 1.1, s * .76, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      }
      for (const h of local.casas.filter(h => h.y < 0)) casa(c, h.x, h.y, h.largura, h.fundo, h.altura, h.telhado, local.tipo === 'ruina');
      if (local.tipo === 'ruina') { casa(c, 0, 0, s * .18, s * .1, s * .45, 0, true); casa(c, s * .35, -s * .12, s * .13, s * .09, s * .32, 0, true); }
      else fortaleza(c, s * (local.tipo === 'capital' ? .40 : .29), local.tipo === 'capital');
      for (const h of local.casas.filter(h => h.y >= 0)) casa(c, h.x, h.y, h.largura, h.fundo, h.altura, h.telhado, local.tipo === 'ruina');
      if (local.tipo === 'cidade' || local.tipo === 'capital') {
        c.strokeStyle = '#8a915a'; c.lineWidth = .18;
        for (let i = 0; i < 7; i++) linha(c, [[s * .9 + i * .15, s * .35], [s * .70 + i * .15, s * .70]]);
      }
    }
    c.restore();
  }
  c.restore();
}
