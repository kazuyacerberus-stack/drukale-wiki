'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import '../matrix.css';
import PrecisaAprovacao from '../components/PrecisaAprovacao';
import Realce from '../components/Realce';
import RegraEditor from '../components/RegraEditor';
import RegraPainel from '../components/RegraPainel';
import { useBeep } from '../components/useBeep';
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
              <button className="ico" onClick={() => { const n = !muted; setMuted(n); if (!n) beep('hover'); }} title={muted ? 'ativar som' : 'silenciar'}>
                {muted ? '♪ off' : '♪ on'}
              </button>
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
  const [selId, setSelId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [fechados, setFechados] = useState<Set<number>>(new Set());
  const [editando, setEditando] = useState<'nova' | string | null>(null);
  const campoBusca = useRef<HTMLInputElement>(null);
  const [pendentes, setPendentes] = useState<Set<string>>(new Set());
  const [soPendentes, setSoPendentes] = useState(false);

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
        setPendentes(new Set(((sem ?? []) as { regra_id: string }[]).map((x) => x.regra_id)));
      }
      if (error) { setErro(mensagemRegra(error)); setCarregando(false); return; }
      const lista = ordenar((data ?? []) as Regra[]);
      setRegras(lista);
      const doHash = decodeURIComponent(window.location.hash.slice(1));
      setSelId(lista.find((r) => r.id === doHash)?.id ?? lista[0]?.id ?? null);
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

  // texto de cada regra sem marcação e sem acento, calculado uma vez pro filtro não pesar a cada tecla
  const indice = useMemo(() => new Map(regras.map((r) => [r.id, indexarRegra(r)])), [regras]);

  const consulta = useMemo(() => interpretarBusca(busca), [busca]);
  const buscando = consulta.agulhas.length > 0;

  /** Com busca: só as regras que têm tudo o que foi digitado, da mais relevante pra menos. */
  const resultados = useMemo(() => {
    if (!buscando) return [];
    return regras
      .map((r, pos) => {
        const ix = indice.get(r.id);
        const p = ix ? pontuar(ix, consulta) : null;
        return p && ix ? { r, pos, nota: p.nota, trechos: p.trechos, texto: trecho(ix, consulta) } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.nota - a.nota || a.pos - b.pos);
  }, [regras, indice, consulta, buscando]);

  const base = soPendentes ? regras.filter((r) => pendentes.has(r.id)) : regras;
  const grupos = docs
    .map((d) => ({ ...d, itens: base.filter((r) => r.doc_ordem === d.doc_ordem) }))
    .filter((g) => g.itens.length > 0);

  const selecionada = regras.find((r) => r.id === selId) ?? null;

  // regra anterior/próxima: na ordem do livro, ou na ordem dos resultados quando há busca
  const sequencia = buscando ? resultados.map((x) => x.r) : regras;
  const posSeq = sequencia.findIndex((r) => r.id === selId);
  const anterior = posSeq > 0 ? sequencia[posSeq - 1] : null;
  const proxima = posSeq >= 0 && posSeq < sequencia.length - 1 ? sequencia[posSeq + 1] : null;

  /** Troca só a regra exibida: a página, a lateral e a rolagem continuam onde estavam. */
  const selecionar = (id: string) => {
    setSelId(id);
    setEditando(null);
    window.history.replaceState(null, '', `#${id}`);
    if (window.innerWidth <= 860) document.getElementById('regra-painel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /** O moderador respondeu (ou chegou pergunta nova): atualiza a marca na lateral. */
  const atualizarPendentes = (regraId: string, n: number) => setPendentes((prev) => {
    const novo = new Set(prev);
    if (n > 0) novo.add(regraId); else novo.delete(regraId);
    return novo;
  });

  const alternarGrupo = (ordem: number) => setFechados((prev) => { const n = new Set(prev); n.has(ordem) ? n.delete(ordem) : n.add(ordem); return n; });

  if (carregando) return <div className="load"><span /><span /><span /><p>abrindo o livro de regras...</p></div>;
  if (erro) return <p className="erro">FALHA :: {erro}</p>;

  return (
    <div className="regras-layout">
      <aside className="regras-lateral" aria-label="Filtro das regras">
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
          {buscando ? `${resultados.length} de ${regras.length} regras` : `${regras.length} regras`}
        </p>

        {ehAdmin && !buscando && (pendentes.size > 0 || soPendentes) && (
          <button type="button" className={soPendentes ? 'regras-pendentes on' : 'regras-pendentes'} onClick={() => setSoPendentes((v) => !v)}>
            ❓ {pendentes.size} {pendentes.size === 1 ? 'regra com pergunta' : 'regras com perguntas'} sem resposta{soPendentes ? ' · mostrar todas' : ''}
          </button>
        )}

        {buscando ? (
          resultados.length === 0 ? (
            <p className="vazio" style={{ padding: '20px 0' }}>
              nenhuma regra tem tudo isso.<br />
              <small>use menos palavras ou entre aspas para achar uma frase exata.</small>
            </p>
          ) : (
            resultados.map(({ r, trechos, texto }) => (
              <button
                type="button"
                key={r.id}
                className={r.id === selId ? 'regras-resultado on' : 'regras-resultado'}
                aria-current={r.id === selId ? 'true' : undefined}
                onClick={() => selecionar(r.id)}
              >
                <strong><Realce texto={r.titulo} agulhas={consulta.agulhas} /></strong>
                <small>{r.doc} · {trechos} {trechos === 1 ? 'trecho' : 'trechos'}</small>
                <span><Realce texto={texto} agulhas={consulta.agulhas} /></span>
              </button>
            ))
          )
        ) : grupos.length === 0 ? (
          <p className="vazio" style={{ padding: '20px 0' }}>nenhuma regra publicada ainda</p>
        ) : (
          grupos.map((g) => {
            const aberto = !fechados.has(g.doc_ordem);
            return (
              <div className="regras-grupo" key={g.doc_ordem}>
                <button type="button" className="regras-grupo-titulo" onClick={() => alternarGrupo(g.doc_ordem)} aria-expanded={aberto}>
                  <span>{aberto ? '▾' : '▸'}</span> {g.doc}
                </button>
                {aberto && g.itens.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    className={r.id === selId ? 'regras-item on' : 'regras-item'}
                    aria-current={r.id === selId ? 'true' : undefined}
                    onClick={() => selecionar(r.id)}
                  >
                    {r.titulo}
                    {ehAdmin && pendentes.has(r.id) && <b className="regras-item-pendente" title="tem pergunta sem resposta">?</b>}
                  </button>
                ))}
              </div>
            );
          })
        )}

        {ehAdmin && (
          <button type="button" className="mini-btn" style={{ marginTop: 14, width: '100%' }} onClick={() => setEditando('nova')}>
            + nova regra
          </button>
        )}
      </aside>

      <section className="regras-conteudo" id="regra-painel">
        {editando === 'nova' ? (
          <RegraEditor
            regra={null}
            docs={docs}
            onCancelar={() => setEditando(null)}
            onApagado={() => setEditando(null)}
            onSalvo={(nova) => { setRegras((prev) => ordenar([...prev, nova])); setSelId(nova.id); setEditando(null); }}
          />
        ) : selecionada && editando === selecionada.id ? (
          <RegraEditor
            key={selecionada.id}
            regra={selecionada}
            docs={docs}
            onCancelar={() => setEditando(null)}
            onSalvo={(r) => { setRegras((prev) => ordenar(prev.map((x) => (x.id === r.id ? r : x)))); setEditando(null); }}
            onApagado={(id) => {
              const restantes = regras.filter((x) => x.id !== id);
              setRegras(restantes); setSelId(restantes[0]?.id ?? null); setEditando(null);
            }}
          />
        ) : selecionada ? (
          <RegraPainel
            regra={selecionada}
            anterior={anterior}
            proxima={proxima}
            destaque={consulta.agulhas}
            termoBuscado={busca.replace(/["“”]/g, '').trim()}
            ehAdmin={ehAdmin}
            userId={userId}
            onEditar={() => setEditando(selecionada.id)}
            onSelecionar={selecionar}
            onPendentes={atualizarPendentes}
          />
        ) : (
          <p className="vazio">
            {ehAdmin
              ? 'ainda não há regras — rode o importar-regras.sql ou crie a primeira em "+ nova regra".'
              : 'as regras de Terra Save ainda serão publicadas aqui'}
          </p>
        )}
      </section>
    </div>
  );
}
