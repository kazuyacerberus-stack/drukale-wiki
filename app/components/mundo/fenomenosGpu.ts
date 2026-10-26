import { vetorClima, type EstadoClima } from './clima';
import { multiplicar4 } from './geometria';
import { limparAtributos, programaGpu } from './gpu';
import type { Mapas } from './textura';

export const VS_FENOMENOS = `
attribute vec2 ponto;
uniform mat4 mvp;
uniform mat3 giro;
uniform vec3 centro;
uniform float raio;
uniform float tipo;
uniform float tempo;
uniform float progresso;
uniform float camada;
varying vec2 q;
varying vec3 n;
varying vec2 uv;
varying float crista;
void main() {
  vec3 eixo = abs(centro.y) < 0.95 ? vec3(0.,1.,0.) : vec3(1.,0.,0.);
  vec3 leste = normalize(cross(eixo, centro));
  vec3 norte = cross(centro, leste);
  vec3 direcao = normalize(centro + (leste * ponto.x + norte * ponto.y) * tan(raio));
  float r = length(ponto);
  float altura = 1.032 + camada * 0.010 + max(0., 1. - r*r) * 0.022;
  crista = 0.;
  if (tipo > 1.5) {
    float frente = progresso * 1.05 + 0.08;
    float envelope = exp(-pow((r - frente) * 5.5, 2.));
    crista = pow(max(0., sin((r - frente) * 49.)), 5.) * envelope;
    altura = 1.002 + crista * 0.010;
  } else {
    altura += sin(ponto.x * 19. + tempo * 0.12) * sin(ponto.y * 17.) * 0.002;
  }
  q = ponto;
  n = giro * direcao;
  uv = vec2(atan(direcao.z, direcao.x) / 6.2831853 + 0.5, acos(clamp(direcao.y,-1.,1.)) / 3.14159265);
  // A longitude do mundo começa no eixo +X; atan devolve -pi..pi.
  uv.x = fract(uv.x + 0.5);
  gl_Position = mvp * vec4(direcao * altura, 1.);
}`;

export const FS_FENOMENOS = `
precision highp float;
varying vec2 q;
varying vec3 n;
varying vec2 uv;
varying float crista;
uniform sampler2D mascara;
uniform float tipo;
uniform float tempo;
uniform float progresso;
uniform float forca;
uniform float camada;
uniform float raios;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x), mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
}
float fbm(vec2 p) {
  float a=.5, s=0.;
  for(int i=0;i<4;i++) { s+=noise(p)*a; p=p*2.03+vec2(3.1,1.7); a*=.5; }
  return s;
}
void main() {
  float r=length(q);
  if(r>1.) discard;
  float borda=1.-smoothstep(.68,1.,r);
  float luz=.25+.75*max(dot(normalize(n),normalize(vec3(-.78,.36,.51))),0.);
  if(tipo>1.5) {
    if(texture2D(mascara,uv).r < .75) discard;
    float espuma=smoothstep(.04,.7,crista);
    float halo=crista*.28;
    float alfa=(espuma*.8+halo)*forca*borda;
    if(alfa<.005) discard;
    gl_FragColor=vec4(mix(vec3(.07,.44,.59),vec3(.82,.97,1.),espuma)*(.55+.45*luz),alfa);
    return;
  }
  vec2 fluxo=q;
  float ang=atan(q.y,q.x);
  if(tipo>.5) {
    float a=ang+tempo*.10+(1.-r)*5.;
    fluxo=vec2(cos(a),sin(a))*r;
  } else fluxo+=vec2(tempo*.008,-tempo*.004);
  float dens=fbm(fluxo*7.+camada*4.);
  if(tipo>.5) {
    float bracos=.5+.5*sin(ang*4.+r*16.-tempo*.32);
    dens=mix(dens,bracos*.58+dens*.55,.65);
    dens*=smoothstep(.07,.16,r); // olho do ciclone
  }
  float alfa=smoothstep(.30,.69,dens)*borda*forca*(camada<.5?.65:.44);
  float altura=fbm(fluxo*13.+vec2(4.7,9.2));
  vec3 cor=mix(vec3(.12,.17,.23),vec3(.78,.84,.88),altura)*(.40+.60*luz);
  float pulso=pow(max(0.,sin(tempo*.8+camada*2.)),48.)*raios;
  cor+=vec3(.60,.75,1.)*pulso*.38;
  // Riscas finas na base: chuva acompanhando a circulação regional.
  if(camada<.5) {
    float chuva=pow(max(0.,sin(fluxo.x*150.+fluxo.y*32.+tempo*2.)),18.);
    cor+=vec3(.14,.25,.34)*chuva*.35;
  }
  if(alfa<.005) discard;
  gl_FragColor=vec4(cor,alfa);
}`;

