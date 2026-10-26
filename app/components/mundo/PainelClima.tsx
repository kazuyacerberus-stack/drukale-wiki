import { NOMES_CLIMA, TIPOS_CLIMA, nomeRegiao, type Fenomeno } from './clima';
import type { useClima } from './useClima';

export default function PainelClima({ controle, locais, qualidade, setQualidade, observar, fechar, emEdicao, em3D }: {
  controle: ReturnType<typeof useClima>;
  locais: {nome:string;lat:number;lon:number}[];
  qualidade:string;setQualidade:(valor:string)=>void;
  observar:(evento:Fenomeno)=>void;fechar:()=>void;emEdicao:boolean;em3D:boolean;
}) {
  return <aside className="atlas-ambiente" id="atlas-ambiente" aria-labelledby="atlas-ambiente-titulo">
    <header><div><span className="atlas-sobre">Simulação ambiental</span><h2 id="atlas-ambiente-titulo">Um mundo em movimento</h2></div><button type="button" onClick={fechar} aria-label="Fechar ambiente">×</button></header>
    <p>Fenômenos aleatórios surgem e evoluem em diferentes regiões do mapa.</p>
    <label className="atlas-interruptor"><span>Fenômenos aleatórios</span><input type="checkbox" checked={controle.ativo} onChange={e=>controle.setAtivo(e.target.checked)}/></label>
    <fieldset disabled={!controle.ativo}><legend>Fenômenos</legend><div className="atlas-tipos-clima">{TIPOS_CLIMA.map(tipo=><label key={tipo}><input type="checkbox" checked={controle.tipos.includes(tipo)} onChange={()=>controle.alternarTipo(tipo)}/><span>{NOMES_CLIMA[tipo]}s</span></label>)}</div>
      <label className="atlas-intensidade">Intensidade <span>{Math.round(controle.intensidade*100)}%</span><input type="range" min="0.35" max="1.25" step="0.05" value={controle.intensidade} onChange={e=>controle.setIntensidade(Number(e.target.value))}/></label>
      <label className="atlas-check"><input type="checkbox" checked={controle.raios} onChange={e=>controle.setRaios(e.target.checked)}/>Relâmpagos suaves</label>
      <div className="atlas-ambiente-acoes"><button type="button" onClick={()=>controle.setPausado(p=>!p)}>{controle.pausado?'▶ Continuar':'Ⅱ Pausar'}</button><button type="button" onClick={controle.sortear}>↻ Novo sorteio</button></div>
    </fieldset>
    <div className="atlas-eventos-topo"><h3>Regiões ativas</h3><span>{!controle.ativo?'Desativado':controle.pausado?'Pausado':`${controle.eventos.length} fenômenos`}</span></div>
    <ul className="atlas-eventos">{controle.eventos.map(evento=><li key={evento.id}><button type="button" disabled={emEdicao} onClick={()=>observar(evento)} aria-label={`Observar ${NOMES_CLIMA[evento.tipo]}: ${nomeRegiao(evento,locais)}`}><span className={`atlas-evento-icone ${evento.tipo}`} aria-hidden="true">{evento.tipo==='tsunami'?'≈':evento.tipo==='ciclone'?'◉':'☁'}</span><span><strong>{NOMES_CLIMA[evento.tipo]}</strong><small>{nomeRegiao(evento,locais)}</small></span><span aria-hidden="true">↗</span></button></li>)}</ul>
    {controle.ativo&&!controle.tipos.length&&<p role="status">Selecione pelo menos um tipo de fenômeno.</p>}
    <label className="atlas-qualidade">Detalhamento 3D<select value={qualidade} disabled={!em3D} title={em3D?'Ajustar o detalhamento do globo':'Disponível quando o navegador permite o globo 3D'} onChange={e=>setQualidade(e.target.value)}><option value="leve">Leve</option><option value="equilibrada">Equilibrado</option><option value="alta">Alto</option></select></label>
  </aside>;
}
