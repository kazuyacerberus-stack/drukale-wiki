import { gerarDetalhesGeometria } from './detalhesGeometria';
import { multiplicar4 } from './geometria';
import { limparAtributos, programaGpu } from './gpu';
import type { Mapas } from './textura';

export const VS_DETALHES=`
attribute vec3 pos;
attribute vec3 nor;
attribute vec3 tinta;
attribute vec2 uv;
attribute float material;
uniform mat4 mvp;
uniform mat3 giro;
varying vec3 n;
varying vec3 cor;
varying vec3 radial;
varying vec2 tex;
varying float mat;
varying vec3 mundo;
void main(){n=giro*nor;radial=normalize(giro*pos);mundo=giro*pos;cor=tinta;tex=uv;mat=material;gl_Position=mvp*vec4(pos,1.);}
`;
export const FS_DETALHES=`
precision mediump float;
varying vec3 n;
varying vec3 cor;
varying vec3 radial;
varying vec2 tex;
varying float mat;
varying vec3 mundo;
uniform vec3 olho;
void main(){
 vec3 N=normalize(n),L=normalize(vec3(-.78,.36,.51)),V=normalize(olho-mundo);
 float sol=dot(normalize(radial),L);
 float dia=smoothstep(-.1,.25,sol);
 float dif=max(dot(N,L),0.);
 vec3 c=cor*(.14+.25*dia+dif*.9);
 if(mat>.5&&mat<1.5){
   vec2 janela=fract(tex*vec2(4.,7.));
   float vidro=step(.25,janela.x)*step(janela.x,.65)*step(.25,janela.y)*step(janela.y,.68);
   float parede=1.-smoothstep(.3,.7,abs(dot(N,normalize(radial))));
   c+=vec3(1.,.63,.24)*vidro*parede*(.22+.9*(1.-dia));
   c+=vec3(.35,.45,.5)*pow(max(dot(N,normalize(L+V)),0.),30.)*.13;
 }
 if(mat>1.5){c*=.88+.12*sin(tex.y*24.);}
 c=pow(1.-exp(-c*1.15),vec3(.454545));
 gl_FragColor=vec4(c,1.);
}`;

export function criarDetalhesGpu(gl: WebGLRenderingContext,mapas:Mapas,mascara:Uint8ClampedArray) {
 const shader=programaGpu(gl,VS_DETALHES,FS_DETALHES),buffer=gl.createBuffer()!;
 const cores=mapas.cor.getContext('2d')!.getImageData(0,0,mapas.L,mapas.A).data;
 let dados=gerarDetalhesGeometria(mapas,cores,mascara);
 const enviar=()=>{gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,dados.vertices,gl.STATIC_DRAW);};
 enviar();
 let chave='';
 const atributos=[['pos',3,0],['nor',3,3],['tinta',3,6],['uv',2,9],['material',1,11]] as const;
 const a=atributos.map(([nome,tamanho,inicio])=>({local:gl.getAttribLocation(shader.programa,nome),tamanho,inicio}));
 const uMvp=gl.getUniformLocation(shader.programa,'mvp'),uGiro=gl.getUniformLocation(shader.programa,'giro');
 const uOlho=gl.getUniformLocation(shader.programa,'olho');
 return {
  atualizarLocais(locais:{id:string;lat:number;lon:number;tipo:string}[]){
   const cidades=locais.filter(l=>['cidade','capital','base','quartel'].includes(l.tipo));
   const nova=cidades.map(l=>`${l.id}:${l.lat}:${l.lon}`).join('|');
   if(nova===chave)return;
   chave=nova;
   dados=gerarDetalhesGeometria(mapas,cores,mascara,cidades.map(l=>({lat:l.lat,lon:l.lon,raio:4})));
   enviar();
  },
  desenhar(proj:Float32Array,vista:Float32Array,r3:Float32Array,qualidade:string,olho:number[]=[0,0,3.6]){
   gl.useProgram(shader.programa);limparAtributos(gl);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   for(const v of a){gl.enableVertexAttribArray(v.local);gl.vertexAttribPointer(v.local,v.tamanho,gl.FLOAT,false,48,v.inicio*4);}
   const modelo=new Float32Array([r3[0],r3[1],r3[2],0,r3[3],r3[4],r3[5],0,r3[6],r3[7],r3[8],0,0,0,0,1]);
   gl.uniformMatrix4fv(uMvp,false,multiplicar4(proj,multiplicar4(vista,modelo)));gl.uniformMatrix3fv(uGiro,false,r3);
   gl.uniform3fv(uOlho,olho);
   const fracao=qualidade==='leve'?.25:qualidade==='alta'?1:.65;
   const n=dados.verticesCidades+Math.floor((dados.vertices.length/12-dados.verticesCidades)*fracao/3)*3;
   gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.BLEND);gl.drawArrays(gl.TRIANGLES,0,n);
   limparAtributos(gl);
  },
  liberar(){gl.deleteBuffer(buffer);shader.liberar();},
 };
}
