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
uniform sampler2D mapaP;
uniform vec3 luz;
uniform float brilhoLava;
uniform float uPolitico;

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

  // mapa político: sobreposto por cima de tudo, só quando ligado —
  // com uPolitico em 0 (padrão) isto não muda nada no resultado
  vec4 pol = texture2D(mapaP, vUv);
  cor = mix(cor, pol.rgb, pol.a * uPolitico);

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

/** Um canvas 1x1 totalmente transparente — placeholder seguro de textura. */
function tela1x1Transparente(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 1; c.height = 1;
  return c;
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

  const bufUv = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, bufUv);
  gl.bufferData(gl.ARRAY_BUFFER, m.uv, gl.STATIC_DRAW);
  const aUv = gl.getAttribLocation(prog, 'uv');

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
  // pixel 1x1 transparente: placeholder seguro pro mapa político antes
  // de existir dado nenhum — sem isto o sampler fica indefinido e
  // alguns navegadores simplesmente recusam desenhar a cena inteira
  const semPolitico = tela1x1Transparente();

  const texturas = [
    subirTextura(mapas.cor, 0),
    subirTextura(mapas.normal, 1),
    subirTextura(mapas.emissivo, 2),
    subirTextura(semPolitico, 3),
  ];
  gl.uniform1i(gl.getUniformLocation(prog, 'mapa'), 0);
  gl.uniform1i(gl.getUniformLocation(prog, 'mapaN'), 1);
  gl.uniform1i(gl.getUniformLocation(prog, 'mapaE'), 2);
  gl.uniform1i(gl.getUniformLocation(prog, 'mapaP'), 3);

  const uMvp = gl.getUniformLocation(prog, 'mvp');
  const uGiro = gl.getUniformLocation(prog, 'giro');
  const uLuz = gl.getUniformLocation(prog, 'luz');
  const uLava = gl.getUniformLocation(prog, 'brilhoLava');
  const uPol = gl.getUniformLocation(prog, 'uPolitico');

  gl.enable(gl.DEPTH_TEST);
  // sem descarte de faces de proposito: se a orientacao dos triangulos
  // estiver invertida, o descarte mostra o interior do hemisferio de tras
  // (que esta na sombra) e o planeta fica preto. O teste de profundidade
  // ja garante que so a superficie mais proxima aparece.
  gl.clearColor(0, 0, 0, 0);

  return {
    /**
     * @param giro rotação horizontal, @param inclina vertical, @param dist afastamento da câmera
     * @param politico 0 a 1 — o quanto o mapa político aparece por cima do terreno
     */
    desenhar(giro: number, inclina: number, dist: number, brilhoLava = 1, politico = 0) {
      const L = canvas.width, A = canvas.height;
      gl.viewport(0, 0, L, A);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // ------------------------------------------------------------
      // Reassumir a placa de vídeo antes de desenhar.
      //
      // O WebGL tem UM estado só, compartilhado. A cidadela usa outro
      // programa e outros buffers, e quem desenhou por último deixa o
      // estado dela armado. Na primeira versão isto era montado uma vez
      // só, na criação, e funcionava — mas só porque nos meus testes o
      // globo desenhava antes de a cidadela existir. No site a cidadela
      // é criada primeiro, e aí o globo tentava desenhar usando os
      // índices da estação: a placa recusava e o planeta não aparecia.
      // Agora cada quadro rearma o que é do globo, do zero.
      // ------------------------------------------------------------
      gl.useProgram(prog);
      for (let i = 0; i < 4; i++) gl.disableVertexAttribArray(i);

      gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufUv);
      gl.enableVertexAttribArray(aUv);
      gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufIdx);

      for (let i = 0; i < 4; i++) {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, texturas[i]);
      }
      gl.enable(gl.DEPTH_TEST);

      const r3 = rotacao3(giro, inclina);
      const modelo = para4(r3, 0);
      const vista = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-dist,1]);
      const proj = perspectiva(38, L / A, 0.1, 100);

      gl.uniformMatrix4fv(uMvp, false, multiplicar(proj, multiplicar(vista, modelo)));
      gl.uniformMatrix3fv(uGiro, false, r3);
      gl.uniform3f(uLuz, -0.55, 0.32, 0.77);
      gl.uniform1f(uLava, brilhoLava);
      gl.uniform1f(uPol, politico);

      gl.drawElements(gl.TRIANGLES, m.idx.length, gl.UNSIGNED_SHORT, 0);
      return { gl, proj, vista, r3 };   // a cidadela desenha por cima
    },

    /**
     * Troca a textura do mapa político (ou volta ao vazio, com `null`).
     * Não faz parte do desenho de cada quadro — só é chamado de fora
     * quando os dados de facção dos locais mudam.
     */
    atualizarMapaPolitico(cv: HTMLCanvasElement | null) {
      gl.activeTexture(gl.TEXTURE0 + 3);
      gl.bindTexture(gl.TEXTURE_2D, texturas[3]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv ?? semPolitico);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
    },

    /**
     * Olha o que REALMENTE saiu na tela.
     *
     * Existe porque "o planeta não aparece" pode ter muitas causas, e
     * nenhuma delas dá erro visível: a placa simplesmente não desenha.
     * Isto lê os pixels do centro logo depois do desenho e devolve o
     * que encontrou, junto com o código de erro e o nome da placa —
     * assim a página consegue dizer o motivo em vez de ficar preta.
     *
     * Tem que ser chamado no MESMO quadro do desenho: depois que o
     * navegador mostra a imagem, o rascunho é apagado.
     */
    conferir() {
      const n = 24;
      const px = new Uint8Array(n * n * 4);
      const x0 = Math.max(0, ((canvas.width - n) / 2) | 0);
      const y0 = Math.max(0, ((canvas.height - n) / 2) | 0);
      gl.readPixels(x0, y0, n, n, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let acesos = 0;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i] + px[i + 1] + px[i + 2] > 24) acesos++;
      }
      let placa = 'desconhecida';
      try {
        const info = gl.getExtension('WEBGL_debug_renderer_info');
        if (info) {
          placa = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)).slice(0, 40);
        }
      } catch { /* alguns navegadores escondem isso de propósito */ }
      return {
        acesos,
        erro: gl.getError(),
        placa,
        tela: `${canvas.width}x${canvas.height}`,
      };
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

  // o que habita o vazio, por cima das estrelas
  tentaculos(ctx, L, A, rnd);
  cicatrixMaledictum(ctx, L, A, rnd);
}

