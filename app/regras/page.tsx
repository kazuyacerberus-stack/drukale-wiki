'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import '../matrix.css';
import PrecisaAprovacao from '../components/PrecisaAprovacao';
import RegraTexto from '../components/RegraTexto';
import RegraEditor from '../components/RegraEditor';
import RegraComentarios from '../components/RegraComentarios';
import { useBeep } from '../components/useBeep';
import { supabase } from '../lib/db';
import { mensagemRegra, normalizarBusca, type Regra } from '../lib/regras';

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

  useEffect(() => {
    (async () => {
      const [{ data: auth }, { data: admin }, { data, error }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc('drk_e_admin'),
        supabase.from('regras').select('*').order('doc_ordem').order('ordem'),
      ]);
      setUserId(auth.user?.id ?? null);
      setEhAdmin(admin === true);
      if (error) { setErro(mensagemRegra(error)); setCarregando(false); return; }
      const lista = ordenar((data ?? []) as Regra[]);
      setRegras(lista);
      const doHash = decodeURIComponent(window.location.hash.slice(1));
      setSelId(lista.find((r) => r.id === doHash)?.id ?? lista[0]?.id ?? null);
      setCarregando(false);
    })();
  }, []);

  const docs = useMemo(() => {
    const m = new Map<number, string>();
    regras.forEach((r) => { if (!m.has(r.doc_ordem)) m.set(r.doc_ordem, r.doc); });
    return [...m.entries()].map(([doc_ordem, doc]) => ({ doc_ordem, doc }));
  }, [regras]);

  // texto normalizado de cada regra, calculado uma vez, pro filtro não pesar a cada tecla
  const indice = useMemo(() => new Map(regras.map((r) => [r.id, normalizarBusca(`${r.titulo} ${r.conteudo}`)])), [regras]);

  const termo = normalizarBusca(busca.trim());
  const visiveis = termo ? regras.filter((r) => indice.get(r.id)?.includes(termo)) : regras;
  const grupos = docs
    .map((d) => ({ ...d, itens: visiveis.filter((r) => r.doc_ordem === d.doc_ordem) }))
    .filter((g) => g.itens.length > 0);

  const selecionada = regras.find((r) => r.id === selId) ?? null;

  /** Troca só a regra exibida: a página, a lateral e a rolagem continuam onde estavam. */
  const selecionar = (id: string) => {
    setSelId(id);
    setEditando(null);
    window.history.replaceState(null, '', `#${id}`);
    if (window.innerWidth <= 860) document.getElementById('regra-painel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const alternarGrupo = (ordem: number) => setFechados((prev) => { const n = new Set(prev); n.has(ordem) ? n.delete(ordem) : n.add(ordem); return n; });

  if (carregando) return <div className="load"><span /><span /><span /><p>abrindo o livro de regras...</p></div>;
  if (erro) return <p className="erro">FALHA :: {erro}</p>;

  return (
    <div className="regras-layout">
      <aside className="regras-lateral" aria-label="Filtro das regras">
        <input
          className="regras-busca"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="filtrar regras..."
          aria-label="Filtrar regras"
        />
        <p className="regras-contagem">{termo ? `${visiveis.length} de ${regras.length} regras` : `${regras.length} regras`}</p>

        {grupos.length === 0 ? (
          <p className="vazio" style={{ padding: '20px 0' }}>{regras.length === 0 ? 'nenhuma regra publicada ainda' : 'nenhuma regra corresponde ao filtro'}</p>
        ) : (
          grupos.map((g) => {
            const aberto = termo ? true : !fechados.has(g.doc_ordem);
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
          <>
            <div className="regras-topo">
              <div>
                <p className="regras-doc">{selecionada.doc}</p>
                <h2>{selecionada.titulo}</h2>
              </div>
              {ehAdmin && <button type="button" className="mini-btn" onClick={() => setEditando(selecionada.id)}>✎ editar</button>}
            </div>
            <RegraTexto texto={selecionada.conteudo} />
            <p className="regras-atualizada">atualizada em {new Date(selecionada.updated_at).toLocaleDateString('pt-BR')}</p>
            <RegraComentarios key={selecionada.id} regraId={selecionada.id} userId={userId} ehAdmin={ehAdmin} />
          </>
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
