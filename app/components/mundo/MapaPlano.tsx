'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { projetarMapaPlano } from '../../lib/cartografia';
import { coordenadaLegivel, tipoDe, type Local } from '../../lib/mundo';
import FenomenosPlano from './FenomenosPlano';
import type { Fenomeno } from './clima';

export default function MapaPlano({ mapa, mascara, locais, selecionado, onSelecionar, eventos, climaSelecionado, foco, reset, raios }: {
  mapa: HTMLCanvasElement | null;
  mascara: HTMLCanvasElement | null;
  locais: Local[];
  selecionado: string | null;
  onSelecionar: (local: Local) => void;
  eventos: Fenomeno[];
  climaSelecionado:string|null;
  foco:{lat:number;lon:number;chave:number;zoom?:number}|null;
  reset:number;
  raios:boolean;
}) {
  const tela = useRef<HTMLCanvasElement>(null);
  const janela=useRef<HTMLDivElement>(null);
  const [vista,setVista]=useState({zoom:1,x:0,y:0});
  const toques=useRef(new Map<number,{x:number;y:number}>());
  const arrasto=useRef({x:0,y:0,pinca:0});
  const limitar=useCallback((v:typeof vista)=>{
    const w=janela.current?.clientWidth??1,h=janela.current?.clientHeight??1;
    const maxX=Math.max(0,(w*v.zoom-w)/2),maxY=Math.max(0,(w*.5*v.zoom-h)/2);
    return {zoom:Math.max(1,Math.min(5,v.zoom)),x:Math.max(-maxX,Math.min(maxX,v.x)),y:Math.max(-maxY,Math.min(maxY,v.y))};
  },[]);
  const zoom=(fator:number)=>setVista(v=>limitar({...v,zoom:Math.max(1,Math.min(5,v.zoom*fator))}));
  useEffect(()=>{
    const ajustar=()=>{const w=janela.current?.clientWidth??1,h=janela.current?.clientHeight??1;setVista({zoom:Math.max(1,Math.min(5,h/(w*.5))),x:0,y:0});};
    ajustar();
    const observador=new ResizeObserver(ajustar);if(janela.current)observador.observe(janela.current);
    return ()=>observador.disconnect();
  },[reset]);
  useEffect(()=>{
    if(!foco||!janela.current)return;
    const p=projetarMapaPlano(foco.lat,foco.lon);if(!p)return;
    const w=janela.current.clientWidth,z=foco.zoom??2.5;
    setVista(limitar({zoom:z,x:-(p.x/100-.5)*w*z,y:-(p.y/100-.5)*w*.5*z}));
  },[foco,limitar]);
  const descer=(e:PointerEvent<HTMLDivElement>)=>{
    if((e.target as HTMLElement).closest('button'))return;
    toques.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    arrasto.current={x:e.clientX,y:e.clientY,pinca:0};e.currentTarget.setPointerCapture(e.pointerId);
  };
  const mover=(e:PointerEvent<HTMLDivElement>)=>{
    if(!toques.current.has(e.pointerId))return;
    toques.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const pontos=[...toques.current.values()];
    if(pontos.length>1){
      const d=Math.hypot(pontos[0].x-pontos[1].x,pontos[0].y-pontos[1].y);
      if(arrasto.current.pinca)zoom(d/arrasto.current.pinca);
      arrasto.current.pinca=d;
    }else{const dx=e.clientX-arrasto.current.x,dy=e.clientY-arrasto.current.y;setVista(v=>limitar({...v,x:v.x+dx,y:v.y+dy}));}
    arrasto.current.x=e.clientX;arrasto.current.y=e.clientY;
  };
  const subir=(e:PointerEvent<HTMLDivElement>)=>{
    toques.current.delete(e.pointerId);arrasto.current.pinca=0;
    const restante=[...toques.current.values()][0];if(restante){arrasto.current.x=restante.x;arrasto.current.y=restante.y;}
  };
  useEffect(() => {
    const canvas = tela.current;
    if (!canvas || !mapa) return;
    canvas.width = mapa.width;
    canvas.height = mapa.height;
    canvas.getContext('2d')?.drawImage(mapa, 0, 0);
  }, [mapa]);

  return (
    <section className="mapa-plano" aria-label="Mapa 2D dos locais de Terra Save">
      <div className="mapa-plano-janela" ref={janela} tabIndex={0} role="region" aria-label="Navegar no mapa 2D" aria-describedby="atlas-instrucoes"
        onPointerDown={descer} onPointerMove={mover} onPointerUp={subir} onPointerCancel={subir}
        onWheel={e=>{e.stopPropagation();zoom(Math.exp(-e.deltaY*.0015));}}
        onKeyDown={e=>{if(e.target!==e.currentTarget)return;const k=e.key;if(!['+','=','-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(k))return;e.preventDefault();if(k==='+'||k==='=')zoom(1.2);else if(k==='-')zoom(1/1.2);else if(k==='Home')setVista({zoom:1,x:0,y:0});else setVista(v=>limitar({...v,x:v.x+(k==='ArrowLeft'?50:k==='ArrowRight'?-50:0),y:v.y+(k==='ArrowUp'?50:k==='ArrowDown'?-50:0)}));}}>
      <div className="mapa-plano-superficie" style={{transform:`translate(${vista.x}px,calc(-50% + ${vista.y}px)) scale(${vista.zoom})`,'--zoom-plano':vista.zoom} as CSSProperties}>
        <canvas ref={tela} aria-hidden="true" />
        <FenomenosPlano eventos={eventos} mascara={mascara} selecionado={climaSelecionado} raios={raios}/>
        {locais.map((local) => {
          const ponto = projetarMapaPlano(local.lat, local.lon);
          if (!ponto) return null;
          const tipo = tipoDe(local.tipo);
          return (
            <button key={local.id} type="button" className={`mapa-plano-local${local.id === selecionado ? ' on' : ''}`}
              style={{ left: `${ponto.x}%`, top: `${ponto.y}%`, color: tipo.cor,transform:`translate(-50%,-50%) scale(${1/vista.zoom})` }}
              aria-label={`${local.nome}, ${tipo.rotulo}, ${coordenadaLegivel(local.lat, local.lon)}`}
              aria-pressed={local.id === selecionado}
              title={`${local.nome} · ${tipo.rotulo}`}
              onClick={() => onSelecionar(local)}>
              <span aria-hidden="true">●</span>
              <span className={`mapa-plano-local-nome${ponto.x > 75 ? ' nome-a-direita' : ponto.x < 25 ? ' nome-a-esquerda' : ''}`} aria-hidden="true">{local.nome}</span>
            </button>
          );
        })}
      </div>
      </div>
      <div className="atlas-zoom-plano" role="group" aria-label="Zoom do mapa 2D"><button type="button" onClick={()=>zoom(1.25)} aria-label="Aproximar mapa 2D">+</button><button type="button" onClick={()=>zoom(1/1.25)} aria-label="Afastar mapa 2D">−</button><button type="button" onClick={()=>setVista({zoom:1,x:0,y:0})} aria-label="Ver mundo inteiro">⊙</button></div>
      <p className="atlas-modo-plano">Mapa 2D · arraste para explorar<small>Locais em órbita são projetados na superfície.</small></p>
      {!mapa && <p role="status">A imagem do mapa não ficou disponível. A lista de locais continua acessível.</p>}
    </section>
  );
}
