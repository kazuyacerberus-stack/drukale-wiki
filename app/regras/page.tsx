'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import '../matrix.css';
import PrecisaAprovacao from '../components/PrecisaAprovacao';
import Realce from '../components/Realce';
import RegraEditor from '../components/RegraEditor';
import DocLeitor from '../components/DocLeitor';
import { useBeep } from '../components/useBeep';
import BotaoSom from '../components/BotaoSom';
import { supabase } from '../lib/db';
import { indexarRegra, interpretarBusca, mensagemRegra, pontuar, trecho, type Regra } from '../lib/regras';

const ordenar = (lista: Regra[]) => [...lista].sort((a, b) => a.doc_ordem - b.doc_ordem || a.ordem - b.ordem);

export default function RegrasPage() {
  const { beep, muted, setMuted } = useBeep();

  return (
    <div className="term drukale">
      <main className="wrap">
       <PrecisaAprovacao>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">terrasave://arquivo/regras</span>
            <div className="hd-act">
              <BotaoSom muted={muted} setMuted={setMuted} beep={beep} />
              <Link className="ico" href="/">← início</Link>
              <Link className="ico" href="/mundo">mapa</Link>
              <Link className="ico" href="/personagens">personagens</Link>
              <Link className="ico" href="/eventos">história</Link>
            </div>
          </div>

          <h1 data-txt="REGRAS">REGRAS</h1>
          <p className="sub">&gt; o funcionamento do nosso RPG <span className="cur" /></p>
        </header>

        <RegrasConteudo />

        <footer className="ft">terrasave_system v1.0 // conexão segura estabelecida</footer>
       </PrecisaAprovacao>
      </main>
    </div>
  );
}


