import { aleatorio, vetorClima } from './clima';
import { relevoNoMapa, type Vetor } from './geometria';

type Centro = { lat: number; lon: number; raio: number };
type Terreno = { L: number; A: number; altura: Float32Array; cidades: Centro[] };
const sub = (a: Vetor,b: Vetor): Vetor => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross = (a: Vetor,b: Vetor): Vetor => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit = (a: Vetor): Vetor => {const n=Math.hypot(...a)||1;return [a[0]/n,a[1]/n,a[2]/n];};

/** Malhas estáticas em lotes: não cria um objeto WebGL para cada prédio/árvore. */
export function gerarDetalhesGeometria(terreno: Terreno, cor: Uint8ClampedArray, mascara: Uint8ClampedArray, extras: Centro[] = []) {
  const { L,A,altura }=terreno;
  const vertices: number[]=[];
  let arvores=0,predios=0;
  const rnd=aleatorio(26062026);
  const pixel=(lat:number,lon:number) => {
    const x=Math.min(L-1,Math.floor((((lon+180)/360)%1+1)%1*L));
    const y=Math.min(A-1,Math.max(0,Math.floor((90-lat)/180*A)));
    return (y*L+x)*4;
  };
  function triangulo(a:Vetor,b:Vetor,c:Vetor,tinta:Vetor,material:number,uv:[[number,number],[number,number],[number,number]]=[[0,0],[1,0],[1,1]]) {
    const n=unit(cross(sub(b,a),sub(c,a)));
    for(const [i,p] of [a,b,c].entries()) vertices.push(...p,...n,...tinta,...uv[i],material);
  }
  function base(lat:number,lon:number) {
    const n=vetorClima(lat,lon), lo=(lon+180)*Math.PI/180;
    const e:Vetor=[-Math.sin(lo),0,Math.cos(lo)], s=cross(n,e);
    return (x:number,y:number,z:number):Vetor => {
      const p=unit([n[0]+e[0]*x+s[0]*y,n[1]+e[1]*x+s[1]*y,n[2]+e[2]*x+s[2]*y]);
      const u=((Math.atan2(p[2],p[0])/(Math.PI*2))%1+1)%1,v=Math.acos(Math.max(-1,Math.min(1,p[1])))/Math.PI;
      const r=1+relevoNoMapa(altura,L,A,u,v)+z;
      return [p[0]*r,p[1]*r,p[2]*r];
    };
  }
  type Base=ReturnType<typeof base>;
  function quad(p:Vetor[],c:Vetor,material:number) {
    triangulo(p[0],p[1],p[2],c,material);
    triangulo(p[0],p[2],p[3],c,material,[[0,0],[1,1],[0,1]]);
  }
  function caixa(b:Base,x:number,y:number,w:number,d:number,h:number,c:Vetor,material=1,z=0) {
    const p=(xx:number,yy:number,zz:number)=>b(x+xx,y+yy,z+zz);
    quad([p(-w,-d,h),p(w,-d,h),p(w,d,h),p(-w,d,h)],c,material);
    quad([p(-w,-d,0),p(w,-d,0),p(w,-d,h),p(-w,-d,h)],c,material);
    quad([p(w,-d,0),p(w,d,0),p(w,d,h),p(w,-d,h)],c,material);
    quad([p(w,d,0),p(-w,d,0),p(-w,d,h),p(w,d,h)],c,material);
    quad([p(-w,d,0),p(-w,-d,0),p(-w,-d,h),p(-w,d,h)],c,material);
  }
  function cone(b:Base,x:number,y:number,r:number,z:number,h:number,tinta:Vetor,lados=6,material=2) {
    for(let i=0;i<lados;i++) {
      const a=i/lados*Math.PI*2,c=(i+1)/lados*Math.PI*2;
      triangulo(b(x+Math.cos(a)*r,y+Math.sin(a)*r,z),b(x+Math.cos(c)*r,y+Math.sin(c)*r,z),b(x,y,z+h),tinta,material);
    }
  }

  if(L>0&&A>0&&cor.length>=L*A*4&&mascara.length>=L*A*4) {
    const centros=[...terreno.cidades,...extras].slice(0,32);
    for(const cidade of centros) {
      const k=pixel(cidade.lat,cidade.lon);
      if(mascara[k]>128||mascara[k+1]>130||mascara[k+2]>100) continue;
      const b=base(cidade.lat,cidade.lon);
      const R=Math.max(.012,Math.min(.035,cidade.raio*Math.PI/180*.30));
      const pedra:Vetor=[.35+rnd()*.12,.34+rnd()*.12,.30+rnd()*.13];
      // Malha urbana irregular, com ruas livres entre quadras.
      for(let y=-3;y<=3;y++) for(let x=-3;x<=3;x++) {
        if((x===0&&y===0)||x*x+y*y>10||rnd()<.14) continue;
        const passo=R*.35, w=passo*(.21+rnd()*.15),d=passo*(.23+rnd()*.13),h=R*(.13+rnd()*.45);
        const xx=x*passo+(rnd()-.5)*passo*.18, yy=y*passo+(rnd()-.5)*passo*.18;
        caixa(b,xx,yy,w,d,h,pedra);
        if(rnd()>.35)cone(b,xx,yy,Math.max(w,d)*1.22,h,h*.25,[.25,.31,.34],4,0);
        else caixa(b,xx,yy,w*1.1,d*1.1,h*.035,[.43,.40,.34],0,h);
        predios++;
      }
      // Fortaleza central, quatro torres e agulha: silhuetas reconhecíveis no zoom.
      caixa(b,0,0,R*.20,R*.20,R*.48,[.56,.52,.43]);
      cone(b,0,0,R*.23,R*.48,R*.44,[.28,.37,.40],8,0);
      for(const x of [-1,1]) for(const y of [-1,1]) {
        caixa(b,x*R*.23,y*R*.23,R*.08,R*.08,R*.57,[.46,.44,.39]);
        cone(b,x*R*.23,y*R*.23,R*.12,R*.57,R*.29,[.24,.32,.34],8,0);
      }
      predios+=5;
    }
  }
  const verticesCidades=vertices.length/12;
  const pontos:[number,number][]=[];
  if(L>0&&A>0) for(let linha=0;linha<48;linha++) for(let coluna=0;coluna<96;coluna++) pontos.push([64-linha/47*128,-178+coluna/95*356]);
  for(let i=pontos.length-1;i>0;i--) {const j=Math.floor(rnd()*(i+1));[pontos[i],pontos[j]]=[pontos[j],pontos[i]];}
  for(const [lat,lon] of pontos) {
    if(arvores>=900||cor.length<L*A*4||mascara.length<L*A*4) break;
    const k=pixel(lat,lon);
    if(mascara[k]>70||mascara[k+1]>60||mascara[k+2]>30||cor[k+1]<cor[k]*1.16||cor[k+1]<cor[k+2]*1.15) continue;
    const b=base(lat,lon);
    for(let i=0;i<8&&arvores<900;i++) {
      const x=(rnd()-.5)*.018,y=(rnd()-.5)*.018,h=.006+rnd()*.008;
      caixa(b,x,y,.00055,.00055,h*.5,[.21,.16,.11],0);
      cone(b,x,y,h*.30,h*.25,h*.72,[.065+rnd()*.055,.16+rnd()*.10,.075+rnd()*.04],8);
      cone(b,x,y,h*.24,h*.54,h*.63,[.09,.24+rnd()*.06,.11],8);
      arvores++;
    }
  }
  return { vertices:new Float32Array(vertices), verticesCidades, arvores,predios };
}
