/**
 * O globinho do rodapé da apresentação: o próprio planeta, visto de um
 * pouco acima do território, com um ponto aceso onde ele fica.
 *
 * É desenhado pixel a pixel a partir do mapa de cor que o globo 3D já
 * gerou (projeção ortográfica — o jeito que uma esfera aparece vista de
 * longe). Nada novo é baixado: é o mesmo mundo, em miniatura.
 */
export function desenharMiniGlobo(
  cor: ImageData, lat: number, lon: number, tam = 240,
): string {
  const L = cor.width, A = cor.height, px = cor.data;
  const cv = document.createElement('canvas');
  cv.width = tam; cv.height = tam;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(tam, tam);
  const o = img.data;

  // o centro da vista fica entre o território e o equador: assim o ponto
  // aparece deslocado para o lado dele, com o resto do mundo em volta
  const rad = Math.PI / 180;
  const la0 = lat * 0.55 * rad, lo0 = lon * rad;
  const sLa0 = Math.sin(la0), cLa0 = Math.cos(la0);
  const r = tam / 2 - 2;
  const c = tam / 2;

  for (let j = 0; j < tam; j++) {
    for (let i = 0; i < tam; i++) {
      const x = (i + 0.5 - c) / r, y = (c - j - 0.5) / r;
      const d2 = x * x + y * y;
      if (d2 > 1) continue;
      const z = Math.sqrt(1 - d2);
      // de volta para latitude/longitude (ortográfica inversa)
      const la = Math.asin(Math.max(-1, Math.min(1, z * sLa0 + y * cLa0)));
      const lo = lo0 + Math.atan2(x, z * cLa0 - y * sLa0);
      let u = (lo / rad + 180) / 360; u -= Math.floor(u);
      const v = (90 - la / rad) / 180;
      const sx = Math.min(L - 1, (u * L) | 0), sy = Math.min(A - 1, Math.max(0, (v * A) | 0));
      const k = (sy * L + sx) * 4;
      // luz de cima e da esquerda, e a borda escurecendo como numa foto
      const luz = 0.35 + 0.75 * Math.max(0, z * 0.7 - x * 0.45 + y * 0.35);
      const q = (j * tam + i) * 4;
      o[q] = Math.min(255, px[k] * luz);
      o[q + 1] = Math.min(255, px[k + 1] * luz);
      o[q + 2] = Math.min(255, px[k + 2] * luz);
      // meio pixel de transição na borda, para o círculo não serrilhar
      o[q + 3] = Math.min(255, (1 - Math.sqrt(d2)) * r * 255);
    }
  }
  ctx.putImageData(img, 0, 0);

  // a atmosfera em volta
  const halo = ctx.createRadialGradient(c, c, r * 0.86, c, c, r);
  halo.addColorStop(0, 'rgba(120,160,255,0)');
  halo.addColorStop(1, 'rgba(140,180,255,0.45)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.fill();

  // o ponto do território (ortográfica direta)
  const la = lat * rad, dl = lon * rad - lo0;
  const pz = sLa0 * Math.sin(la) + cLa0 * Math.cos(la) * Math.cos(dl);
  if (pz > 0) {
    const pxp = c + r * Math.cos(la) * Math.sin(dl);
    const pyp = c - r * (cLa0 * Math.sin(la) - sLa0 * Math.cos(la) * Math.cos(dl));
    const brilho = ctx.createRadialGradient(pxp, pyp, 0, pxp, pyp, tam * 0.07);
    brilho.addColorStop(0, 'rgba(255,255,255,0.95)');
    brilho.addColorStop(0.3, 'rgba(160,210,255,0.6)');
    brilho.addColorStop(1, 'rgba(160,210,255,0)');
    ctx.fillStyle = brilho;
    ctx.beginPath(); ctx.arc(pxp, pyp, tam * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(pxp, pyp, Math.max(2, tam * 0.012), 0, Math.PI * 2); ctx.fill();
  }
  return cv.toDataURL('image/png');
}