function RegrasConteudo() {
  const [regras, setRegras] = useState<Regra[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [selDoc, setSelDoc] = useState<number | null>(null);
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<'nova' | string | null>(null);
  const [focoSecao, setFocoSecao] = useState<string | null>(null);
  const [pendentes, setPendentes] = useState<Map<string, number>>(new Map());
  const campoBusca = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const [{ data: auth }, { data: admin }, { data, error }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc('drk_e_admin'),
        supabase.from('regras').select('*').order('doc_ordem').order('ordem'),
      ]);
      setUserId(auth.user?.id ?? null);
      setEhAdmin(admin === true);
      if (admin === true) {
        const { data: sem } = await supabase.from('regra_perguntas').select('regra_id').is('resposta', null);
        const m = new Map<string, number>();
        ((sem ?? []) as { regra_id: string }[]).forEach((x) => m.set(x.regra_id, (m.get(x.regra_id) ?? 0) + 1));
        setPendentes(m);
      }
      if (error) { setErro(mensagemRegra(error)); setCarregando(false); return; }
      const lista = ordenar((data ?? []) as Regra[]);
      setRegras(lista);
      // #d2 abre o documento 2; um id de seção (links antigos) abre o documento dela
      const hash = decodeURIComponent(window.location.hash.slice(1));
      const doHash = /^d\d+$/.test(hash) ? Number(hash.slice(1)) : lista.find((r) => r.id === hash)?.doc_ordem;
      setSelDoc(lista.find((r) => r.doc_ordem === doHash)?.doc_ordem ?? lista[0]?.doc_ordem ?? null);
      setCarregando(false);
    })();
  }, []);

  // "/" leva o cursor pro filtro, de qualquer ponto da página
  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (e.key !== '/' || alvo?.closest('input, textarea, select, [contenteditable]')) return;
      e.preventDefault();
      campoBusca.current?.focus();
    };
    document.addEventListener('keydown', aoTecla);
    return () => document.removeEventListener('keydown', aoTecla);
  }, []);

  const docs = useMemo(() => {
    const m = new Map<number, string>();
    regras.forEach((r) => { if (!m.has(r.doc_ordem)) m.set(r.doc_ordem, r.doc); });
    return [...m.entries()].map(([doc_ordem, doc]) => ({ doc_ordem, doc }));
  }, [regras]);

  // texto de cada seção sem marcação e sem acento, calculado uma vez pro filtro não pesar a cada tecla
  const indice = useMemo(() => new Map(regras.map((r) => [r.id, indexarRegra(r)])), [regras]);

  const consulta = useMemo(() => interpretarBusca(busca), [busca]);
  const buscando = consulta.agulhas.length > 0;

  /** Com busca: os documentos que têm o que foi digitado, do mais relevante pro menos, com as melhores seções. */
  const resultados = useMemo(() => {
    if (!buscando) return [];
    return docs
      .map((d) => {
        const achadas = regras
          .filter((r) => r.doc_ordem === d.doc_ordem)
          .map((r) => {
            const ix = indice.get(r.id);
            const p = ix ? pontuar(ix, consulta) : null;
            return p && ix ? { r, nota: p.nota, trechos: p.trechos, texto: trecho(ix, consulta) } : null;
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)
          .sort((a, b) => b.nota - a.nota);
        if (!achadas.length) return null;
        return { d, achadas, trechos: achadas.reduce((n, a) => n + a.trechos, 0), nota: achadas[0].nota };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.nota - a.nota);
  }, [regras, docs, indice, consulta, buscando]);

  const secoesDoc = (ordem: number) => regras.filter((r) => r.doc_ordem === ordem);
  const docAtual = docs.find((d) => d.doc_ordem === selDoc) ?? null;

  /** Troca só o documento exibido: a página, a lateral e a rolagem continuam onde estavam. */
  const selecionarDoc = (ordem: number, secaoId?: string) => {
    setSelDoc(ordem);
    setEditando(null);
    setFocoSecao(secaoId ?? null);
    window.history.replaceState(null, '', `#d${ordem}`);
    if (!secaoId && window.innerWidth <= 860) document.getElementById('regra-painel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const focoFeito = useCallback(() => setFocoSecao(null), []);

  /** O moderador respondeu (ou chegou pergunta nova): atualiza a marca na lateral. */
  const atualizarPendentes = useCallback((regraId: string, n: number) => setPendentes((prev) => {
    const novo = new Map(prev);
    if (n > 0) novo.set(regraId, n); else novo.delete(regraId);
    return novo;
  }), []);

  if (carregando) return <div className="load"><span /><span /><span /><p>abrindo o livro de regras...</p></div>;
  if (erro) return <p className="erro">FALHA :: {erro}</p>;

  return (
    <div className="regras-layout">
      <aside className="regras-lateral" aria-label="Documentos de regras">
        <div className="regras-busca-caixa">
          <input
            ref={campoBusca}
            className="regras-busca"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setBusca(''); }}
            placeholder='buscar palavra ou "frase exata"  ( / )'
            aria-label="Buscar nas regras"
          />
          {busca && <button type="button" className="regras-busca-limpar" onClick={() => { setBusca(''); campoBusca.current?.focus(); }} aria-label="Limpar a busca">×</button>}
        </div>
        <p className="regras-contagem">
          {buscando ? `${resultados.length} de ${docs.length} documentos` : `${docs.length} documentos · ${regras.length} seções`}
        </p>

        {buscando ? (
          resultados.length === 0 ? (
            <p className="vazio" style={{ padding: '20px 0' }}>
              nada tem tudo isso.<br />
              <small>use menos palavras ou entre aspas para achar uma frase exata.</small>
            </p>
          ) : (
            resultados.map(({ d, achadas, trechos }) => (
              <div key={d.doc_ordem} className={d.doc_ordem === selDoc ? 'regras-resultado on' : 'regras-resultado'}>
                <button type="button" className="regras-resultado-titulo" onClick={() => selecionarDoc(d.doc_ordem)} aria-current={d.doc_ordem === selDoc ? 'true' : undefined}>
                  <strong>{d.doc}</strong>
                  <small>{achadas.length} {achadas.length === 1 ? 'seção' : 'seções'} · {trechos} {trechos === 1 ? 'trecho' : 'trechos'}</small>
                </button>
                {achadas.slice(0, 3).map((a) => (
                  <button type="button" key={a.r.id} className="regras-resultado-trecho" onClick={() => selecionarDoc(d.doc_ordem, a.r.id)}>
                    <b><Realce texto={a.r.titulo} agulhas={consulta.agulhas} /></b>
                    <span><Realce texto={a.texto} agulhas={consulta.agulhas} /></span>
                  </button>
                ))}
                {achadas.length > 3 && <small className="regras-resultado-mais">+ {achadas.length - 3} {achadas.length - 3 === 1 ? 'seção' : 'seções'} neste documento</small>}
              </div>
            ))
          )
        ) : docs.length === 0 ? (
          <p className="vazio" style={{ padding: '20px 0' }}>nenhuma regra publicada ainda</p>
        ) : (
          docs.map((d) => {
            const secs = secoesDoc(d.doc_ordem);
            const pend = ehAdmin ? secs.reduce((n, r) => n + (pendentes.get(r.id) ?? 0), 0) : 0;
            return (
              <button
                type="button"
                key={d.doc_ordem}
                className={d.doc_ordem === selDoc ? 'regras-doc-item on' : 'regras-doc-item'}
                aria-current={d.doc_ordem === selDoc ? 'true' : undefined}
                onClick={() => selecionarDoc(d.doc_ordem)}
              >
                <strong>{d.doc}</strong>
                <small>{secs.length} {secs.length === 1 ? 'seção' : 'seções'}</small>
                {pend > 0 && <b className="regras-item-pendente" title="perguntas sem resposta">{pend}</b>}
              </button>
            );
          })
        )}

        {ehAdmin && (
          <button type="button" className="mini-btn" style={{ marginTop: 14, width: '100%' }} onClick={() => setEditando('nova')}>
            + nova seção
          </button>
        )}
      </aside>

      <section className="regras-conteudo" id="regra-painel">
        {editando === 'nova' ? (
          <RegraEditor
            regra={null}
            docs={docs}
            grupoInicial={selDoc ?? undefined}
            onCancelar={() => setEditando(null)}
            onApagado={() => setEditando(null)}
            onSalvo={(nova) => { setRegras((prev) => ordenar([...prev, nova])); setSelDoc(nova.doc_ordem); setFocoSecao(nova.id); setEditando(null); }}
          />
        ) : docAtual ? (
          <DocLeitor
            key={docAtual.doc_ordem}
            doc={docAtual}
            secoes={secoesDoc(docAtual.doc_ordem)}
            docs={docs}
            consulta={consulta}
            termoBuscado={busca.replace(/["“”]/g, '').trim()}
            indice={indice}
            ehAdmin={ehAdmin}
            userId={userId}
            editando={editando && editando !== 'nova' ? editando : null}
            focoSecao={focoSecao}
            onEditar={setEditando}
            onSalvo={(r) => { setRegras((prev) => ordenar(prev.map((x) => (x.id === r.id ? r : x)))); setEditando(null); }}
            onApagado={(id) => {
              const restantes = regras.filter((x) => x.id !== id);
              setRegras(restantes);
              if (!restantes.some((x) => x.doc_ordem === docAtual.doc_ordem)) setSelDoc(restantes[0]?.doc_ordem ?? null);
              setEditando(null);
            }}
            onPendentes={atualizarPendentes}
            onFocoFeito={focoFeito}
          />
        ) : (
          <p className="vazio">
            {ehAdmin
              ? 'ainda não há regras — rode o importar-regras.sql ou crie a primeira em "+ nova seção".'
              : 'as regras de Terra Save ainda serão publicadas aqui'}
          </p>
        )}
      </section>
    </div>
  );
}