/* ------------------------------------------------------------
   A CICATRIX MALEDICTUM

   Um rasgo no espaço com a forma de um olho de cobra: as duas
   pálpebras se encontram em pontas, a pupila é uma fenda em pé,
   e cada ponta se bifurca como língua de serpente.

   É pintada como luz somada (composite 'lighter'), e não como
   tinta por cima: assim as estrelas continuam aparecendo através
   dela, que é o que faz parecer buraco e não adesivo.
   ------------------------------------------------------------ */
function cicatrixMaledictum(
  ctx: CanvasRenderingContext2D, L: number, A: number, rnd: () => number,
) {
  const menor = Math.min(L, A);
  const cx = L * 0.2, cy = A * 0.19;           // alto, à esquerda do globo
  const esc = menor / 620;
  const comp = menor * 0.3;                    // meio comprimento do olho
  const abert = comp * 0.26;                   // abertura no meio
  const inc = -0.34;                           // levemente tombado

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(inc);
  ctx.globalCompositeOperation = 'lighter';

  /** O contorno do olho: dois arcos que se tocam nas pontas. */
  const olho = (k: number) => {
    ctx.beginPath();
    ctx.moveTo(-comp * k, 0);
    ctx.quadraticCurveTo(0, -abert * k, comp * k, 0);
    ctx.quadraticCurveTo(0, abert * k, -comp * k, 0);
    ctx.closePath();
  };

  // 1) o clarão em volta — é o que dá o ar de nuvem e não de risco
  for (const [k, cor] of [
    [1.55, 'rgba(70,18,110,0.13)'],
    [1.12, 'rgba(112,22,88,0.12)'],
    [0.8, 'rgba(30,96,70,0.11)'],
  ] as [number, string][]) {
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, comp * k);
    halo.addColorStop(0, cor);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.save();
    ctx.scale(1, 0.52);                        // o halo acompanha o olho
    ctx.beginPath(); ctx.arc(0, 0, comp * k, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // 2) o miolo do rasgo: verde por dentro, sangrando para o roxo
  const miolo = ctx.createLinearGradient(-comp, 0, comp, 0);
  miolo.addColorStop(0, 'rgba(84,18,112,0.34)');
  miolo.addColorStop(0.32, 'rgba(28,132,88,0.34)');
  miolo.addColorStop(0.54, 'rgba(176,196,178,0.34)');
  miolo.addColorStop(0.74, 'rgba(150,26,44,0.36)');
  miolo.addColorStop(1, 'rgba(76,16,104,0.3)');
  ctx.fillStyle = miolo;
  olho(1); ctx.fill();

  // 3) a borda acesa
  ctx.lineWidth = 1.6 * esc;
  ctx.strokeStyle = 'rgba(198,226,196,0.42)';
  olho(1); ctx.stroke();
  ctx.lineWidth = 5 * esc;
  ctx.strokeStyle = 'rgba(140,34,112,0.18)';
  olho(1.04); ctx.stroke();

  // 4) a pupila em pé, como a de cobra
  const pup = ctx.createLinearGradient(0, -abert, 0, abert);
  pup.addColorStop(0, 'rgba(0,0,0,0)');
  pup.addColorStop(0.5, 'rgba(6,2,10,0.92)');
  pup.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = pup;
  ctx.beginPath();
  ctx.moveTo(0, -abert * 0.94);
  ctx.quadraticCurveTo(15 * esc, 0, 0, abert * 0.94);
  ctx.quadraticCurveTo(-15 * esc, 0, 0, -abert * 0.94);
  ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(120,255,190,0.5)';
  ctx.lineWidth = 1.4 * esc;
  ctx.stroke();

  // 5) as pontas bifurcadas — a língua da serpente
  const garfo = (lado: number) => {
    for (const desvio of [-1, 1]) {
      let x = comp * lado, y = 0;
      let ang = lado > 0 ? 0 : Math.PI;
      ang += desvio * 0.26;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const passos = 9;
      for (let i = 0; i < passos; i++) {
        const passo = comp * 0.1 * (1 - i / (passos + 3));
        ang += (rnd() - 0.5) * 0.3 + desvio * 0.1;
        x += Math.cos(ang) * passo;
        y += Math.sin(ang) * passo;
        ctx.lineTo(x, y);
      }
      for (const [lg, cor] of [
        [9 * esc, 'rgba(110,24,140,0.16)'],
        [3.4 * esc, 'rgba(56,180,124,0.26)'],
        [1.2 * esc, 'rgba(225,240,220,0.44)'],
      ] as [number, string][]) {
        ctx.lineWidth = lg; ctx.strokeStyle = cor; ctx.stroke();
      }
    }
  };
  garfo(1); garfo(-1);

  // 6) fagulhas soltas ao longo do rasgo
  for (let i = 0; i < 90; i++) {
    const t = rnd() * 2 - 1;
    const x = t * comp * 1.1;
    const y = (rnd() - 0.5) * abert * 1.7 * (1 - Math.abs(t) * 0.8);
    const c = rnd();
    ctx.fillStyle = c < 0.4 ? 'rgba(150,60,200,0.5)'
                  : c < 0.7 ? 'rgba(90,230,160,0.5)'
                            : 'rgba(230,70,90,0.5)';
    ctx.beginPath();
    ctx.arc(x, y, (0.6 + rnd() * 1.6) * esc, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
}

/* ------------------------------------------------------------
   O QUE ENVOLVE O MUNDO

   Névoa escura vindo das bordas para o centro, em braços que
   afinam e terminam em garras. Não é um bicho desenhado inteiro:
   é o que se vê dele — muitos braços saindo do escuro, e o resto
   fica por conta de quem olha.
   ------------------------------------------------------------ */
function tentaculos(
  ctx: CanvasRenderingContext2D, L: number, A: number, rnd: () => number,
) {
  const esc = Math.min(L, A) / 620;
  const cx = L / 2, cy = A / 2;
  const longe = Math.hypot(L, A) / 2;

  // a névoa de fundo, encostando nas bordas e clareando no meio
  const bruma = ctx.createRadialGradient(cx, cy, longe * 0.28, cx, cy, longe);
  bruma.addColorStop(0, 'rgba(0,0,0,0)');
  bruma.addColorStop(0.6, 'rgba(10,4,16,0.42)');
  bruma.addColorStop(1, 'rgba(6,2,10,0.88)');
  ctx.fillStyle = bruma;
  ctx.fillRect(0, 0, L, A);

  /**
   * Fecha um contorno em volta da espinha do braço.
   *
   * Traçar uma linha grossa daria um cano de espessura igual do começo
   * ao fim — macarrão, não tentáculo. Aqui o contorno é construído dos
   * dois lados da espinha, com a largura afinando até virar ponta.
   */
  const contorno = (espinha: [number, number, number][], engordar: number) => {
    const esq: [number, number][] = [], dir: [number, number][] = [];
    for (let i = 0; i < espinha.length; i++) {
      const [x, y, w] = espinha[i];
      const a = espinha[Math.min(i + 1, espinha.length - 1)];
      const b = espinha[Math.max(i - 1, 0)];
      const ang = Math.atan2(a[1] - b[1], a[0] - b[0]);
      const nx = -Math.sin(ang) * w * engordar;
      const ny = Math.cos(ang) * w * engordar;
      esq.push([x + nx, y + ny]);
      dir.unshift([x - nx, y - ny]);
    }
    ctx.beginPath();
    ctx.moveTo(esq[0][0], esq[0][1]);
    for (const [x, y] of esq.slice(1)) ctx.lineTo(x, y);
    for (const [x, y] of dir) ctx.lineTo(x, y);
    ctx.closePath();
  };

  /** Uma garra: curva para fora, afina e vira gancho. */
  const garra = (
    px: number, py: number, ang: number, comprida: number, larga: number,
  ) => {
    const gancho = ang + 0.8;                        // a ponta encurva
    const mx = px + Math.cos(ang) * comprida * 0.62;
    const my = py + Math.sin(ang) * comprida * 0.62;
    const tx = mx + Math.cos(gancho) * comprida * 0.45;
    const ty = my + Math.sin(gancho) * comprida * 0.45;
    const nx = -Math.sin(ang) * larga, ny = Math.cos(ang) * larga;

    ctx.beginPath();
    ctx.moveTo(px + nx, py + ny);
    ctx.quadraticCurveTo(mx + nx * 0.4, my + ny * 0.4, tx, ty);
    ctx.quadraticCurveTo(mx - nx * 0.7, my - ny * 0.7, px - nx, py - ny);
    ctx.closePath();
    ctx.fillStyle = 'rgba(9,3,14,0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(176,154,190,0.46)';     // o osso pegando a luz
    ctx.lineWidth = Math.max(0.7, larga * 0.2);
    ctx.stroke();
    // um ponto de luz na ponta, para a garra não sumir no escuro
    ctx.beginPath();
    ctx.arc(tx, ty, Math.max(0.8, larga * 0.22), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(210,190,220,0.4)';
    ctx.fill();
  };

  const BRACOS = 10;
  const PARAR = longe * 0.42;      // onde o globo começa: o braço não invade
  for (let b = 0; b < BRACOS; b++) {
    const ang0 = (b / BRACOS) * Math.PI * 2 + (rnd() - 0.5) * 0.55;
    let x = cx + Math.cos(ang0) * longe * 1.02;
    let y = cy + Math.sin(ang0) * longe * 1.02;
    let ang = Math.atan2(cy - y, cx - x) + (rnd() - 0.5) * 0.85;

    // primeiro o caminho, só depois a espessura: assim o braço afina
    // do começo ao fim SEMPRE, seja ele curto ou comprido. Quando a
    // espessura caía um tanto por passo, os braços curtos chegavam
    // gordos no fim e pareciam fita, não tentáculo.
    const caminho: [number, number][] = [];
    const curva = (rnd() - 0.5) * 0.22;
    for (let i = 0; i < 26; i++) {
      caminho.push([x, y]);
      const passo = longe * 0.062 * (0.8 + rnd() * 0.3);
      ang += curva + (rnd() - 0.5) * 0.16;
      x += Math.cos(ang) * passo;
      y += Math.sin(ang) * passo;
      if (Math.hypot(x - cx, y - cy) < PARAR) break;
    }
    if (caminho.length < 5) continue;
    caminho.push([x + Math.cos(ang) * longe * 0.05, y + Math.sin(ang) * longe * 0.05]);

    const w0 = (58 + rnd() * 44) * esc;
    const ult = caminho.length - 1;
    const espinha: [number, number, number][] = caminho.map(([px2, py2], i) => {
      const t = i / ult;
      return [px2, py2, w0 * Math.pow(1 - t, 1.5) + 0.8 * esc];
    });

    // névoa em volta, depois o corpo, depois o fio de luz da beirada
    contorno(espinha, 2.2);
    ctx.fillStyle = 'rgba(12,4,20,0.32)';
    ctx.fill();

    contorno(espinha, 1);
    const pele = ctx.createLinearGradient(espinha[0][0], espinha[0][1], x, y);
    pele.addColorStop(0, 'rgba(10,3,17,0.95)');
    pele.addColorStop(1, 'rgba(34,13,50,0.9)');
    ctx.fillStyle = pele;
    ctx.fill();
    ctx.strokeStyle = 'rgba(122,50,150,0.34)';
    ctx.lineWidth = 1.4 * esc;
    ctx.stroke();

    // um vinco por dentro, acompanhando o braço: é ele que dá volume,
    // senão a forma fica chapada e some no preto do espaço
    contorno(espinha, 0.46);
    ctx.fillStyle = 'rgba(6,1,11,0.55)';
    ctx.fill();

    // ventosas ao longo do braço, só insinuadas
    for (let i = 4; i < espinha.length - 2; i += 2) {
      const [vx, vy, vw] = espinha[i];
      ctx.beginPath();
      ctx.arc(vx, vy, Math.min(4.5 * esc, vw * 0.14), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(96,40,124,0.34)';
      ctx.fill();
    }

    // e as garras na ponta
    const meio = espinha[Math.max(0, espinha.length - 4)];
    const [px, py] = espinha[espinha.length - 2];
    const pw = Math.max(9 * esc, meio[2] * 0.95);
    const dirF = Math.atan2(
      espinha[espinha.length - 1][1] - py, espinha[espinha.length - 1][0] - px);
    for (let d = -1; d <= 1; d++) {
      garra(px, py, dirF + d * 0.62, pw * (3 + rnd() * 1.2), pw * 0.32);
    }
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
      // mesma precaução do globo: o estado da placa vem de quem
      // desenhou por último, então a cidadela rearma o que é dela
      gl.useProgram(prog);
      for (let i = 0; i < 4; i++) gl.disableVertexAttribArray(i);
      gl.enable(gl.DEPTH_TEST);

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

/* ============================================================
   A SERPENTE DO OCEANO
   ------------------------------------------------------------
   Um corpo comprido que serpenteia rente à água, mergulhando e
   emergindo. Como a cidadela, não é enfeite: é o desenho de um
   LOCAL cadastrado cujo tipo é serpente.

   O corpo é um tubo construído em volta de uma curva que anda
   pela SUPERFÍCIE da esfera — por isso ela acompanha a curvatura
   do mundo em vez de flutuar reta por cima dele. E é por isso,
   também, que ela não é encolhida por uma matriz de escala:
   encolher um corpo grudado na esfera o afunda para dentro do
   planeta. O tamanho dela é decidido na hora de construir a
   malha, e depois ela só é GIRADA até o lugar onde foi cravada.
   ============================================================ */

/** Um ponto da esfera, a partir de latitude/longitude em radianos. */
function naEsfera(lat: number, lon: number, raio: number): [number, number, number] {
  const cl = Math.cos(lat);
  return [cl * Math.cos(lon) * raio, Math.sin(lat) * raio, cl * Math.sin(lon) * raio];
}

/**
 * Tubo em volta de uma curva sobre a esfera.
 *
 * A curva ondula na latitude e sobe e desce no raio: onde o raio fica
 * abaixo de 1, aquele trecho do corpo está debaixo d'água — e o próprio
 * planeta o esconde, sem precisar de conta nenhuma para isso.
 */
function malhaSerpente(nos: number, lados: number, vao: number, grossura: number) {
  const pos: number[] = [], nor: number[] = [], idx: number[] = [];
  const MERGULHOS = 3;               // quantas vezes ela afunda e volta
  const SOBE = grossura * 2.2;       // o quanto ela emerge da água

  const eixo = (t: number): [number, number, number] => {
    const lon = (t - 0.5) * vao;
    // o serpentear de lado é o movimento PRINCIPAL: é ele que faz o
    // corpo desenhar um S reconhecível. O sobe-e-desce é só um
    // tempero; quando ele mandava, o bicho sumia na água e sobravam
    // tocos soltos, que não pareciam serpente nenhuma.
    const lat = Math.sin(t * Math.PI * 2.6 + 0.4) * vao * 0.34;
    const fora = 0.5 + 0.5 * Math.cos(t * Math.PI * MERGULHOS);
    return naEsfera(lat, lon, 1 + fora * SOBE - grossura * 0.25);
  };

  for (let i = 0; i <= nos; i++) {
    const t = i / nos;
    const c = eixo(t);
    const frente = eixo(Math.min(1, t + 0.004));
    const tras = eixo(Math.max(0, t - 0.004));
    let dx = frente[0] - tras[0], dy = frente[1] - tras[1], dz = frente[2] - tras[2];
    const dn = Math.hypot(dx, dy, dz) || 1;
    dx /= dn; dy /= dn; dz /= dn;

    // o "para cima" de cada ponto é a direção que sai do centro do mundo
    const cn = Math.hypot(c[0], c[1], c[2]) || 1;
    const ux = c[0] / cn, uy = c[1] / cn, uz = c[2] / cn;
    let sx = dy * uz - dz * uy, sy = dz * ux - dx * uz, sz = dx * uy - dy * ux;
    const sn = Math.hypot(sx, sy, sz) || 1;
    sx /= sn; sy /= sn; sz /= sn;
    const vx = sy * dz - sz * dy, vy = sz * dx - sx * dz, vz = sx * dy - sy * dx;

    // pescoço fino, meio do corpo cheio, cauda terminando em ponta
    const r = grossura * ((0.45 + 0.55 * Math.sin(Math.pow(t, 0.6) * Math.PI)) * (1 - t * 0.8) + 0.06);

    for (let j = 0; j <= lados; j++) {
      const a = (j / lados) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a) * 0.78;   // seção achatada
      const nx = sx * ca + vx * sa, ny = sy * ca + vy * sa, nz = sz * ca + vz * sa;
      const nn = Math.hypot(nx, ny, nz) || 1;
      // a crista do dorso não é peça colada: é a própria seção do corpo
      // que sobe num gume por cima. Colada, virava uma fila de bolinhas
      // e o bicho parecia lagarta.
      const gume = 1 + 0.45 * Math.pow(Math.max(0, Math.sin(a)), 8) * (1 - t * 0.3);
      const rr = r * gume;
      pos.push(c[0] + nx * rr, c[1] + ny * rr, c[2] + nz * rr);
      nor.push(nx / nn, ny / nn, nz / nn);
    }
  }
  for (let i = 0; i < nos; i++)
    for (let j = 0; j < lados; j++) {
      const a = i * (lados + 1) + j, b = a + lados + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  return {
    pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx),
    cabeca: eixo(0),
  };
}

const FS_SERP = `
precision mediump float;
varying vec3 vN;
varying vec3 vLocal;
uniform vec3 luz;
uniform vec3 corBase;
uniform float janelas;      // aqui: 1 = corpo com escamas, 0 = peca lisa

void main() {
  vec3 n = normalize(vN);
  vec3 L = normalize(luz);
  vec3 V = vec3(0.0, 0.0, 1.0);
  float s = max(dot(n, L), 0.0);

  vec3 c = corBase * (0.26 + 0.95 * s);

  // escamas: um xadrez fino acompanhando o corpo
  float e = sin(vLocal.y * 620.0) * sin(vLocal.x * 620.0) * sin(vLocal.z * 620.0);
  c *= 1.0 + smoothstep(0.1, 0.8, e) * 0.4 * janelas;

  // umida: reflexo largo e macio, nada de metal
  vec3 H = normalize(L + V);
  c += vec3(0.75, 0.95, 0.85) * pow(max(dot(n, H), 0.0), 16.0) * 0.45;

  // a beirada acende, para o corpo nao sumir contra o mar escuro
  float borda = 1.0 - abs(dot(n, V));
  c += vec3(0.30, 0.85, 0.62) * pow(borda, 2.6) * 0.55;
  gl_FragColor = vec4(c, 1.0);
}`;

export function criarSerpente(gl: WebGLRenderingContext) {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compilar(gl, gl.VERTEX_SHADER, VS_CID));
  gl.attachShader(prog, compilar(gl, gl.FRAGMENT_SHADER, FS_SERP));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('serpente: ' + gl.getProgramInfoLog(prog));
  }

  const VAO = 0.82;          // quanto do mundo ela atravessa, em radianos
  const GROSSURA = 0.034;    // raio do corpo, em raios de planeta
  const corpo = malhaSerpente(140, 12, VAO, GROSSURA);
  const bola = malhaEsfera(18, 12);

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
    corpo: { pos: subir(corpo.pos), nor: subir(corpo.nor), idx: subirIdx(corpo.idx), n: corpo.idx.length },
    // a esfera tem raio 1, entao a posicao ja serve de normal
    bola: { pos: subir(bola.pos), nor: subir(bola.pos), idx: subirIdx(bola.idx), n: bola.idx.length },
  };

  const aPos = gl.getAttribLocation(prog, 'pos');
  const aNor = gl.getAttribLocation(prog, 'nor');
  const uMvp = gl.getUniformLocation(prog, 'mvp');
  const uRot = gl.getUniformLocation(prog, 'rot');
  const uLuz = gl.getUniformLocation(prog, 'luz');
  const uCor = gl.getUniformLocation(prog, 'corBase');
  const uEsc = gl.getUniformLocation(prog, 'janelas');

  /** Uma peça pequena posta num ponto do corpo (cabeça, olhos, crista). */
  const emCima = (p: [number, number, number], rx: number, ry: number, rz: number,
                  desloca: [number, number, number] = [0, 0, 0]) =>
    multiplicar(
      transladar(p[0] + desloca[0], p[1] + desloca[1], p[2] + desloca[2]),
      new Float32Array([rx,0,0,0, 0,ry,0,0, 0,0,rz,0, 0,0,0,1]));

  return {
    /**
     * @param lat,lon onde ela nada, em graus
     * @param onda  avança com o tempo; é o que faz o corpo sacudir
     */
    desenhar(proj: Float32Array, vista: Float32Array, r3: Float32Array,
             lat: number, lon: number, onda = 0) {
      gl.useProgram(prog);
      for (let i = 0; i < 4; i++) gl.disableVertexAttribArray(i);
      gl.enable(gl.DEPTH_TEST);

      gl.uniformMatrix3fv(uRot, false, r3);
      gl.uniform3f(uLuz, -0.55, 0.32, 0.77);

      // o corpo nasce em volta do equador, na longitude 0. Duas rotações
      // o levam até onde a serpente foi cravada — e um balanço pequeno
      // em longitude faz parecer que ela está nadando.
      const paraLon = ((lon + 180) * Math.PI) / 180 + Math.sin(onda) * 0.035;
      const paraLat = (lat * Math.PI) / 180;
      const base = multiplicar(
        rot4(r3),
        multiplicar(rot4(rotacao3(paraLon, 0)), rot4(rotacao3(0, -paraLat))),
      );

      const cb = corpo.cabeca;
      const olho: [number, number, number] = [cb[0] * 0.02, cb[1] * 0.02, cb[2] * 0.02];
      const partes: [Peca, Float32Array, number[], number][] = [
        [pecas.corpo, new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]), [0.13, 0.4, 0.31], 1],
        // a cabeça: uma bola achatada e puxada para a frente
        [pecas.bola, emCima(cb, GROSSURA * 2.0, GROSSURA * 1.15, GROSSURA * 1.25), [0.17, 0.48, 0.37], 0],
        // dois olhos acesos, para saber de que lado ela está olhando
        [pecas.bola, emCima(cb, GROSSURA * 0.22, GROSSURA * 0.22, GROSSURA * 0.22,
                            [olho[0] + GROSSURA * 0.5, olho[1] + GROSSURA * 0.5, olho[2]]),
         [1.0, 0.85, 0.2], 0],
        [pecas.bola, emCima(cb, GROSSURA * 0.22, GROSSURA * 0.22, GROSSURA * 0.22,
                            [olho[0] - GROSSURA * 0.5, olho[1] + GROSSURA * 0.5, olho[2]]),
         [1.0, 0.85, 0.2], 0],
      ];


      for (const [peca, local, cor, esc] of partes) {
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
        gl.uniform1f(uEsc, esc);
        gl.drawElements(gl.TRIANGLES, peca.n, gl.UNSIGNED_SHORT, 0);
      }
    },
  };
}
