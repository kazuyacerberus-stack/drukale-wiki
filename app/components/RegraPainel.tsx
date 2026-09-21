'use client';

import { useEffect, useRef, useState } from 'react';
import type { Regra } from '../lib/regras';
import RegraTexto from './RegraTexto';
import RegraInteracao from './RegraInteracao';

const CHAVE_FONTE = 'regras-fonte';

/** Painel de leitura de uma regra: leitura confortável, navegação entre trechos achados e entre regras. */
export default function RegraPainel({
  regra, anterior, proxima, destaque, termoBuscado, ehAdmin, userId, onEditar, onSelecionar, onPendentes,
}: {
  regra: Regra;
  anterior: Regra | null;
  proxima: Regra | null;
  destaque: string[];
  termoBuscado: string;
  ehAdmin: boolean;
  userId: string | null;
  onEditar: () => void;
  onSelecionar: (id: string) => void;
  onPendentes?: (regraId: string, pendentes: number) => void;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const [fonte, setFonte] = useState(1);
  const [copiado, setCopiado] = useState(false);
  const [total, setTotal] = useState(0);
  const [atual, setAtual] = useState(-1);
  const [inteira, setInteira] = useState(false);

  useEffect(() => {
    try { const v = Number(window.localStorage.getItem(CHAVE_FONTE)); if ([0, 1, 2].includes(v)) setFonte(v); } catch { /* sem armazenamento: usa o padrão */ }
  }, []);

  const mudarFonte = (delta: number) => {
    const n = Math.min(2, Math.max(0, fonte + delta));
    setFonte(n);
    try { window.localStorage.setItem(CHAVE_FONTE, String(n)); } catch { /* ignora */ }
  };

  // nova regra ou nova busca: volta a mostrar só os trechos
  useEffect(() => { setInteira(false); }, [regra.id, destaque]);

  // conta os trechos grifados sempre que a regra, a busca ou o modo mudam
  useEffect(() => {
    setAtual(-1);
    setTotal(raiz.current?.querySelectorAll('mark.regra-marca').length ?? 0);
  }, [regra.id, destaque, inteira]);

  const marcasVisiveis = () => [...(raiz.current?.querySelectorAll<HTMLElement>('mark.regra-marca') ?? [])].filter((m) => m.offsetParent !== null);

  const irParaTrecho = (delta: number) => {
    const marcas = marcasVisiveis();
    if (!marcas.length) return;
    const proximo = (atual + delta + marcas.length) % marcas.length;
    marcas.forEach((m) => m.classList.remove('atual'));
    marcas[proximo].classList.add('atual');
    marcas[proximo].scrollIntoView({ behavior: 'smooth', block: 'center' });
    setAtual(proximo);
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#${regra.id}`);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1600);
    } catch { /* navegador sem permissão de área de transferência */ }
  };

  return (
    <div ref={raiz} className={`regra-painel fonte-${fonte}`}>
     <article className="regra-bloco">
      <div className="regras-topo">
        <div>
          <p className="regras-doc">{regra.doc}</p>
          <h2>{regra.titulo}</h2>
        </div>
        <div className="regras-ferramentas">
          <button type="button" className="mini-btn" onClick={() => mudarFonte(-1)} disabled={fonte === 0} title="diminuir o texto" aria-label="Diminuir o texto">A−</button>
          <button type="button" className="mini-btn" onClick={() => mudarFonte(1)} disabled={fonte === 2} title="aumentar o texto" aria-label="Aumentar o texto">A+</button>
          <button type="button" className="mini-btn" onClick={copiarLink} title="copiar o link desta regra">{copiado ? '✓ copiado' : '🔗 link'}</button>
          {ehAdmin && <button type="button" className="mini-btn" onClick={onEditar}>✎ editar</button>}
        </div>
      </div>

      {destaque.length > 0 && (
        <div className="regras-achados" role="status">
          {total > 0 ? (
            <>
              <span>{total} {total === 1 ? 'trecho' : 'trechos'} de “{termoBuscado}”{atual >= 0 ? ` · ${atual + 1} de ${marcasVisiveis().length}` : ''}</span>
              <button type="button" className="mini-btn" onClick={() => irParaTrecho(-1)} aria-label="Trecho anterior">▲</button>
              <button type="button" className="mini-btn" onClick={() => irParaTrecho(1)} aria-label="Próximo trecho">▼</button>
              <button type="button" className="mini-btn" onClick={() => setInteira((v) => !v)}>{inteira ? 'só os trechos' : 'ver regra inteira'}</button>
            </>
          ) : (
            <span>o texto desta regra não tem essas palavras — só o título bate</span>
          )}
        </div>
      )}

      <RegraTexto key={`texto-${regra.id}`} texto={regra.conteudo} destaque={destaque} soTrechos={destaque.length > 0 && !inteira} />
      <p className="regras-atualizada">atualizada em {new Date(regra.updated_at).toLocaleDateString('pt-BR')}</p>

      <RegraInteracao key={`interacao-${regra.id}`} regraId={regra.id} userId={userId} ehAdmin={ehAdmin} onPendentes={onPendentes} />
     </article>

      {(anterior || proxima) && (
        <nav className="regras-vaivem" aria-label="Regras vizinhas">
          {anterior ? <button type="button" onClick={() => onSelecionar(anterior.id)}><small>← anterior</small><span>{anterior.titulo}</span></button> : <span />}
          {proxima ? <button type="button" className="dir" onClick={() => onSelecionar(proxima.id)}><small>próxima →</small><span>{proxima.titulo}</span></button> : <span />}
        </nav>
      )}
    </div>
  );
}
