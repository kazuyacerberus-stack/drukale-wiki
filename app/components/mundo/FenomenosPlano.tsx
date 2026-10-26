import { useEffect, useId, useState } from 'react';
import { projetarMapaPlano } from '../../lib/cartografia';
import type { Fenomeno } from './clima';

export default function FenomenosPlano({eventos,mascara,selecionado,raios}:{eventos:Fenomeno[];mascara:HTMLCanvasElement|null;selecionado:string|null;raios:boolean}) {
  const id=useId().replaceAll(':','');
  const [agua,setAgua]=useState('');
  useEffect(()=>{
    if(!mascara)return;
    const ctx=mascara.getContext('2d');if(!ctx)return;
    const pixels=ctx.getImageData(0,0,mascara.width,mascara.height);
    for(let i=0;i<pixels.data.length;i+=4){const alfa=pixels.data[i];pixels.data[i]=255;pixels.data[i+1]=255;pixels.data[i+2]=255;pixels.data[i+3]=alfa;}
    const cv=document.createElement('canvas');cv.width=mascara.width;cv.height=mascara.height;
    cv.getContext('2d')?.putImageData(pixels,0,0);setAgua(cv.toDataURL('image/png'));
  },[mascara]);
  return <svg className="atlas-clima-plano" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
    <defs><mask id={`agua-${id}`}>{agua&&<image href={agua} width="1000" height="500"/>}</mask><radialGradient id={`nuvem-${id}`}><stop offset="0" stopColor="#293d52" stopOpacity=".94"/><stop offset=".55" stopColor="#b0c6d6" stopOpacity=".8"/><stop offset="1" stopColor="#d2e5ed" stopOpacity="0"/></radialGradient></defs>
    {eventos.map(evento=>{
      const p=projetarMapaPlano(evento.lat,evento.lon);if(!p)return null;
      const r=evento.raio/180*500,rx=r/Math.max(.4,Math.cos(evento.lat*Math.PI/180));
      return <g key={evento.id} opacity={Math.min(1,evento.opacidade*evento.intensidade)} mask={evento.tipo==='tsunami'?`url(#agua-${id})`:undefined}>
        {[-1000,0,1000].map(copia=><g key={copia} transform={`translate(${p.x*10+copia} ${p.y*5}) scale(${rx/r} 1)`}>
          {evento.tipo==='tsunami'?<g fill="none" stroke="#bbf3ff" strokeWidth="1.8">{[0,.15,.30].map(fase=><circle key={fase} r={r*Math.max(.06,evento.progresso-fase+.10)} opacity={.95-fase} />)}</g>:<g>
            <ellipse rx={r} ry={r*.78} fill={`url(#nuvem-${id})`}/>
            {evento.tipo==='ciclone'?<g transform={`rotate(${evento.progresso*440})`} fill="none" stroke="#d2e5ed" strokeWidth="4" opacity=".76">{[0,90,180,270].map(angulo=><path key={angulo} transform={`rotate(${angulo})`} d={`M ${r*.10} 0 C ${r*.45} ${-r*.15} ${r*.80} ${r*.45} ${r*.37} ${r*.80}`}/>)}<circle r={r*.09} fill="#263947" strokeWidth="1"/></g>:<g stroke="#8ebcda" strokeWidth="1.3" opacity=".8">{Array.from({length:12},(_,i)=><path key={i} d={`M ${-r*.55+(i%6)*r*.2} ${Math.floor(i/6)*r*.26-r*.14} l ${-r*.10} ${r*.24}`}/>)}</g>}
          </g>}
          {raios&&evento.tipo!=='tsunami'&&<path d={`M ${r*.05} ${-r*.22} l ${-r*.16} ${r*.27} h ${r*.18} l ${-r*.12} ${r*.30}`} fill="none" stroke="#e9f4ff" strokeWidth="3" opacity={Math.pow(Math.max(0,Math.sin(evento.progresso*18*Math.PI)),35)*.85}/>}
          {selecionado===evento.id&&<circle r={r*1.08} fill="none" stroke="#ffd38a" strokeWidth="1.7" strokeDasharray="4 3"/>}
        </g>)}
      </g>;
    })}
  </svg>;
}
