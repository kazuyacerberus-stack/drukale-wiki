const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const anterior = require.extensions['.ts'];
require.extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), {
  compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS},
}).outputText,filename);
after(()=>{ if(anterior) require.extensions['.ts']=anterior; else delete require.extensions['.ts']; });
const pasta=path.resolve(__dirname,'../app/components/mundo');
const {fenomenosNoInstante,candidatosClima,avancarClima,TIPOS_CLIMA,vetorClima}=require(path.join(pasta,'clima.ts'));
const {normal3,alturaNoMapa,relevoNoMapa,pontoNaVista,raioDaCamera}=require(path.join(pasta,'geometria.ts'));
const {gerarDetalhesGeometria}=require(path.join(pasta,'detalhesGeometria.ts'));
const pontos=[
  {lat:0,lon:0,oceano:false,costa:false},
  {lat:10,lon:70,oceano:true,costa:true},
  {lat:-25,lon:-90,oceano:true,costa:false},
  {lat:40,lon:130,oceano:true,costa:true},
  {lat:-40,lon:-10,oceano:false,costa:false},
];

test('o sorteio é reprodutível e muda com uma nova semente',()=>{
 const a=fenomenosNoInstante(9182,35,pontos,[...TIPOS_CLIMA]);
 assert.deepEqual(a,fenomenosNoInstante(9182,35,pontos,[...TIPOS_CLIMA]));
 assert.notDeepEqual(a,fenomenosNoInstante(9183,35,pontos,[...TIPOS_CLIMA]));
 assert.equal(new Set(a.map(e=>e.tipo)).size,3);
});
test('fenômenos marítimos respeitam a máscara e a seleção de tipos',()=>{
 for(let s=0;s<80;s++) for(const tempo of [0,45,160,900]) {
  const eventos=fenomenosNoInstante(s,tempo,pontos,[...TIPOS_CLIMA]);
  assert.ok(eventos.length<=4);
  for(const e of eventos) {
   assert.ok(Number.isFinite(e.lat)&&Number.isFinite(e.lon));
   assert.ok(e.progresso>=0&&e.progresso<1&&e.opacidade>=0&&e.opacidade<=1);
   if(e.tipo!=='tempestade')assert.equal(e.oceano,true);
   if(e.tipo==='tsunami')assert.equal(e.costa,true);
  }
 }
 assert.deepEqual(fenomenosNoInstante(1,20,pontos,[]),[]);
 assert.deepEqual(fenomenosNoInstante(1,20,pontos.filter(p=>!p.oceano),['tsunami','ciclone']),[]);
 assert.ok(fenomenosNoInstante(3,20,pontos,['tsunami']).every(e=>e.tipo==='tsunami'));
});
test('pausar congela o relógio e voltar à aba não salta vários minutos',()=>{
 let a=0,b=0;
 for(let i=0;i<60;i++)a=avancarClima(a,1/60,false,true);
 for(let i=0;i<30;i++)b=avancarClima(b,1/30,false,true);
 assert.ok(Math.abs(a-b)<1e-10);
 assert.equal(avancarClima(a,.1,true,true),a);
 assert.equal(avancarClima(a,240,false,false),a);
 assert.equal(avancarClima(a,240,false,true),a+.12);
 assert.equal(avancarClima(a,NaN,false,true),a);
});
test('a amostragem reconhece costa através da emenda e exclui gelo/lava',()=>{
 const L=48,A=24,p=new Uint8ClampedArray(L*A*4);
 for(let y=0;y<A;y++)for(let x=0;x<L;x++){p[(y*L+x)*4]=x<2?0:255;p[(y*L+x)*4+3]=255;}
 const candidatos=candidatosClima(p,L,A);
 assert.ok(candidatos.some(p=>p.lon>160&&p.oceano&&p.costa));
 for(let i=0;i<p.length;i+=4)p[i+1]=255;
 assert.deepEqual(candidatosClima(p,L,A),[]);
 assert.deepEqual(candidatosClima(new Uint8ClampedArray(0),L,A),[]);
});
test('relevo fecha a emenda, interpola e não cria espigões nos polos',()=>{
 const h=new Float32Array([0,1,2,3]);
 assert.equal(alturaNoMapa(h,2,2,.25,.25),1.5);
 assert.equal(alturaNoMapa(h,2,2,0,.4),alturaNoMapa(h,2,2,1,.4));
 assert.equal(alturaNoMapa(h,2,2,-.01,.4),alturaNoMapa(h,2,2,.99,.4));
 assert.ok(Math.abs(relevoNoMapa(h,2,2,.4,0))<1e-10);
 assert.ok(Math.abs(relevoNoMapa(h,2,2,.4,1))<1e-10);
});
test('a transformação de normais preserva perpendicularidade sob escala e cisalhamento',()=>{
 const m=new Float32Array([2,.3,.2,0,.7,3,0,0,.1,.5,.6,0,0,0,0,1]);
 const n=normal3(m);
 const aplicar=(a,v)=>[a[0]*v[0]+a[3]*v[1]+a[6]*v[2],a[1]*v[0]+a[4]*v[1]+a[7]*v[2],a[2]*v[0]+a[5]*v[1]+a[8]*v[2]];
 const normal=aplicar(n,[1,1,0]);
 const linear=new Float32Array([m[0],m[1],m[2],m[4],m[5],m[6],m[8],m[9],m[10]]);
 for(const tangente of [[1,-1,0],[0,0,1]]) {
  const t=aplicar(linear,tangente);
  assert.ok(Math.abs(t.reduce((s,v,i)=>s+v*normal[i],0))<1e-5);
 }
 assert.ok([...normal3(new Float32Array(16))].every(Number.isFinite));
});
test('o lote de arquitetura/vegetação tem orçamento finito, normais válidas e não nasce no oceano',()=>{
 const L=32,A=16,cor=new Uint8ClampedArray(L*A*4),mascara=new Uint8ClampedArray(L*A*4);
 for(let i=0;i<cor.length;i+=4){cor[i]=30;cor[i+1]=90;cor[i+2]=45;cor[i+3]=255;}
 const mundo={L,A,altura:new Float32Array(L*A).fill(.02),cidades:[{lat:0,lon:0,raio:4}]};
 const d=gerarDetalhesGeometria(mundo,cor,mascara);
 assert.ok(d.arvores>0&&d.arvores<=900&&d.predios>0);
 assert.ok(d.vertices.length/12<150000&&d.vertices.length%36===0);
 for(let i=0;i<d.vertices.length;i+=12){
  assert.ok([...d.vertices.slice(i,i+12)].every(Number.isFinite));
  assert.ok(Math.abs(Math.hypot(d.vertices[i+3],d.vertices[i+4],d.vertices[i+5])-1)<1e-4);
 }
 for(let i=0;i<mascara.length;i+=4)mascara[i]=255;
 const mar=gerarDetalhesGeometria(mundo,cor,mascara);
 assert.equal(mar.vertices.length,0);
});
test('coordenadas dos efeitos usam a mesma orientação do terreno',()=>{
 assert.ok(Math.abs(vetorClima(0,-180)[0]-1)<1e-10);
 assert.ok(Math.abs(vetorClima(0,-90)[2]-1)<1e-10);
 assert.ok(Math.abs(vetorClima(90,0)[1]-1)<1e-10);
});
test('inclinar a câmera mantém o local central e o clique sobre a mesma coordenada',()=>{
 for(const inclinacao of [0,.4,.85])for(const dist of [1.3,1.8,3.6]){
  const p=pontoNaVista([0,0,1],dist,inclinacao);
  assert.ok(Math.abs(p[0])+Math.abs(p[1])<1e-10);
  const {origem:o,direcao:d}=raioDaCamera(0,0,1.5,dist,inclinacao);
  const b=2*o.reduce((s,v,i)=>s+v*d[i],0),c=o.reduce((s,v)=>s+v*v,0)-1;
  const t=(-b-Math.sqrt(b*b-4*c))/2;
  const alvo=o.map((v,i)=>v+t*d[i]);
  assert.ok(Math.abs(alvo[0])+Math.abs(alvo[1])+Math.abs(alvo[2]-1)<1e-6);
 }
});
