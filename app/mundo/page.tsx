'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import '../matrix.css';
import './atlas.css';

const Mundo = dynamic(() => import('../components/Mundo'), {
  ssr: false,
  loading: () => <div className="mundo"><div className="palco"><div className="mundo-aviso" role="status"><div className="load"><span /><span /><span /></div><p>Abrindo o atlas…</p></div></div></div>,
});

export default function MundoPage() {
  const pagina = useRef<HTMLElement>(null);
  const [telaCheia,setTelaCheia]=useState(false);
  const [podeAmpliar,setPodeAmpliar]=useState(false);
  const [aviso,setAviso]=useState('');
  useEffect(()=>{
    setPodeAmpliar(!!document.fullscreenEnabled);
    const atualizar=()=>setTelaCheia(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange',atualizar);
    return ()=>document.removeEventListener('fullscreenchange',atualizar);
  },[]);
  const ampliar=async()=>{
    setAviso('');
    try { if(document.fullscreenElement) await document.exitFullscreen(); else await pagina.current?.requestFullscreen(); }
    catch { setAviso('O navegador não permitiu ampliar. O mapa continua ocupando toda a aba.'); }
  };
  return <main className="term gotico atlas-page" ref={pagina}>
    <header className="atlas-cabecalho">
      <Link className="atlas-marca" href="/" aria-label="Terra Save, voltar ao início">
        <svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="14"/><path d="M20 1v38M1 20h38M20 8l4 12-4 12-4-12zM8 8l8 8M24 24l8 8M8 32l8-8M24 16l8-8"/></svg>
        <span>Terra Save<small>Atlas do mundo</small></span>
      </Link>
      <h1 className="atlas-sr">Mapa de Terra Save</h1>
      <nav aria-label="Ações do atlas" className="atlas-acoes-topo">
        <details className="atlas-ajuda"><summary aria-label="Ajuda de navegação">?</summary><div><strong>Explore o mundo</strong><p>Arraste para mover. Use a roda do mouse ou os botões + e − para aproximar.</p><p>No mapa, use as setas e as teclas + e −. No celular, arraste com um dedo e faça pinça com dois.</p><p>Abra Locais para buscar um território ou Ambiente para controlar os fenômenos.</p></div></details>
        {podeAmpliar&&<button type="button" onClick={ampliar} aria-pressed={telaCheia} aria-label={telaCheia?'Sair da tela cheia':'Tela cheia'}><span aria-hidden="true">⛶</span><span className="atlas-tela-cheia-text">{telaCheia?'Sair da tela cheia':'Tela cheia'}</span></button>}
        <Link href="/" aria-label="Voltar ao site"><span className="atlas-link-long">← Voltar ao site</span><span className="atlas-link-short" aria-hidden="true">←</span></Link>
      </nav>
    </header>
    <p className="atlas-sr" id="atlas-instrucoes">Mapa interativo. Arraste para navegar, use a roda ou as teclas mais e menos para zoom. Use as setas para mover a vista. Locais e Ambiente oferecem alternativas por botões.</p>
    {aviso&&<p className="atlas-aviso" role="status">{aviso}</p>}
    <Mundo />
  </main>;
}
