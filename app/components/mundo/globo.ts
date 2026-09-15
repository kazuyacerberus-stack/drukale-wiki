import type { Mapas } from './textura';

type Peca = { pos: WebGLBuffer; nor: WebGLBuffer; idx: WebGLBuffer; n: number };
/**
 * O GLOBO
 *
 * WebGL cru, sem biblioteca. Uma esfera texturizada que gira, com luz
 * de um lado, lava acesa no lado escuro e brilho de atmosfera na borda.
 */

/* ---------- matrizes (o mínimo, à mão) ---------- */
function perspectiva(fovGraus: number, prop: number, perto: number, longe: number) {
  const f = 1 / Math.tan((fovGraus * Math.PI) / 360);
  const d = perto - longe;
  return new Float32Array([
    f / prop, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (longe + perto) / d, -1,
    0, 0, (2 * longe * perto) / d, 0,
  ]);
}

function multiplicar(a: Float32Array, b: Float32Array) {
  const r = new Float32Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
      r[i * 4 + j] = s;
    }
  return r;
}

/** Rotação em Y (girar o mundo) seguida de X (inclinar), como 3x3. */
export function rotacao3(giro: number, inclina: number) {
  const cy = Math.cos(giro), sy = Math.sin(giro);
  const cx = Math.cos(inclina), sx = Math.sin(inclina);
  // Rx * Ry, em coluna-primeiro
  return new Float32Array([
    cy, sx * sy, -cx * sy,
    0, cx, sx,
    sy, -sx * cy, cx * cy,
  ]);
}

function para4(m3: Float32Array, tz: number) {
  return new Float32Array([
    m3[0], m3[1], m3[2], 0,
    m3[3], m3[4], m3[5], 0,
    m3[6], m3[7], m3[8], 0,
    0, 0, tz, 1,
  ]);
}

/* ---------- a esfera ---------- */
function malhaEsfera(fatias: number, aneis: number) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= aneis; i++) {
    const v = i / aneis;
    const fi = v * Math.PI;                 // 0 no polo norte
    const sf = Math.sin(fi), cf = Math.cos(fi);
    for (let j = 0; j <= fatias; j++) {
      const u = j / fatias;
      const te = u * Math.PI * 2;
      pos.push(sf * Math.cos(te), cf, sf * Math.sin(te));
      uv.push(u, v);
    }
  }
  for (let i = 0; i < aneis; i++)
    for (let j = 0; j < fatias; j++) {
      const a = i * (fatias + 1) + j;
      const b = a + fatias + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  return {
    pos: new Float32Array(pos),
    uv: new Float32Array(uv),
    idx: new Uint16Array(idx),
  };
}

const VS = `
attribute vec3 pos;
attribute vec2 uv;
uniform mat4 mvp;
uniform mat3 giro;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vT;
varying vec3 vB;
void main() {
  vUv = uv;
  // triedro da esfera: normal, tangente (leste) e bitangente (sul).
  // E nele que a normal lida do mapa de relevo e aplicada — sem esse
  // referencial, o relevo nao sabe para que lado do globo esta virado.
  float th = uv.x * 6.2831853;
  float ph = uv.y * 3.1415927;
  vN = giro * pos;
  vT = giro * vec3(-sin(th), 0.0, cos(th));
  vB = giro * vec3(cos(ph) * cos(th), -sin(ph), cos(ph) * sin(th));
  gl_Position = mvp * vec4(pos, 1.0);
}`;

const FS = `
precision highp float;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vT;
varying vec3 vB;
uniform sampler2D mapa;
uniform sampler2D mapaN;
uniform sampler2D mapaE;
uniform vec3 luz;
uniform float brilhoLava;

void main() {
  vec3 alb = texture2D(mapa, vUv).rgb;

  // a normal de verdade: a da esfera, torcida pelo relevo do terreno
  vec3 tn = texture2D(mapaN, vUv).rgb * 2.0 - 1.0;
  vec3 N = normalize(vN);
  vec3 n = normalize(tn.x * normalize(vT) + tn.y * normalize(vB) + tn.z * N);

  vec3 L = normalize(luz);
  vec3 V = vec3(0.0, 0.0, 1.0);
  float sol = max(dot(n, L), 0.0);
  // a linha do amanhecer segue a esfera lisa: se seguisse o relevo,
  // o terminador viraria uma serrilha piscando
  float solLiso = max(dot(N, L), 0.0);

  vec3 cor = alb * (0.11 + 1.3 * sol);

  // reflexo: gelo espelha, basalto quase nao
  float gelo = clamp((alb.b - alb.r * 0.9) * 6.0, 0.0, 1.0);
  vec3 H = normalize(L + V);
  float esp = pow(max(dot(n, H), 0.0), 34.0) * (0.05 + gelo * 0.55);
  cor += vec3(0.80, 0.88, 1.0) * esp * smoothstep(0.0, 0.1, solLiso);

  // o que brilha sozinho: lava sempre, cidades sobretudo na noite
  vec3 em = texture2D(mapaE, vUv).rgb;
  float noite = 1.0 - smoothstep(0.0, 0.3, solLiso);
  cor += em * (0.22 + 0.95 * noite) * brilhoLava * 1.05;

  // atmosfera na borda do disco
  float borda = 1.0 - abs(dot(N, V));
  cor += vec3(0.40, 0.14, 0.44) * pow(borda, 9.0) * 0.85;
  cor += vec3(0.60, 0.26, 0.07) * pow(borda, 14.0) * solLiso * 1.6;

  gl_FragColor = vec4(cor, 1.0);
}`;