export function criarFenomenosGpu(gl: WebGLRenderingContext, mapas: Mapas) {
  const shader = programaGpu(gl, VS_FENOMENOS, FS_FENOMENOS);
  const lados = 128, aneis=96, vertices: number[] = [], indices: number[] = [];
  // Amostragem radial: as cristas continuam circulares mesmo em aproximação.
  for (let y = 0; y <= aneis; y++) for (let x = 0; x <= lados; x++) {
    const a=x/lados*Math.PI*2,r=y/aneis;vertices.push(Math.cos(a)*r,Math.sin(a)*r);
  }
  for (let y = 0; y < aneis; y++) for (let x = 0; x < lados; x++) {
    const a=y*(lados+1)+x, b=a+lados+1;
    indices.push(a,b,a+1,b,b+1,a+1);
  }
  const pontos = gl.createBuffer()!, triangulos = gl.createBuffer()!, mascara = gl.createTexture()!;
  gl.bindBuffer(gl.ARRAY_BUFFER,pontos); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangulos); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,mascara);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,mapas.mascara);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const atributo=gl.getAttribLocation(shader.programa,'ponto');
  const u=Object.fromEntries(['mvp','giro','centro','raio','tipo','tempo','progresso','camada','forca','raios','mascara'].map(k=>[k,gl.getUniformLocation(shader.programa,k)]));
  return {
    desenhar(proj: Float32Array, vista: Float32Array, r3: Float32Array, clima: EstadoClima, qualidade: string) {
      if (!clima.eventos.length) return;
      gl.useProgram(shader.programa); limparAtributos(gl);
      gl.enableVertexAttribArray(atributo); gl.bindBuffer(gl.ARRAY_BUFFER,pontos); gl.vertexAttribPointer(atributo,2,gl.FLOAT,false,0,0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangulos);
      const modelo=new Float32Array([r3[0],r3[1],r3[2],0,r3[3],r3[4],r3[5],0,r3[6],r3[7],r3[8],0,0,0,0,1]);
      gl.uniformMatrix4fv(u.mvp,false,multiplicar4(proj,multiplicar4(vista,modelo)));
      gl.uniformMatrix3fv(u.giro,false,r3);
      gl.uniform1f(u.tempo,clima.tempo); gl.uniform1f(u.raios,clima.raios?1:0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,mascara); gl.uniform1i(u.mascara,0);
      gl.enable(gl.DEPTH_TEST); gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      for(const evento of clima.eventos) {
        const centro=vetorClima(evento.lat,evento.lon);
        gl.uniform3fv(u.centro,centro); gl.uniform1f(u.raio,evento.raio*Math.PI/180);
        gl.uniform1f(u.tipo,evento.tipo==='tsunami'?2:evento.tipo==='ciclone'?1:0);
        gl.uniform1f(u.progresso,evento.progresso); gl.uniform1f(u.forca,evento.intensidade*evento.opacidade);
        const camadas=evento.tipo==='tsunami'||qualidade==='leve'?1:qualidade==='alta'?3:2;
        for(let camada=0;camada<camadas;camada++) { gl.uniform1f(u.camada,camada); gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0); }
      }
      gl.depthMask(true); gl.disable(gl.BLEND); limparAtributos(gl);
    },
    liberar() { gl.deleteBuffer(pontos); gl.deleteBuffer(triangulos); gl.deleteTexture(mascara); shader.liberar(); },
  };
}
