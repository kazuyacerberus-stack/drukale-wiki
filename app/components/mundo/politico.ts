/**
 * O MAPA POLÍTICO
 *
 * Não existe fronteira desenhada à mão em lugar nenhum — nunca existiu
 * um dado de "onde começa e termina cada território" pra este planeta,
 * e inventar isso à mão seria arbitrário e ia desalinhar assim que um
 * local mudasse de dono. Em vez disso, a fronteira é CALCULADA: cada
 * ponto da superfície pertence à facção do local mais próximo dele —
 * um diagrama de Voronoi na esfera. Onde dois "mais próximos" empatam,
 * nasce a linha de fronteira.
 *
 * A conta usa produto escalar entre vetores unitários em vez de
 * distância angular de verdade (que pediria um arco-cosseno por
 * comparação): quanto maior o produto escalar, mais perto — mesma
 * ordenação, sem trigonometria extra rodando milhões de vezes.
 */

export type PontoPolitico = { lat: number; lon: number; cor: string };

function hexParaRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [138, 255, 192]; // cor de reserva, se algo vier torto
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Gera a textura do mapa político: mesma resolução e mesma convenção de
 * pixel->latitude/longitude que `gerarMundo` usa (v = y/altura é a
 * colatitude em fração de π; u = x/largura é a longitude em fração de
 * 2π) — sem isso as regiões pintadas ficariam desalinhadas dos locais
 * que aparecem no globo.
 *
 * Devolve `null` quando não há nenhum ponto (ninguém atribuiu facção a
 * um local ainda): não há o que desenhar.
 */
export function gerarMapaPolitico(L: number, A: number, pontos: PontoPolitico[]): HTMLCanvasElement | null {
  if (pontos.length === 0) return null;

  const pts = pontos.map((p) => {
    const fi = ((90 - p.lat) * Math.PI) / 180;
    const te = ((p.lon + 180) / 360) * 2 * Math.PI;
    const sf = Math.sin(fi);
    const [r, g, b] = hexParaRgb(p.cor);
    return { x: sf * Math.cos(te), y: Math.cos(fi), z: sf * Math.sin(te), r, g, b };
  });

  const cv = document.createElement('canvas');
  cv.width = L; cv.height = A;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(L, A);
  const px = img.data;

  const LIMIAR_FRONTEIRA = 0.045;

  for (let y = 0; y < A; y++) {
    const v = y / A;
    const fi = v * Math.PI;
    const sf = Math.sin(fi), cf = Math.cos(fi);

    for (let x = 0; x < L; x++) {
      const u = x / L;
      const te = u * 2 * Math.PI;
      const vx = sf * Math.cos(te), vy = cf, vz = sf * Math.sin(te);

      let melhor = -2, segundo = -2, iMelhor = 0;
      for (let k = 0; k < pts.length; k++) {
        const d = pts[k].x * vx + pts[k].y * vy + pts[k].z * vz;
        if (d > melhor) { segundo = melhor; melhor = d; iMelhor = k; }
        else if (d > segundo) segundo = d;
      }

      const i = (y * L + x) * 4;
      if (pts.length > 1 && melhor - segundo < LIMIAR_FRONTEIRA) {
        px[i] = 235; px[i + 1] = 245; px[i + 2] = 240; px[i + 3] = 230;
      } else {
        const dono = pts[iMelhor];
        px[i] = dono.r; px[i + 1] = dono.g; px[i + 2] = dono.b; px[i + 3] = 140;
      }
    }
  }

  ctx.putImageData(img, 0, 0);
  return cv;
}
