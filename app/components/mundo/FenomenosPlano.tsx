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
    <defs><mask id={`agua-${id}`}>{agua&&<image href={agua} width="1000" height="500"/>}</mask><pattern id={`chuva-${id}`} width="7" height="7" patternUnits="userSpaceOnUse"><path d="M 1 6 l 2 -4 M 6 8 l 2 -4" stroke="#596f6b" strokeWidth=".65" opacity=".4"/></pattern></defs>
    {eventos.map(evento=>{
      const p=projetarMapaPlano(evento.lat,evento.lon);if(!p)return null;
      const r=evento.raio/180*500,rx=r/Math.max(.4,Math.cos(evento.lat*Math.PI/180));
      return <g key={evento.id} opacity={Math.min(1,evento.opacidade*evento.intensidade)} mask={evento.tipo==='tsunami'?`url(#agua-${id})`:undefined}>
        {[-1000,0,1000].map(copia=><g key={copia} transform={`translate(${p.x*10+copia} ${p.y*5}) scale(${rx/r} 1)`}>
          {evento.tipo==='tsunami'?<g fill="none" stroke="#365f5c" strokeWidth=".8">{[0,.15,.30].map(fase=><g key={fase} opacity={.9-fase}><circle r={r*Math.max(.06,evento.progresso-fase+.10)} /><circle r={r*Math.max(.05,evento.progresso-fase+.07)} stroke="#d7dfc7" strokeWidth=".9"/></g>)}</g>:<g>
            <ellipse rx={r} ry={r*.78} fill="#66756014"/>
            <ellipse rx={r*.90} ry={r*.68} fill={`url(#chuva-${id})`}/>
            {evento.tipo==='ciclone'?<g transform={`rotate(${evento.progresso*440})`} fill="none" stroke="#465e55" strokeWidth="1" opacity=".87">{[0,90,180,270].map(angulo=><g key={angulo} transform={`rotate(${angulo})`}><path d={`M ${r*.08} 0 C ${r*.45} ${-r*.22} ${r*.90} ${r*.45} ${r*.37} ${r*.82}`}/><path d={`M ${r*.15} ${r*.03} C ${r*.51} ${-r*.08} ${r*.70} ${r*.49} ${r*.30} ${r*.72}`} strokeWidth=".45"/></g>)}<circle r={r*.09} fill="#e5dfbb" strokeWidth=".7"/></g>:<g stroke="#5c6e65" strokeWidth=".7" fill="#e4dfc2cc">
              <path d={`M ${-r*.62} ${-r*.1} C ${-r*.9} ${-r*.38} ${-r*.56} ${-r*.7} ${-r*.29} ${-r*.5} C ${-r*.32} ${-r*.91} ${r*.27} ${-r*.93} ${r*.38} ${-r*.55} C ${r*.8} ${-r*.71} ${r*.96} ${-r*.12} ${r*.55} ${-r*.09} Q 0 ${r*.08} ${-r*.62} ${-r*.1} Z`}/>
              <path d={`M ${-r*.38} ${-r*.43} Q ${-r*.14} ${-r*.55} ${r*.02} ${-r*.34} M ${r*.21} ${-r*.54} Q ${r*.42} ${-r*.54} ${r*.47} ${-r*.32}`} fill="none" strokeWidth=".45"/>
              <g fill="none" stroke="#496e6b" strokeWidth=".75">{Array.from({length:12},(_,i)=><path key={i} d={`M ${-r*.55+(i%6)*r*.2} ${Math.floor(i/6)*r*.26+r*.09} l ${-r*.10} ${r*.24}`}/>)}</g>
            </g>}
          </g>}
          {raios&&evento.tipo!=='tsunami'&&<path d={`M ${r*.05} ${-r*.22} l ${-r*.16} ${r*.27} h ${r*.18} l ${-r*.12} ${r*.30}`} fill="none" stroke="#9e7539" strokeWidth="1.5" opacity={Math.pow(Math.max(0,Math.sin(evento.progresso*18*Math.PI)),35)*.85}/>}
          {selecionado===evento.id&&<circle r={r*1.08} fill="none" stroke="#965935" strokeWidth=".9" strokeDasharray="2.5 2"/>}
        </g>)}
      </g>;
    })}
  </svg>;
}
