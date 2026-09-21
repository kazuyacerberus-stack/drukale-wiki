'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/db';
import { pontuar, type Busca, type IndiceRegra, type Regra } from '../lib/regras';
import Realce from './Realce';
import RegraEditor from './RegraEditor';
import RegraInteracao from './RegraInteracao';
import RegraTexto from './RegraTexto';

const CHAVE_FONTE = 'regras-fonte';
type Cont = { ideias: number; perguntas: number; pendentes: number };
const ZERO: Cont = { ideias: 0, perguntas: 0, pendentes: 0 };

/**
 * Um documento de regras inteiro, num bloco só: todas as seções em sequência.
 * Com busca ativa mostra apenas os trechos que batem, cada um sob o título da
 * sua seção, e dá pra ver o documento inteiro num clique.
 */
export default function DocLeitor({
  doc, secoes, docs, consulta, termoBuscado, indice, ehAdmin, userId, editando, focoSecao,
  onEditar, onSalvo, onApagado, onPendentes, onFocoFeito,
}: {
  doc: { doc_ordem: number; doc: string };
  secoes: Regra[];
  docs: { doc_ordem: number; doc: string }[];
  consulta: Busca;
  termoBuscado: string;
  indice: Map<string, IndiceRegra>;
  ehAdmin: boolean;
  userId: string | null;
  editando: string | null;
  focoSecao: string | null;
  onEditar: (id: string | null) => void;
  onSalvo: (r: Regra) => void;
  onApagado: (id: string) => void;
  onPendentes: (regraId: string, pendentes: number) => void;
  onFocoFeito: () => void;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const [fonte, setFonte] = useState(1);
  const [copiado, setCopiado] = useState(false);
  const [contagens, setContagens] = useState<Map<string, Cont>>(new Map());
  const [inteira, setInteira] = useState(false);
  const [total, setTotal] = useState(0);
  const [atual, setAtual] = useState(-1);

  const buscando = consulta.agulhas.length > 0;
  const filtrando = buscando && !inteira;
  const achadas = secoes.filter((s) => { const ix = indice.get(s.id); return ix ? pontuar(ix, consulta) !== null : false; });
  const visiveis = filtrando && achadas.length ? achadas : secoes;
  const chaveIds = secoes.map((s) => s.id).join(',');

  useEffect(() => {
    try { const v = Number(window.localStorage.getItem(CHAVE_FONTE)); if ([0, 1, 2].includes(v)) setFonte(v); } catch { /* sem armazenamento: usa o padrão */ }
  }, []);

  const mudarFonte = (delta: number) => {
    const n = Math.min(2, Math.max(0, fonte + delta));
    setFonte(n);
    try { window.localStorage.setItem(CHAVE_FONTE, String(n)); } catch { /* ignora */ }
  };

  // contagens de ideias e perguntas de todas as seções, em duas consultas só
  useEffect(() => {
    const ids = chaveIds ? chaveIds.split(',') : [];
    if (!ids.length) return;
    let vivo = true;
    Promise.all([
      supabase.from('regra_comentarios').select('regra_id').in('regra_id', ids),
      supabase.from('regra_perguntas').select('regra_id,resposta').in('regra_id', ids),
    ]).then(([c, p]) => {
      if (!vivo) return;
      const m = new Map<string, Cont>();
      const pega = (id: string) => m.get(id) ?? ZERO;
      for (const r of (c.data ?? []) as { regra_id: string }[]) m.set(r.regra_id, { ...pega(r.regra_id), ideias: pega(r.regra_id).ideias + 1 });
      for (const r of (p.data ?? []) as { regra_id: string; resposta: string | null }[]) {
        const g = pega(r.regra_id);
        m.set(r.regra_id, { ...g, perguntas: g.perguntas + 1, pendentes: g.pendentes + (r.resposta ? 0 : 1) });
      }
      setContagens(m);
    });
    return () => { vivo = false; };
  }, [chaveIds]);

  const mudar = (id: string, patch: (c: Cont) => Cont) => setContagens((prev) => new Map(prev).set(id, patch(prev.get(id) ?? ZERO)));

  // nova busca: volta a mostrar só os trechos
  useEffect(() => { setInteira(false); }, [consulta]);

  // conta os trechos grifados sempre que a busca ou o modo mudam
  useEffect(() => {
    setAtual(-1);
    setTotal(raiz.current?.querySelectorAll('mark.regra-marca').length ?? 0);
  }, [consulta, inteira, doc.doc_ordem]);

  // clicou num trecho da busca: leva até a seção
  useEffect(() => {
    if (!focoSecao) return;
    document.getElementById(`sec-${focoSecao}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onFocoFeito();
  }, [focoSecao, onFocoFeito]);

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
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#d${doc.doc_ordem}`);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1600);
    } catch { /* navegador sem permissão de área de transferência */ }
  };

  return (
    <div ref={raiz} className={`regra-painel fonte-${fonte}`}>
      <article className="regra-bloco">
        <div className="regras-topo">
          <div>
            <p className="regras-doc">{secoes.length} {secoes.length === 1 ? 'seção' : 'seções'}</p>
            <h2>{doc.doc}</h2>
          </div>
          <div className="regras-ferramentas">
            <button type="button" className="mini-btn" onClick={() => mudarFonte(-1)} disabled={fonte === 0} title="diminuir o texto" aria-label="Diminuir o texto">A−</button>
            <button type="button" className="mini-btn" onClick={() => mudarFonte(1)} disabled={fonte === 2} title="aumentar o texto" aria-label="Aumentar o texto">A+</button>
            <button type="button" className="mini-btn" onClick={copiarLink} title="copiar o link deste documento">{copiado ? '✓ copiado' : '🔗 link'}</button>
            {!filtrando && secoes.length > 4 && (
              <select
                className="regras-ir-para"
                value=""
                aria-label="Ir para uma seção"
                onChange={(e) => { document.getElementById(`sec-${e.target.value}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
              >
                <option value="" disabled>ir para…</option>
                {secoes.map((s) => <option key={s.id} value={s.id}>{s.titulo}</option>)}
              </select>
            )}
          </div>
        </div>

        {buscando && (
          <div className="regras-achados" role="status">
            {total > 0 ? (
              <>
                <span>{total} {total === 1 ? 'trecho' : 'trechos'} de “{termoBuscado}”{atual >= 0 ? ` · ${atual + 1} de ${marcasVisiveis().length}` : ''}</span>
                <button type="button" className="mini-btn" onClick={() => irParaTrecho(-1)} aria-label="Trecho anterior">▲</button>
                <button type="button" className="mini-btn" onClick={() => irParaTrecho(1)} aria-label="Próximo trecho">▼</button>
                <button type="button" className="mini-btn" onClick={() => setInteira((v) => !v)}>{inteira ? 'só os trechos' : 'ver documento inteiro'}</button>
              </>
            ) : (
              <span>este documento não tem essas palavras</span>
            )}
          </div>
        )}

        {visiveis.map((s) => {
          const c = contagens.get(s.id) ?? ZERO;
          return (
            <section className="regra-sec" id={`sec-${s.id}`} key={s.id}>
              {editando === s.id ? (
                <RegraEditor regra={s} docs={docs} onCancelar={() => onEditar(null)} onSalvo={onSalvo} onApagado={onApagado} />
              ) : (
                <>
                  <div className="regra-sec-topo">
                    <h3><Realce texto={s.titulo} agulhas={consulta.agulhas} /></h3>
                    {ehAdmin && <button type="button" className="mini-btn" onClick={() => onEditar(s.id)}>✎ editar</button>}
                  </div>
                  <RegraTexto texto={s.conteudo} destaque={consulta.agulhas} soTrechos={filtrando} />
                  <RegraInteracao
                    regraId={s.id}
                    userId={userId}
                    ehAdmin={ehAdmin}
                    ideias={c.ideias}
                    perguntas={c.perguntas}
                    pendentes={c.pendentes}
                    onIdeias={(d) => mudar(s.id, (x) => ({ ...x, ideias: Math.max(0, x.ideias + d) }))}
                    onPerguntas={(tot, pend) => { mudar(s.id, (x) => ({ ...x, perguntas: tot, pendentes: pend })); onPendentes(s.id, pend); }}
                  />
                </>
              )}
            </section>
          );
        })}
      </article>
    </div>
  );
}