function compilar(gl: WebGLRenderingContext, tipo: number, fonte: string) {
  const s = gl.createShader(tipo)!;
  gl.shaderSource(s, fonte);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error('shader: ' + gl.getShaderInfoLog(s));
  }
  return s;
}

/**
 * Prepara o globo num canvas. Devolve os controles.
 * Se o WebGL não estiver disponível, devolve null — quem chama decide
 * o que mostrar no lugar.
 */
export function criarGlobo(canvas: HTMLCanvasElement, mapas: Mapas) {
  // o TypeScript nao leva a verificacao de nulo para dentro de funcoes
  // aninhadas, entao a variavel usada daqui para baixo ja nasce sem nulo
  const ctx = canvas.getContext('webgl', { antialias: true, alpha: true });
  if (!ctx) return null;
  const gl: WebGLRenderingContext = ctx;

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compilar(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compilar(gl, gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('programa: ' + gl.getProgramInfoLog(prog));
  }
  gl.useProgram(prog);

  const m = malhaEsfera(96, 48);
  const bufPos = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
  gl.bufferData(gl.ARRAY_BUFFER, m.pos, gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

  const bufUv = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, bufUv);
  gl.bufferData(gl.ARRAY_BUFFER, m.uv, gl.STATIC_DRAW);
  const aUv = gl.getAttribLocation(prog, 'uv');
  gl.enableVertexAttribArray(aUv);
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

  const bufIdx = gl.createBuffer()!;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufIdx);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW);

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  function subirTextura(fonte: HTMLCanvasElement, unidade: number) {
    const t = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + unidade);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fonte);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    return t;
  }
  subirTextura(mapas.cor, 0);
  subirTextura(mapas.normal, 1);
  subirTextura(mapas.emissivo, 2);
  gl.uniform1i(gl.getUniformLocation(prog, 'mapa'), 0);
  gl.uniform1i(gl.getUniformLocation(prog, 'mapaN'), 1);
  gl.uniform1i(gl.getUniformLocation(prog, 'mapaE'), 2);

  const uMvp = gl.getUniformLocation(prog, 'mvp');
  const uGiro = gl.getUniformLocation(prog, 'giro');
  const uLuz = gl.getUniformLocation(prog, 'luz');
  const uLava = gl.getUniformLocation(prog, 'brilhoLava');

  gl.enable(gl.DEPTH_TEST);
  // sem descarte de faces de proposito: se a orientacao dos triangulos
  // estiver invertida, o descarte mostra o interior do hemisferio de tras
  // (que esta na sombra) e o planeta fica preto. O teste de profundidade
  // ja garante que so a superficie mais proxima aparece.
  gl.clearColor(0, 0, 0, 0);

  return {
    /** @param giro rotação horizontal, @param inclina vertical, @param dist afastamento da câmera */
    desenhar(giro: number, inclina: number, dist: number, brilhoLava = 1) {
      const L = canvas.width, A = canvas.height;
      gl.viewport(0, 0, L, A);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const r3 = rotacao3(giro, inclina);
      const modelo = para4(r3, 0);
      const vista = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-dist,1]);
      const proj = perspectiva(38, L / A, 0.1, 100);

      gl.uniformMatrix4fv(uMvp, false, multiplicar(proj, multiplicar(vista, modelo)));
      gl.uniformMatrix3fv(uGiro, false, r3);
      gl.uniform3f(uLuz, -0.55, 0.32, 0.77);
      gl.uniform1f(uLava, brilhoLava);

      gl.drawElements(gl.TRIANGLES, m.idx.length, gl.UNSIGNED_SHORT, 0);
      return { gl, proj, vista, r3 };   // a cidadela desenha por cima
    },
  };
}

