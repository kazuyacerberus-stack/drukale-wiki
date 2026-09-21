'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import '../../matrix.css';
import MatrixRain from '../../components/MatrixRain';
import PrecisaAprovacao from '../../components/PrecisaAprovacao';
import { useBeep } from '../../components/useBeep';
import { supabase, type Character } from '../../lib/db';
import Avatar from '../../components/Avatar';
import {
  normalizarNome, mensagemFaccao, solicitarFaccao, convidarParaFaccao, aceitarMembro, recusarMembro, sairFaccao,
  type Faccao, type MembroFaccao,
} from '../../lib/faccoes';
import { lerLocais, tipoDe, type Local } from '../../lib/mundo';

type PerfilLeve = { user_id: string; apelido: string; avatar_url: string | null };

export default function FaccaoPage() {
  return (
    <div className="term">
      <MatrixRain />
      <main className="wrap">
        <PrecisaAprovacao>
          <FaccaoPageInterna />
        </PrecisaAprovacao>
      </main>
    </div>
  );
}

function FaccaoPageInterna() {
  const params = useParams<{ slug: string }>();
  const chave = decodeURIComponent(String(params?.slug ?? ''));

  const [alvo, setAlvo] = useState<Faccao | null>(null);
  const [membros, setMembros] = useState<Character[]>([]);
  const [territorio, setTerritorio] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [naoEncontrada, setNaoEncontrada] = useState(false);
  const [erro, setErro] = useState('');
  const [quebrada, setQuebrada] = useState(false);
  const { beep } = useBeep();

  const [userId, setUserId] = useState<string | null>(null);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [avaliando, setAvaliando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [mostrarMotivo, setMostrarMotivo] = useState(false);
  const [erroAvaliacao, setErroAvaliacao] = useState('');

  const [filiados, setFiliados] = useState<MembroFaccao[]>([]);
  const [perfisFiliados, setPerfisFiliados] = useState<Map<string, PerfilLeve>>(new Map());
  const [buscaConvite, setBuscaConvite] = useState('');
  const [resultadosConvite, setResultadosConvite] = useState<PerfilLeve[]>([]);
  const [erroFiliacao, setErroFiliacao] = useState('');
  const [agindoFiliacao, setAgindoFiliacao] = useState(false);

  useEffect(() => {
    if (!chave) return;
    (async () => {
      setLoading(true);
      setNaoEncontrada(false);
      setErro('');

      const [{ data: auth }, { data: admin }, { data: fac, error: erroFac }, { data: chars }, { data: locs }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc('drk_e_admin'),
        supabase.from('faccoes').select('*').eq('slug', chave).maybeSingle(),
        supabase.from('characters').select('*'),
        supabase.from('locais').select('*'),
      ]);
      setUserId(auth.user?.id ?? null);
      setEhAdmin(admin === true);

      if (erroFac) { setErro(mensagemFaccao(erroFac)); setLoading(false); return; }
      if (!fac) { setNaoEncontrada(true); setLoading(false); return; }

      const facao = fac as Faccao;
      const alvoNorm = normalizarNome(facao.nome);
      const todos = (chars ?? []) as Character[];
      setAlvo(facao);
      setMembros(
        todos
          .filter((c) => c.faction && normalizarNome(c.faction) === alvoNorm)
          .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'pt-BR'))
      );
      setTerritorio(
        lerLocais(locs)
          .filter((l) => l.faccao && normalizarNome(l.faccao) === alvoNorm)
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      );

      const { data: membrosData } = await supabase.from('faccao_membros').select('*').eq('faccao_id', facao.id);
      const linhas = (membrosData ?? []) as MembroFaccao[];
      setFiliados(linhas);
      const idsFiliados = [...new Set(linhas.map((m) => m.user_id))];
      if (idsFiliados.length) {
        const { data: perfisData } = await supabase.from('profiles').select('user_id,apelido,avatar_url').in('user_id', idsFiliados);
        if (perfisData) setPerfisFiliados(new Map((perfisData as PerfilLeve[]).map((p) => [p.user_id, p])));
      }

      setLoading(false);
    })();
  }, [chave]);

  useEffect(() => {
    const termo = buscaConvite.trim();
    if (termo.length < 2) { setResultadosConvite([]); return; }
    let vivo = true;
    const timer = window.setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('user_id,apelido,avatar_url').ilike('apelido', `%${termo}%`).limit(8);
      if (vivo) setResultadosConvite((data ?? []) as PerfilLeve[]);
    }, 300);
    return () => { vivo = false; window.clearTimeout(timer); };
  }, [buscaConvite]);

  const inicial = useMemo(() => (alvo?.nome.trim()[0] ?? '?').toUpperCase(), [alvo]);
  const temSimbolo = alvo?.simbolo && !quebrada;
  const souLider = Boolean(alvo && userId && alvo.user_id === userId);

  const recarregarFiliacao = async () => {
    if (!alvo) return;
    const { data } = await supabase.from('faccao_membros').select('*').eq('faccao_id', alvo.id);
    const linhas = (data ?? []) as MembroFaccao[];
    setFiliados(linhas);
    const idsFiliados = [...new Set(linhas.map((m) => m.user_id))];
    if (idsFiliados.length) {
      const { data: perfisData } = await supabase.from('profiles').select('user_id,apelido,avatar_url').in('user_id', idsFiliados);
      if (perfisData) setPerfisFiliados((prev) => { const n = new Map(prev); (perfisData as PerfilLeve[]).forEach((p) => n.set(p.user_id, p)); return n; });
    }
  };

  const acaoFiliacao = async (chamada: () => ReturnType<typeof solicitarFaccao>) => {
    setAgindoFiliacao(true); setErroFiliacao('');
    const { error } = await chamada();
    setAgindoFiliacao(false);
    if (error) { setErroFiliacao(error.message); return; }
    void recarregarFiliacao();
  };

  const aprovarFaccao = async () => {
    if (!alvo) return;
    setAvaliando(true); setErroAvaliacao('');
    const { error } = await supabase.rpc('drk_aprovar_faccao', { alvo_id: alvo.id });
    setAvaliando(false);
    if (error) { setErroAvaliacao(error.message); return; }
    setAlvo({ ...alvo, status_aprovacao: 'aprovado', motivo_reprovacao: null });
  };

  const reprovarFaccao = async () => {
    if (!alvo) return;
    if (!motivo.trim()) { setErroAvaliacao('Escreva o motivo da reprovação.'); return; }
    setAvaliando(true); setErroAvaliacao('');
    const { error } = await supabase.rpc('drk_reprovar_faccao', { alvo_id: alvo.id, motivo: motivo.trim() });
    setAvaliando(false);
    if (error) { setErroAvaliacao(error.message); return; }
    setAlvo({ ...alvo, status_aprovacao: 'reprovado', motivo_reprovacao: motivo.trim() });
    setMostrarMotivo(false);
    setMotivo('');
  };

  if (loading) {
    return <div className="load"><span /><span /><span /><p>acessando registro...</p></div>;
  }

  if (naoEncontrada || erro || !alvo) {
    return (
      <header className="hd">
        <div className="hd-bar">
          <span className="dot" /><span className="dot" /><span className="dot" />
          <span className="hd-path">terrasave://arquivo/faccoes/{chave}</span>
          <div className="hd-act"><Link className="ico" href="/faccoes">← facções</Link></div>
        </div>
        <h1 data-txt="FACÇÃO NÃO ENCONTRADA">FACÇÃO NÃO ENCONTRADA</h1>
        <p className="sub">&gt; {erro || `nenhuma facção responde por "${chave}"`}</p>
      </header>
    );
  }

  return (
    <>
        <div className="hd-bar">
          <span className="dot" /><span className="dot" /><span className="dot" />
          <span className="hd-path">terrasave://arquivo/faccoes/{alvo.slug}</span>
          <div className="hd-act">
            <Link className="ico" href="/faccoes" onClick={() => beep('close')}>← facções</Link>
            <Link className="ico" href="/admin/faccoes">gerenciar</Link>
          </div>
        </div>

        <div style={{ height: 26 }} />

        <div style={{ maxWidth: 680 }}>
          <div className="pcab">
            <div className="retrato">
              <span className="halo" style={{ borderColor: alvo.cor }} />
              <div className="orb" style={{ borderColor: alvo.cor }}>
                {temSimbolo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={alvo.simbolo as string} alt={alvo.nome} onError={() => setQuebrada(true)} />
                ) : (
                  <span className="ini big" style={{ color: alvo.cor }}>{inicial}</span>
                )}
              </div>
            </div>
            <div className="pnome">
              <span className="epi" style={{ color: alvo.cor }}>facção</span>
              <h1 data-txt={alvo.nome}>{alvo.nome}</h1>
              {alvo.status_aprovacao === 'pendente' && <span className="selo-pendente">em análise</span>}
            </div>
          </div>

          {ehAdmin && alvo.status_aprovacao === 'pendente' && (
            <div className="acoes-aprovacao">
              <button type="button" className="mini-btn" disabled={avaliando} onClick={aprovarFaccao}>✓ aprovar</button>
              <button type="button" className="mini-btn dim" disabled={avaliando} onClick={() => setMostrarMotivo((v) => !v)}>✕ reprovar</button>
              {mostrarMotivo && (
                <div style={{ width: '100%' }}>
                  <textarea
                    rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)}
                    placeholder="explique o motivo — quem propôs vai ver isto para corrigir e reenviar"
                  />
                  <button type="button" className="mini-btn dim" disabled={avaliando} onClick={reprovarFaccao} style={{ marginTop: 8 }}>
                    confirmar reprovação
                  </button>
                </div>
              )}
              {erroAvaliacao && <p className="erro">{erroAvaliacao}</p>}
            </div>
          )}

          {alvo.resumo && <p className="cit" style={{ borderColor: alvo.cor }}>{alvo.resumo}</p>}

          {alvo.territorio && (
            <section className="sec" style={{ animationDelay: '60ms' }}>
              <h2>território</h2>
              <p>{alvo.territorio}</p>
            </section>
          )}

          {alvo.historia && (
            <section className="sec" style={{ animationDelay: '120ms' }}>
              <h2>história</h2>
              <p>{alvo.historia}</p>
            </section>
          )}

          {!alvo.resumo && !alvo.territorio && !alvo.historia && (
            <p className="vazio">nenhum conteúdo arquivado para esta facção ainda.</p>
          )}
        </div>

        <section style={{ marginTop: 44 }}>
          <h2 style={{ margin: '0 0 18px' }}>membros{membros.length > 0 ? ` (${membros.length})` : ''}</h2>
          {membros.length === 0 ? (
            <p className="vazio">nenhum personagem vinculado a esta facção ainda.</p>
          ) : (
            <section className="grid">
              {membros.map((c, i) => {
                const ok = c.image_url;
                const nomeInicial = (c.name?.trim()?.[0] ?? '?').toUpperCase();
                return (
                  <Link
                    key={String(c.id)}
                    href={`/personagem/${c.slug || c.id}`}
                    className="node"
                    style={{ animationDelay: `${Math.min(i * 55, 700)}ms` }}
                    onMouseEnter={() => beep('hover')}
                    onClick={() => beep('click')}
                  >
                    <div className="ringwrap">
                      <span className="ring" />
                      <span className="ring2" />
                      <div className="orb">
                        {ok ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.image_url as string} alt={c.name ?? ''} />
                        ) : (
                          <span className="ini">{nomeInicial}</span>
                        )}
                        <span className="sheen" />
                      </div>
                    </div>
                    <h3>{c.name ?? 'sem nome'}</h3>
                    <p className="desc">{c.epithet || c.description || ''}</p>
                  </Link>
                );
              })}
            </section>
          )}
        </section>

        <section style={{ marginTop: 44 }}>
          <h2 style={{ margin: '0 0 18px' }}>jogadores filiados{filiados.filter((m) => m.status === 'aceito').length > 0 ? ` (${filiados.filter((m) => m.status === 'aceito').length})` : ''}</h2>
          {erroFiliacao && <p className="erro">{erroFiliacao}</p>}

          {filiados.filter((m) => m.status === 'aceito').length === 0 ? (
            <p className="vazio">ninguém filiado ainda.</p>
          ) : (
            filiados.filter((m) => m.status === 'aceito').map((m) => {
              const p = perfisFiliados.get(m.user_id);
              return (
                <div className="linha" key={m.user_id} style={{ padding: '8px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar url={p?.avatar_url} nome={p?.apelido} tamanho={26} />
                    <Link href={`/jogador/${m.user_id}`}><strong>{p?.apelido ?? 'membro'}</strong></Link>
                    {m.user_id === alvo.user_id && <span className="dica">líder</span>}
                  </div>
                  {m.user_id === userId && m.user_id !== alvo.user_id && (
                    <button type="button" className="mini-btn dim" disabled={agindoFiliacao} onClick={() => acaoFiliacao(() => sairFaccao(alvo.id))}>sair</button>
                  )}
                </div>
              );
            })
          )}

          {userId && !souLider && (() => {
            const minha = filiados.find((m) => m.user_id === userId);
            if (minha?.status === 'aceito') return null;
            if (minha?.status === 'pendente') return <p className="dica">pedido enviado — aguardando o líder aceitar.</p>;
            return <button type="button" className="mini-btn" disabled={agindoFiliacao} onClick={() => acaoFiliacao(() => solicitarFaccao(alvo.id))}>+ solicitar entrada</button>;
          })()}

          {(souLider || ehAdmin) && (
            <div style={{ marginTop: 18 }}>
              <h3 style={{ fontSize: 13, letterSpacing: 1 }}>PEDIDOS PENDENTES</h3>
              {filiados.filter((m) => m.status === 'pendente').length === 0 ? (
                <p className="vazio">nenhum pedido no momento</p>
              ) : (
                filiados.filter((m) => m.status === 'pendente').map((m) => {
                  const p = perfisFiliados.get(m.user_id);
                  return (
                    <div className="linha" key={m.user_id} style={{ padding: '8px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar url={p?.avatar_url} nome={p?.apelido} tamanho={26} />
                        <strong>{p?.apelido ?? 'membro'}</strong>
                      </div>
                      <span style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="mini-btn" disabled={agindoFiliacao} onClick={() => acaoFiliacao(() => aceitarMembro(alvo.id, m.user_id))}>✓ aceitar</button>
                        <button type="button" className="mini-btn dim" disabled={agindoFiliacao} onClick={() => acaoFiliacao(() => recusarMembro(alvo.id, m.user_id))}>✕ recusar</button>
                      </span>
                    </div>
                  );
                })
              )}

              <div className="field" style={{ marginTop: 14 }}>
                <label>convidar por apelido</label>
                <input value={buscaConvite} onChange={(e) => setBuscaConvite(e.target.value)} placeholder="digite ao menos 2 letras" />
              </div>
              {resultadosConvite.filter((p) => !filiados.some((m) => m.user_id === p.user_id)).map((p) => (
                <div className="linha" key={p.user_id} style={{ padding: '8px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar url={p.avatar_url} nome={p.apelido} tamanho={26} />
                    <strong>{p.apelido}</strong>
                  </div>
                  <button type="button" className="mini-btn" disabled={agindoFiliacao} onClick={() => acaoFiliacao(() => convidarParaFaccao(alvo.id, p.user_id))}>+ convidar</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ marginTop: 44 }}>
          <h2 style={{ margin: '0 0 18px' }}>locais no mapa{territorio.length > 0 ? ` (${territorio.length})` : ''}</h2>
          {territorio.length === 0 ? (
            <p className="vazio">nenhum local do mundo pertence a esta facção ainda.</p>
          ) : (
            <ul className="lista-locais" style={{ maxHeight: 'none' }}>
              {territorio.map((l) => (
                <li key={l.id}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 9px' }}>
                    <i style={{ background: tipoDe(l.tipo).cor, width: 8, height: 8, borderRadius: '50%', boxShadow: '0 0 8px currentColor', flex: 'none' }} />
                    <span className="lista-nome">{l.nome}</span>
                    <span className="lista-tipo">{tipoDe(l.tipo).rotulo}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="dica" style={{ marginTop: 14 }}>
            <Link href="/mundo">ver no mapa político →</Link>
          </p>
        </section>

        <footer className="ft">terrasave_system v1.0 // conexão segura estabelecida</footer>
    </>
  );
}
