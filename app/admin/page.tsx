'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../matrix.css';
import MatrixRain from '../components/MatrixRain';
import Protegido from '../components/Protegido';
import { cabecalhoAuth, sair } from '../lib/auth';
import { supabase, lerSecoes, type Character } from '../lib/db';
import { type Evento } from '../lib/eventos';

type ContaAdmin = {
  user_id: string; email: string; apelido: string; avatar_url: string | null;
  muted_until: string | null; banido: boolean;
  status_conta: 'pendente' | 'aprovado' | 'reprovado'; motivo_reprovacao: string | null;
  created_at: string;
};
type Resumo = { contas_pendentes: number; contas_aprovadas: number; fichas_pendentes: number; eventos_pendentes: number; banidos: number };

export default function Painel() {
  const router = useRouter();
  const [chars, setChars] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [query, setQuery] = useState('');
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [apagando, setApagando] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');

  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [contas, setContas] = useState<ContaAdmin[]>([]);
  const [fichasPendentes, setFichasPendentes] = useState<Character[]>([]);
  const [eventosPendentes, setEventosPendentes] = useState<Evento[]>([]);
  const [avaliando, setAvaliando] = useState<string | null>(null);
  const [motivoPorId, setMotivoPorId] = useState<Record<string, string>>({});
  const [mostrarMotivoPara, setMostrarMotivoPara] = useState<string | null>(null);
  const [erroPainel, setErroPainel] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .order('name', { ascending: true });
    if (error) setErro(error.message);
    else setChars((data ?? []) as Character[]);
    setLoading(false);
  }, []);

  const carregarPainel = useCallback(async () => {
    const [
      { data: r, error: erroR },
      { data: c, error: erroC },
      { data: f, error: erroF },
      { data: e, error: erroE },
    ] = await Promise.all([
      supabase.rpc('drk_painel_resumo'),
      supabase.rpc('drk_admin_listar_perfis'),
      supabase.from('characters').select('*').eq('status_aprovacao', 'pendente'),
      supabase.from('eventos').select('*').eq('status_aprovacao', 'pendente'),
    ]);
    const primeiroErro = erroR ?? erroC ?? erroF ?? erroE;
    if (primeiroErro) { setErroPainel(primeiroErro.message); return; }
    setErroPainel('');
    setResumo(r as Resumo);
    setContas(((c ?? []) as ContaAdmin[]).filter((p) => p.status_conta === 'pendente'));
    setFichasPendentes((f ?? []) as Character[]);
    setEventosPendentes((e ?? []) as Evento[]);
  }, []);

  useEffect(() => { void carregar(); void carregarPainel(); }, [carregar, carregarPainel]);

  const aprovarConta = async (uid: string) => {
    setAvaliando(uid); setErroPainel('');
    const { error } = await supabase.rpc('drk_aprovar_conta', { alvo: uid });
    setAvaliando(null);
    if (error) { setErroPainel(error.message); return; }
    setContas((prev) => prev.filter((c) => c.user_id !== uid));
    setResumo((prev) => prev && { ...prev, contas_pendentes: prev.contas_pendentes - 1, contas_aprovadas: prev.contas_aprovadas + 1 });
  };

  const reprovarConta = async (uid: string) => {
    const motivo = (motivoPorId[uid] ?? '').trim();
    if (!motivo) { setErroPainel('Escreva o motivo da reprovação.'); return; }
    setAvaliando(uid); setErroPainel('');
    const { error } = await supabase.rpc('drk_reprovar_conta', { alvo: uid, motivo });
    setAvaliando(null);
    if (error) { setErroPainel(error.message); return; }
    setContas((prev) => prev.filter((c) => c.user_id !== uid));
    setMostrarMotivoPara(null);
    setResumo((prev) => prev && { ...prev, contas_pendentes: prev.contas_pendentes - 1 });
  };

  const aprovarFicha = async (id: string) => {
    setAvaliando(id); setErroPainel('');
    const { error } = await supabase.rpc('drk_aprovar_personagem', { alvo_id: id });
    setAvaliando(null);
    if (error) { setErroPainel(error.message); return; }
    setFichasPendentes((prev) => prev.filter((c) => String(c.id) !== id));
    setResumo((prev) => prev && { ...prev, fichas_pendentes: prev.fichas_pendentes - 1 });
    void carregar();
  };

  const reprovarFicha = async (id: string) => {
    const motivo = (motivoPorId[id] ?? '').trim();
    if (!motivo) { setErroPainel('Escreva o motivo da reprovação.'); return; }
    setAvaliando(id); setErroPainel('');
    const { error } = await supabase.rpc('drk_reprovar_personagem', { alvo_id: id, motivo });
    setAvaliando(null);
    if (error) { setErroPainel(error.message); return; }
    setFichasPendentes((prev) => prev.filter((c) => String(c.id) !== id));
    setMostrarMotivoPara(null);
    setResumo((prev) => prev && { ...prev, fichas_pendentes: prev.fichas_pendentes - 1 });
  };

  const aprovarEvento = async (id: string) => {
    setAvaliando(id); setErroPainel('');
    const { error } = await supabase.rpc('drk_aprovar_evento', { alvo_id: id });
    setAvaliando(null);
    if (error) { setErroPainel(error.message); return; }
    setEventosPendentes((prev) => prev.filter((e) => e.id !== id));
    setResumo((prev) => prev && { ...prev, eventos_pendentes: prev.eventos_pendentes - 1 });
  };

  const reprovarEvento = async (id: string) => {
    const motivo = (motivoPorId[id] ?? '').trim();
    if (!motivo) { setErroPainel('Escreva o motivo da reprovação.'); return; }
    setAvaliando(id); setErroPainel('');
    const { error } = await supabase.rpc('drk_reprovar_evento', { alvo_id: id, motivo });
    setAvaliando(null);
    if (error) { setErroPainel(error.message); return; }
    setEventosPendentes((prev) => prev.filter((e) => e.id !== id));
    setMostrarMotivoPara(null);
    setResumo((prev) => prev && { ...prev, eventos_pendentes: prev.eventos_pendentes - 1 });
  };

  const excluir = async (c: Character) => {
    setApagando(String(c.id));
    setAviso('');
    try {
      const res = await fetch(`/api/characters?id=${encodeURIComponent(String(c.id))}`, {
        method: 'DELETE',
        headers: await cabecalhoAuth(),
      });
      const data = await res.json();
      if (!res.ok) {
        setAviso('FALHA :: ' + (data.error ?? 'não foi possível excluir'));
      } else {
        setChars((l) => l.filter((x) => String(x.id) !== String(c.id)));
        setAviso(`REGISTRO "${c.name ?? ''}" REMOVIDO`);
      }
    } catch (err) {
      setAviso('FALHA :: ' + (err instanceof Error ? err.message : 'desconhecida'));
    }
    setApagando(null);
    setConfirmar(null);
  };

  const q = query.trim().toLowerCase();
  const list = q
    ? chars.filter((c) =>
        [c.name, c.epithet, c.faction].some((v) => (v ?? '').toLowerCase().includes(q))
      )
    : chars;

  const inicial = (n: string | null) => (n?.trim()?.[0] ?? '?').toUpperCase();
  const ruim = aviso.startsWith('FALHA');

  /* quantos itens da ficha estão preenchidos — mostra o que falta completar */
  const ITENS_FICHA = 7;   // epíteto, citação, facção, status, raça, afiliações e as abas
  const completude = (c: Character) => {
    const campos = [c.epithet, c.quote, c.faction, c.status, c.race, c.affiliation];
    const temAbas = lerSecoes(c.sections).length > 0;
    return campos.filter(Boolean).length + (temAbas ? 1 : 0);
  };

  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap">
       <Protegido>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">drukale://admin/painel</span>
            <div className="hd-act">
              <Link className="ico" href="/">← arquivo</Link>
              <Link className="ico" href="/personagens">personagens</Link>
              <Link className="ico" href="/admin/novo">+ novo registro</Link>
              <Link className="ico" href="/admin/faccoes">facções</Link>
              <Link className="ico" href="/admin/cronicas">crônicas</Link>
              <Link className="ico" href="/admin/glossario">glossário</Link>
              <Link className="ico" href="/admin/comunidade">comunidade</Link>
              <button
                className="ico dim"
                onClick={async () => { await sair(); router.replace('/admin/login'); }}
              >
                sair
              </button>
            </div>
          </div>
          <h1 data-txt="PAINEL">PAINEL</h1>
          <p className="sub">&gt; game master — controle total do site <span className="cur" /></p>
        </header>

        {erroPainel && <p className="erro">FALHA :: {erroPainel}</p>}

        {resumo && (
          <div className="imp-numeros" style={{ margin: '0 0 30px' }}>
            <div className="imp-numero"><strong>{resumo.contas_pendentes}</strong><span>contas pendentes</span></div>
            <div className="imp-numero"><strong>{resumo.contas_aprovadas}</strong><span>contas aprovadas</span></div>
            <div className="imp-numero"><strong>{resumo.fichas_pendentes}</strong><span>fichas pendentes</span></div>
            <div className="imp-numero"><strong>{resumo.eventos_pendentes}</strong><span>eventos pendentes</span></div>
            <div className="imp-numero"><strong>{resumo.banidos}</strong><span>banidos/silenciados</span></div>
          </div>
        )}

        <p className="dica" style={{ margin: '0 0 30px' }}>
          Moderação de chat e contas banidas/silenciadas: <Link href="/admin/comunidade" style={{ color: 'var(--g)' }}>abrir comunidade →</Link>
        </p>

        {contas.length > 0 && (
          <section style={{ marginBottom: 34 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 16 }}>contas aguardando aprovação ({contas.length})</h2>
            {contas.map((c) => (
              <div key={c.user_id} className="linha" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '12px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                  <strong>{c.apelido}</strong>
                  <span style={{ color: 'rgba(138,255,192,.5)', fontSize: 12 }}>{c.email}</span>
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button type="button" className="mini-btn" disabled={avaliando === c.user_id} onClick={() => aprovarConta(c.user_id)}>✓ aprovar</button>
                    <button type="button" className="mini-btn dim" disabled={avaliando === c.user_id} onClick={() => setMostrarMotivoPara(mostrarMotivoPara === c.user_id ? null : c.user_id)}>✕ reprovar</button>
                  </span>
                </div>
                {mostrarMotivoPara === c.user_id && (
                  <div style={{ width: '100%', marginTop: 8 }}>
                    <textarea
                      rows={2}
                      value={motivoPorId[c.user_id] ?? ''}
                      onChange={(e) => setMotivoPorId((prev) => ({ ...prev, [c.user_id]: e.target.value }))}
                      placeholder="explique o motivo — fica visível para a pessoa"
                    />
                    <button type="button" className="mini-btn dim" disabled={avaliando === c.user_id} onClick={() => reprovarConta(c.user_id)} style={{ marginTop: 8 }}>
                      confirmar reprovação
                    </button>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {fichasPendentes.length > 0 && (
          <section style={{ marginBottom: 34 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 16 }}>fichas aguardando aprovação ({fichasPendentes.length})</h2>
            {fichasPendentes.map((f) => {
              const id = String(f.id);
              return (
                <div key={id} className="linha" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '12px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                    <strong>{f.name ?? 'sem nome'}</strong>
                    <Link href={`/personagem/${f.slug || id}`} style={{ fontSize: 12 }}>ver</Link>
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                      <button type="button" className="mini-btn" disabled={avaliando === id} onClick={() => aprovarFicha(id)}>✓ aprovar</button>
                      <button type="button" className="mini-btn dim" disabled={avaliando === id} onClick={() => setMostrarMotivoPara(mostrarMotivoPara === id ? null : id)}>✕ reprovar</button>
                    </span>
                  </div>
                  {mostrarMotivoPara === id && (
                    <div style={{ width: '100%', marginTop: 8 }}>
                      <textarea rows={2} value={motivoPorId[id] ?? ''} onChange={(e) => setMotivoPorId((prev) => ({ ...prev, [id]: e.target.value }))} placeholder="explique o motivo" />
                      <button type="button" className="mini-btn dim" disabled={avaliando === id} onClick={() => reprovarFicha(id)} style={{ marginTop: 8 }}>confirmar reprovação</button>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {eventosPendentes.length > 0 && (
          <section style={{ marginBottom: 34 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 16 }}>crônicas aguardando aprovação ({eventosPendentes.length})</h2>
            {eventosPendentes.map((ev) => (
              <div key={ev.id} className="linha" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '12px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                  <strong>{ev.titulo}</strong>
                  <Link href="/cronicas" style={{ fontSize: 12 }}>ver</Link>
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button type="button" className="mini-btn" disabled={avaliando === ev.id} onClick={() => aprovarEvento(ev.id)}>✓ aprovar</button>
                    <button type="button" className="mini-btn dim" disabled={avaliando === ev.id} onClick={() => setMostrarMotivoPara(mostrarMotivoPara === ev.id ? null : ev.id)}>✕ reprovar</button>
                  </span>
                </div>
                {mostrarMotivoPara === ev.id && (
                  <div style={{ width: '100%', marginTop: 8 }}>
                    <textarea rows={2} value={motivoPorId[ev.id] ?? ''} onChange={(e) => setMotivoPorId((prev) => ({ ...prev, [ev.id]: e.target.value }))} placeholder="explique o motivo" />
                    <button type="button" className="mini-btn dim" disabled={avaliando === ev.id} onClick={() => reprovarEvento(ev.id)} style={{ marginTop: 8 }}>confirmar reprovação</button>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        <h2 style={{ margin: '0 0 14px', fontSize: 16 }}>todos os personagens</h2>
        <div className="bar">
          <input
            className="srch"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="filtrar registros..."
          />
          <span className="count">
            {loading ? 'CARREGANDO' : `${list.length} DE ${chars.length}`}
          </span>
        </div>

        {erro && <p className="erro">FALHA :: {erro}</p>}
        {aviso && <p className={'stat ' + (ruim ? 'bad' : 'ok')} style={{ textAlign: 'left', margin: '0 0 20px' }}>{aviso}</p>}

        {loading ? (
          <div className="load">
            <span /><span /><span />
            <p>lendo arquivo...</p>
          </div>
        ) : list.length === 0 ? (
          <p className="vazio">
            {q ? 'nenhum registro corresponde ao filtro' : 'nenhum personagem registrado ainda'}
          </p>
        ) : (
          <div className="lista">
            {list.map((c) => {
              const id = String(c.id);
              const emConfirmacao = confirmar === id;
              const preenchidos = completude(c);
              return (
                <div className={'item' + (emConfirmacao ? ' perigo' : '')} key={id}>
                  <div className="mini">
                    {c.image_url ? (
                      <img src={c.image_url} alt="" />
                    ) : (
                      <span className="ini" style={{ fontSize: 22 }}>{inicial(c.name)}</span>
                    )}
                  </div>

                  <div className="info">
                    <strong>{c.name ?? 'sem nome'}</strong>
                    <span className="meta">
                      {c.epithet || <em>sem epíteto</em>}
                      {c.faction ? ` · ${c.faction}` : ''}
                      {c.status ? ` · ${c.status}` : ''}
                    </span>
                    <span className="slug">/personagem/{c.slug || id}</span>
                  </div>

                  <div className="barra" title={`${preenchidos} de ${ITENS_FICHA} itens preenchidos`}>
                    <span style={{ width: `${(preenchidos / ITENS_FICHA) * 100}%` }} />
                  </div>

                  {emConfirmacao ? (
                    <div className="acoes">
                      <button
                        className="mini-btn perigo"
                        disabled={apagando === id}
                        onClick={() => excluir(c)}
                      >
                        {apagando === id ? '...' : 'confirmar'}
                      </button>
                      <button className="mini-btn" onClick={() => setConfirmar(null)}>cancelar</button>
                    </div>
                  ) : (
                    <div className="acoes">
                      <Link className="mini-btn" href={`/personagem/${c.slug || id}`}>ver</Link>
                      <Link className="mini-btn" href={`/admin/editar/${c.slug || id}`}>editar</Link>
                      <button className="mini-btn dim" onClick={() => { setConfirmar(id); setAviso(''); }}>
                        excluir
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <footer className="ft">drukale_system v1.0 // conexão segura estabelecida</footer>
       </Protegido>
      </main>
    </div>
  );
}