/**
 * Fundo: poeira roxa e estrelas. Desenhado uma vez num canvas atrás
 * do globo — não precisa redesenhar a cada quadro.
 */
export function pintarEspaco(ctx: CanvasRenderingContext2D, L: number, A: number, rnd: () => number) {
  ctx.fillStyle = '#04020a';
  ctx.fillRect(0, 0, L, A);

  // nuvens de poeira
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const x = rnd() * L, y = rnd() * A;
    const r = (0.18 + rnd() * 0.42) * Math.min(L, A);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const rosa = rnd() < 0.55;
    g.addColorStop(0, rosa ? 'rgba(150,40,90,0.11)' : 'rgba(60,30,120,0.10)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  // estrelas
  for (let i = 0; i < 700; i++) {
    const x = rnd() * L, y = rnd() * A;
    const t = rnd();
    const raio = t > 0.97 ? 1.5 : t > 0.85 ? 1.0 : 0.6;
    ctx.fillStyle = `rgba(255,255,255,${0.2 + rnd() * 0.75})`;
    ctx.beginPath();
    ctx.arc(x, y, raio, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ============================================================
   A CIDADELA ORBITAL
   ------------------------------------------------------------
   Um anel com núcleo, girando em volta do planeta. Não é enfeite:
   é o desenho de um LOCAL cadastrado cujo tipo é orbital. Sem
   cadastro, não aparece nada aqui.
   ============================================================ */

function transladar(x: number, y: number, z: number) {
  return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]);
}
function escalar(s: number) {
  return new Float32Array([s,0,0,0, 0,s,0,0, 0,0,s,0, 0,0,0,1]);
}
function rot4(m3: Float32Array) {
  return new Float32Array([
    m3[0], m3[1], m3[2], 0,
    m3[3], m3[4], m3[5], 0,
    m3[6], m3[7], m3[8], 0,
    0, 0, 0, 1,
  ]);
}

/** Anel (toro) com normais, para a luz bater nele. */
function malhaToro(R: number, r: number, volta: number, lado: number) {
  const pos: number[] = [], nor: number[] = [], idx: number[] = [];
  for (let i = 0; i <= volta; i++) {
    const u = (i / volta) * Math.PI * 2;
    const cu = Math.cos(u), su = Math.sin(u);
    for (let j = 0; j <= lado; j++) {
      const v = (j / lado) * Math.PI * 2;
      const cv = Math.cos(v), sv = Math.sin(v);
      pos.push((R + r * cv) * cu, r * sv, (R + r * cv) * su);
      nor.push(cv * cu, sv, cv * su);
    }
  }
  for (let i = 0; i < volta; i++)
    for (let j = 0; j < lado; j++) {
      const a = i * (lado + 1) + j, b = a + lado + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx) };
}

const VS_CID = `
attribute vec3 pos;
attribute vec3 nor;
uniform mat4 mvp;
uniform mat3 rot;
varying vec3 vN;
varying vec3 vLocal;
void main() {
  vN = rot * nor;
  vLocal = pos;              // usado para acender as janelas do casco
  gl_Position = mvp * vec4(pos, 1.0);
}`;

const FS_CID = `
precision mediump float;
varying vec3 vN;
varying vec3 vLocal;
uniform vec3 luz;
uniform vec3 corBase;
uniform float janelas;      // 0 = peca lisa, 1 = casco habitado

void main() {
  vec3 n = normalize(vN);
  vec3 L = normalize(luz);
  vec3 V = vec3(0.0, 0.0, 1.0);
  float s = max(dot(n, L), 0.0);

  vec3 c = corBase * (0.30 + 0.85 * s);

  // metal: reflexo duro e concentrado, diferente da rocha do planeta
  vec3 H = normalize(L + V);
  c += vec3(1.0, 0.98, 0.92) * pow(max(dot(n, H), 0.0), 60.0) * 0.55;

  // placas do casco: poucos sulcos, so marcando os modulos
  float ang = atan(vLocal.z, vLocal.x);
  float sulco = smoothstep(0.46, 0.5, abs(fract(ang * 2.2) - 0.5));
  c *= 1.0 - sulco * 0.3 * janelas;

  // janelas: uma fila FINA na barriga do anel. A primeira versao usava
  // frequencia alta e uma faixa larga, e as listras enrolavam o casco
  // inteiro — a estacao virava mangueira sanfonada.
  float fila = smoothstep(0.93, 0.995, abs(sin(ang * 20.0)))
             * smoothstep(0.07, 0.015, abs(vLocal.y));
  c += vec3(0.70, 0.90, 1.0) * fila * janelas * 1.1;

  float borda = 1.0 - abs(dot(n, V));
  c += vec3(0.45, 0.80, 1.0) * pow(borda, 2.2) * 0.4;
  gl_FragColor = vec4(c, 1.0);
}`;

export function criarCidadela(gl: WebGLRenderingContext) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compilar(gl, gl.VERTEX_SHADER, VS_CID));
  gl.attachShader(prog, compilar(gl, gl.FRAGMENT_SHADER, FS_CID));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('cidadela: ' + gl.getProgramInfoLog(prog));
  }

  const anel = malhaToro(1.0, 0.16, 44, 14);
  // o núcleo: uma esfera pequena no meio dos anéis
  const nuc = malhaEsfera(24, 14);
  function subir(dados: Float32Array) {
    const b = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, dados, gl.STATIC_DRAW);
    return b;
  }
  function subirIdx(dados: Uint16Array) {
    const b = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, dados, gl.STATIC_DRAW);
    return b;
  }
  const pecas = {
    anel: { pos: subir(anel.pos), nor: subir(anel.nor), idx: subirIdx(anel.idx), n: anel.idx.length },
    // a esfera tem raio 1, entao a posicao serve de normal
    nucleo: { pos: subir(nuc.pos), nor: subir(nuc.pos), idx: subirIdx(nuc.idx), n: nuc.idx.length },
  };

  const aPos = gl.getAttribLocation(prog, 'pos');
  const aNor = gl.getAttribLocation(prog, 'nor');
  const uMvp = gl.getUniformLocation(prog, 'mvp');
  const uRot = gl.getUniformLocation(prog, 'rot');
  const uLuz = gl.getUniformLocation(prog, 'luz');
  const uCor = gl.getUniformLocation(prog, 'corBase');
  const uJan = gl.getUniformLocation(prog, 'janelas');

  return {
    /**
     * @param proj projeção  @param vista câmera  @param r3 rotação do mundo
     * @param orb  posição da cidadela na órbita, em coordenadas do planeta
     * @param tam  raio da cidadela
     */
    desenhar(proj: Float32Array, vista: Float32Array, r3: Float32Array,
             orb: number[], tam: number, giroProprio = 0) {
      gl.useProgram(prog);
      gl.uniformMatrix3fv(uRot, false, r3);
      gl.uniform3f(uLuz, -0.55, 0.32, 0.77);

      // gira com o mundo, vai até a posição da órbita, e encolhe
      const base = multiplicar(
        multiplicar(rot4(r3), transladar(orb[0], orb[1], orb[2])),
        escalar(tam));

      // a estação também roda em torno do próprio eixo
      const gp = rot4(rotacao3(giroProprio, 0));

      // anel deitado, anel em pé e o núcleo no meio
      const partes: [Peca, Float32Array, number[], number][] = [
        [pecas.anel, multiplicar(gp, escalar(1)), [0.82, 0.88, 0.96], 1],
        [pecas.anel, multiplicar(gp, multiplicar(escalar(0.62), rot4(rotacao3(0, Math.PI / 2)))), [0.66, 0.74, 0.86], 1],
        [pecas.nucleo, multiplicar(gp, escalar(0.3)), [0.95, 0.97, 1.0], 0],
      ];

      // braços ligando o núcleo ao anel externo: sem eles a estação
      // parece um giroscópio solto, e não uma coisa construída
      for (let b = 0; b < 6; b++) {
        const ab = (b / 6) * Math.PI * 2;
        const braco = multiplicar(
          multiplicar(gp, transladar(Math.cos(ab) * 0.58, 0, Math.sin(ab) * 0.58)),
          multiplicar(rot4(rotacao3(-ab, 0)), new Float32Array([
            0.34, 0, 0, 0,  0, 0.045, 0, 0,  0, 0, 0.045, 0,  0, 0, 0, 1,
          ])));
        partes.push([pecas.nucleo, braco, [0.58, 0.64, 0.74], 0]);
      }

      for (const [peca, local, cor, jan] of partes) {
        gl.bindBuffer(gl.ARRAY_BUFFER, peca.pos);
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, peca.nor);
        gl.enableVertexAttribArray(aNor);
        gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, peca.idx);

        gl.uniformMatrix4fv(uMvp, false,
          multiplicar(proj, multiplicar(vista, multiplicar(base, local))));
        gl.uniform3f(uCor, cor[0], cor[1], cor[2]);
        gl.uniform1f(uJan, jan);
        gl.drawElements(gl.TRIANGLES, peca.n, gl.UNSIGNED_SHORT, 0);
      }
    },
  };
}
