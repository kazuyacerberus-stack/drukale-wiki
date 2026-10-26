export type Vetor = [number, number, number];
export const EXAGERO_RELEVO = 0.054;

export function olhoDaCamera(dist:number,inclinacao=0):Vetor {
  return [0,-Math.sin(inclinacao)*(dist-1),1+Math.cos(inclinacao)*(dist-1)];
}

/** Inclina em torno do ponto observado na superfície, mantendo-o no centro. */
export function matrizVista(dist:number,inclinacao=0) {
  const s=Math.sin(inclinacao),c=Math.cos(inclinacao);
  return new Float32Array([1,0,0,0,0,c,-s,0,0,s,c,0,0,-s,-(dist-1+c),1]);
}

export function pontoNaVista(p:Vetor,dist:number,inclinacao=0):Vetor {
  const s=Math.sin(inclinacao),c=Math.cos(inclinacao);
  return [p[0],c*p[1]+s*p[2]-s,-s*p[1]+c*p[2]-(dist-1+c)];
}

export function raioDaCamera(x:number,y:number,proporcao:number,dist:number,inclinacao=0,fov=38) {
  const t=Math.tan(fov*Math.PI/360),s=Math.sin(inclinacao),c=Math.cos(inclinacao);
  const dx=x*t*proporcao,dy=y*t;
  const d:Vetor=[dx,c*dy+s,s*dy-c],n=Math.hypot(...d);
  return {origem:olhoDaCamera(dist,inclinacao),direcao:d.map(v=>v/n) as Vetor};
}

export function multiplicar4(a: Float32Array, b: Float32Array) {
  const r = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let l = 0; l < 4; l++)
    for (let k = 0; k < 4; k++) r[c * 4 + l] += a[k * 4 + l] * b[c * 4 + k];
  return r;
}

/** Inversa transposta: mantém a iluminação correta em peças alongadas/achatadas. */
export function normal3(m: Float32Array) {
  const a = m[0], b = m[4], c = m[8], d = m[1], e = m[5], f = m[9], g = m[2], h = m[6], i = m[10];
  const A = e * i - f * h, B = f * g - d * i, C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-18) return new Float32Array([1,0,0,0,1,0,0,0,1]);
  return new Float32Array([A, c*h-b*i, b*f-c*e, B, a*i-c*g, c*d-a*f, C, b*g-a*h, a*e-b*d].map(n => n / det));
}

export function alturaNoMapa(altura: Float32Array, L: number, A: number, u: number, v: number) {
  if (!altura.length || L < 1 || A < 1) return 0;
  const x = ((u % 1 + 1) % 1) * L;
  const y = Math.max(0, Math.min(A - 1, v * A));
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = (x0 + 1) % L, y1 = Math.min(A - 1, y0 + 1);
  const tx = x - x0, ty = y - y0;
  const a = Math.max(0, altura[y0 * L + x0]), b = Math.max(0, altura[y0 * L + x1]);
  const c = Math.max(0, altura[y1 * L + x0]), d = Math.max(0, altura[y1 * L + x1]);
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}

export function relevoNoMapa(altura: Float32Array, L: number, A: number, u: number, v: number) {
  return alturaNoMapa(altura, L, A, u, v) * EXAGERO_RELEVO * Math.min(1, Math.sin(v * Math.PI) * 4);
}
