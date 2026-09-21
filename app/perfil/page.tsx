'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../matrix.css';
import Avatar from '../components/Avatar';
import PerfilCard from '../components/PerfilCard';
import PerfilTimeline from '../components/PerfilTimeline';
import { supabase, type Character } from '../lib/db';
import { sair } from '../lib/auth';
import { garantirPerfil, estaMudo, type Perfil } from '../lib/perfil';
import { type Evento } from '../lib/eventos';
import { type Faccao } from '../lib/faccoes';
import { buscarMinhasAmizades, pedirAmizade, aceitarAmizade, recusarAmizade, desfazerAmizade, mensagemAmizade, type Amizade } from '../lib/amizades';

const ROTULO_STATUS: Record<string, string> = { pendente: 'em análise', aprovado: 'aprovado', reprovado: 'reprovado' };
type PerfilLeve = { user_id: string; apelido: string; avatar_url: string | null };

type ContaAdmin = {
  user_id: string; email: string; apelido: string; status_conta: 'pendente' | 'aprovado' | 'reprovado';
};
type Resumo = { contas_pendentes: number; contas_aprovadas: number; fichas_pendentes: number; eventos_pendentes: number; banidos: number };

export default function PerfilPage() {
  const router = useRouter();
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  const [meusPersonagens, setMeusPersonagens] = useState<Character[]>([]);
  const [meusEventos, setMeusEventos] = useState<Evento[]>([]);
  const [minhasFaccoes, setMinhasFaccoes] = useState<Faccao[]>([]);
  const [carregandoEnvios, setCarregandoEnvios] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);
  const [amizades, setAmizades] = useState<Amizade[]>([]);
  const [perfisAmizade, setPerfisAmizade] = useState<Map<string, PerfilLeve>>(new Map());
  const [carregandoAmizades, setCarregandoAmizades] = useState(true);
  const [erroAmizade, setErroAmizade] = useState('');
  const [buscaApelido, setBuscaApelido] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState<PerfilLeve[]>([]);
  const [buscando, setBuscando] = useState(false);

  const [ehAdmin, setEhAdmin] = useState(false);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [contasPendentes, setContasPendentes] = useState<ContaAdmin[]>([]);
  const [avaliando, setAvaliando] = useState<string | null>(null);
  const [motivoPorId, setMotivoPorId] = useState<Record<string, string>>({});
  const [mostrarMotivoPara, setMostrarMotivoPara] = useState<string | null>(null);
  const [erroPainel, setErroPainel] = useState('');

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace('/admin/login'); return; }
      const uid = data.session.user.id;
      setUserId(uid);
      const [p, personagens, eventos, faccoes, admin] = await Promise.all([
        garantirPerfil(),
        supabase.from('characters').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('eventos').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('faccoes').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.rpc('drk_e_admin'),
      ]);
      if (!vivo) return;
      setPerfil(p);
      setMeusPersonagens((personagens.data ?? []) as Character[]);
      setMeusEventos((eventos.data ?? []) as Evento[]);
      setMinhasFaccoes((faccoes.data ?? []) as Faccao[]);
      setCarregandoPerfil(false);
      setCarregandoEnvios(false);
      setEhAdmin(admin.data === true);
    })();
    return () => { vivo = false; };
  }, [router]);

  const carregarPainel = async () => {
    const [{ data: r, error: erroR }, { data: c, error: erroC }] = await Promise.all([
      supabase.rpc('drk_painel_resumo'),
      supabase.rpc('drk_admin_listar_perfis'),
    ]);
    const primeiroErro = erroR ?? erroC;
    if (primeiroErro) { setErroPainel(primeiroErro.message); return; }
    setErroPainel('');
    setResumo(r as Resumo);
    setContasPendentes(((c ?? []) as ContaAdmin[]).filter((p) => p.status_conta === 'pendente'));
  };

  useEffect(() => { if (ehAdmin) void carregarPainel(); }, [ehAdmin]);

  const aprovarConta = async (uid: string) => {
    setAvaliando(uid); setErroPainel('');
    const { error } = await supabase.rpc('drk_aprovar_conta', { alvo: uid });
    setAvaliando(null);
    if (error) { setErroPainel(error.message); return; }
    setContasPendentes((prev) => prev.filter((c) => c.user_id !== uid));
    setResumo((prev) => prev && { ...prev, contas_pendentes: prev.contas_pendentes - 1, contas_aprovadas: prev.contas_aprovadas + 1 });
  };

  const reprovarConta = async (uid: string) => {
    const motivo = (motivoPorId[uid] ?? '').trim();
    if (!motivo) { setErroPainel('Escreva o motivo da reprovação.'); return; }
    setAvaliando(uid); setErroPainel('');
    const { error } = await supabase.rpc('drk_reprovar_conta', { alvo: uid, motivo });
    setAvaliando(null);
    if (error) { setErroPainel(error.message); return; }
    setContasPendentes((prev) => prev.filter((c) => c.user_id !== uid));
    setMostrarMotivoPara(null);
    setResumo((prev) => prev && { ...prev, contas_pendentes: prev.contas_pendentes - 1 });
  };

  const carregarAmizades = async () => {
    try {
      const linhas = await buscarMinhasAmizades();
      setAmizades(linhas);
      const ids = [...new Set(linhas.flatMap((a) => [a.solicitante, a.destinatario]))].filter((id) => id !== userId);
      if (ids.length) {
        const { data } = await supabase.from('profiles').select('user_id,apelido,avatar_url').in('user_id', ids);
        if (data) setPerfisAmizade(new Map((data as PerfilLeve[]).map((p) => [p.user_id, p])));
      }
    } catch (e) {
      setErroAmizade(mensagemAmizade(e));
    } finally {
      setCarregandoAmizades(false);
    }
  };

  useEffect(() => { if (userId) void carregarAmizades(); }, [userId]);

  useEffect(() => {
    const termo = buscaApelido.trim();
    if (termo.length < 2) { setResultadosBusca([]); return; }
    let vivo = true;
    setBuscando(true);
    const timer = window.setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('user_id,apelido,avatar_url').ilike('apelido', `%${termo}%`).limit(8);
      if (vivo) { setResultadosBusca(((data ?? []) as PerfilLeve[]).filter((p) => p.user_id !== userId)); setBuscando(false); }
    }, 300);
    return () => { vivo = false; window.clearTimeout(timer); };
  }, [buscaApelido, userId]);

  const acaoAmizade = async (chamada: () => ReturnType<typeof pedirAmizade>, alvo: PerfilLeve) => {
    setErroAmizade('');
    setPerfisAmizade((prev) => new Map(prev).set(alvo.user_id, alvo));
    const { error } = await chamada();
    if (error) { setErroAmizade(mensagemAmizade(error)); return; }
    void carregarAmizades();
  };

  return (
    <div className="term drukale">
      <main className="wrap">
        <div className="hd-bar">
          <span className="dot" /><span className="dot" /><span className="dot" />
          <span className="hd-path">terrasave://minha-conta</span>
          <div className="hd-act">
            <Link className="ico" href="/">← arquivo</Link>
            <Link className="ico" href="/chat">chat</Link>
            <Link className="ico" href="/cenas">cenas</Link>
            {ehAdmin && <Link className="ico" href="/admin">painel completo</Link>}
            <button className="ico dim" onClick={async () => { await sair(); router.replace('/'); }}>sair</button>
          </div>
        </div>

        {!carregandoPerfil && perfil && perfil.status_conta !== 'aprovado' && (
          <p className="stat bad" style={{ marginBottom: 18 }}>
            {perfil.status_conta === 'pendente'
              ? 'Sua conta está aguardando aprovação do game master — você ainda não consegue ver o resto do site.'
              : `Seu cadastro não foi aprovado${perfil.motivo_reprovacao ? `: ${perfil.motivo_reprovacao}` : '.'}`}
          </p>
        )}
        {perfil && (perfil.banido || estaMudo(perfil)) && (
          <p className="stat bad" style={{ marginBottom: 18 }}>
            {perfil.banido ? 'Sua conta foi suspensa — você não consegue mais postar.' : `Você está silenciado até ${new Date(perfil.muted_until as string).toLocaleString('pt-BR')}.`}
          </p>
        )}

        {carregandoPerfil || !perfil || !userId ? (
          <div className="load"><span /><span /><span /><p>carregando perfil...</p></div>
        ) : (
          <div className="drukale-layout">
            <aside className="drukale-lateral">
              <PerfilCard perfil={perfil} ehProprioPerfil ehAdmin={ehAdmin} resumo={resumo} onPerfilAtualizado={setPerfil} />
            </aside>

            <div className="drukale-principal">
              <PerfilTimeline alvo={userId} ehProprioPerfil ehAdmin={ehAdmin} />

              {ehAdmin && (
                <section className="panel login" style={{ marginTop: 24 }}>
                  <h2 className="login-t" style={{ fontSize: 18 }}>CONTAS AGUARDANDO APROVAÇÃO</h2>
                  {erroPainel && <p className="stat bad">FALHA :: {erroPainel}</p>}
                  {contasPendentes.length === 0 ? (
                    <p className="vazio">nenhuma conta esperando aprovação no momento</p>
                  ) : (
                    contasPendentes.map((c) => (
                      <div key={c.user_id} className="linha" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '12px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                          <strong>{c.apelido}</strong>
                          <span style={{ color: 'rgba(233,228,218,.5)', fontSize: 12 }}>{c.email}</span>
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
                    ))
                  )}
                </section>
              )}

              {(() => {
                const pedidosRecebidos = amizades.filter((a) => a.destinatario === userId && a.status === 'pendente');
                const amigos = amizades.filter((a) => a.solicitante === userId && a.status === 'aceita');
                const idsConhecidos = new Set(amizades.flatMap((a) => [a.solicitante, a.destinatario]));
                return (
                  <section className="panel login" style={{ marginTop: 24 }}>
                    <h2 className="login-t" style={{ fontSize: 18 }}>AMIZADES</h2>
                    <p className="login-s">&gt; adicione outros jogadores pra ver os posts marcados como &quot;amigos&quot;</p>

                    {erroAmizade && <p className="stat bad">FALHA :: {erroAmizade}</p>}

                    <div className="field" style={{ marginTop: 14 }}>
                      <label>buscar por apelido</label>
                      <input value={buscaApelido} onChange={(e) => setBuscaApelido(e.target.value)} placeholder="digite ao menos 2 letras" />
                    </div>
                    {buscando && <p className="dica">buscando...</p>}
                    {resultadosBusca.map((p) => (
                      <div className="linha" key={p.user_id} style={{ padding: '8px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar url={p.avatar_url} nome={p.apelido} tamanho={26} />
                          <strong>{p.apelido}</strong>
                        </div>
                        {!idsConhecidos.has(p.user_id) && (
                          <button type="button" className="mini-btn" onClick={() => acaoAmizade(() => pedirAmizade(p.user_id), p)}>+ adicionar</button>
                        )}
                      </div>
                    ))}

                    {carregandoAmizades ? (
                      <div className="load"><span /><span /><span /></div>
                    ) : (
                      <>
                        {pedidosRecebidos.length > 0 && (
                          <div style={{ marginTop: 18 }}>
                            <h3 style={{ fontSize: 13, letterSpacing: 1 }}>PEDIDOS RECEBIDOS</h3>
                            {pedidosRecebidos.map((a) => {
                              const p = perfisAmizade.get(a.solicitante);
                              return (
                                <div className="linha" key={a.solicitante} style={{ padding: '8px 0' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Avatar url={p?.avatar_url} nome={p?.apelido} tamanho={26} />
                                    <strong>{p?.apelido ?? 'membro'}</strong>
                                  </div>
                                  <span style={{ display: 'flex', gap: 8 }}>
                                    <button type="button" className="mini-btn" onClick={() => acaoAmizade(() => aceitarAmizade(a.solicitante), p!)}>✓ aceitar</button>
                                    <button type="button" className="mini-btn dim" onClick={() => acaoAmizade(() => recusarAmizade(a.solicitante), p!)}>✕ recusar</button>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div style={{ marginTop: 18 }}>
                          <h3 style={{ fontSize: 13, letterSpacing: 1 }}>MEUS AMIGOS{amigos.length > 0 ? ` (${amigos.length})` : ''}</h3>
                          {amigos.length === 0 ? (
                            <p className="vazio">nenhum amigo ainda — busque um apelido acima</p>
                          ) : (
                            amigos.map((a) => {
                              const p = perfisAmizade.get(a.destinatario);
                              return (
                                <div className="linha" key={a.destinatario} style={{ padding: '8px 0' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Avatar url={p?.avatar_url} nome={p?.apelido} tamanho={26} />
                                    <Link href={`/jogador/${a.destinatario}`}><strong>{p?.apelido ?? 'membro'}</strong></Link>
                                  </div>
                                  <button type="button" className="mini-btn dim" onClick={() => acaoAmizade(() => desfazerAmizade(a.destinatario), p!)}>desfazer</button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </>
                    )}
                  </section>
                );
              })()}

              <section className="panel login" style={{ marginTop: 24 }}>
                <h2 className="login-t" style={{ fontSize: 18 }}>MEUS ENVIOS</h2>
                <p className="login-s">&gt; fichas e crônicas que você enviou para análise</p>

                {carregandoEnvios ? (
                  <div className="load"><span /><span /><span /></div>
                ) : meusPersonagens.length === 0 && meusEventos.length === 0 && minhasFaccoes.length === 0 ? (
                  <p className="vazio">
                    nenhum envio ainda —{' '}
                    <Link href="/personagens/nova" style={{ color: 'var(--d-osso)' }}>enviar personagem</Link>
                    {', '}
                    <Link href="/cronicas/nova" style={{ color: 'var(--d-osso)' }}>enviar crônica</Link>
                    {' ou '}
                    <Link href="/faccoes/nova" style={{ color: 'var(--d-osso)' }}>propor facção</Link>
                  </p>
                ) : (
                  <>
                    {meusPersonagens.map((c) => (
                      <div className="linha" key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(233,228,218,.12)' }}>
                        <strong>{c.name || 'sem nome'}</strong>
                        <span className={`selo-${c.status_aprovacao}`} style={{ marginLeft: 10 }}>{ROTULO_STATUS[c.status_aprovacao]}</span>
                        {c.status_aprovacao === 'reprovado' && c.motivo_reprovacao && (
                          <p className="dica" style={{ margin: '6px 0' }}>motivo: {c.motivo_reprovacao}</p>
                        )}
                        <div style={{ marginTop: 6 }}>
                          {c.status_aprovacao === 'aprovado' && <Link href={`/personagem/${c.slug || c.id}`}>ver a página</Link>}
                          {c.status_aprovacao !== 'aprovado' && <Link href={`/personagens/editar/${c.id}`}>editar e reenviar</Link>}
                        </div>
                      </div>
                    ))}
                    {meusEventos.map((ev) => (
                      <div className="linha" key={ev.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(233,228,218,.12)' }}>
                        <strong>{ev.titulo}</strong>
                        <span className={`selo-${ev.status_aprovacao}`} style={{ marginLeft: 10 }}>{ROTULO_STATUS[ev.status_aprovacao]}</span>
                        {ev.status_aprovacao === 'reprovado' && ev.motivo_reprovacao && (
                          <p className="dica" style={{ margin: '6px 0' }}>motivo: {ev.motivo_reprovacao}</p>
                        )}
                        <div style={{ marginTop: 6 }}>
                          {ev.status_aprovacao === 'aprovado' && <Link href="/cronicas">ver a crônica</Link>}
                          {ev.status_aprovacao !== 'aprovado' && <Link href={`/cronicas/editar/${ev.id}`}>editar e reenviar</Link>}
                        </div>
                      </div>
                    ))}
                    {minhasFaccoes.map((fa) => (
                      <div className="linha" key={fa.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(233,228,218,.12)' }}>
                        <strong>{fa.nome}</strong>
                        <span className={`selo-${fa.status_aprovacao}`} style={{ marginLeft: 10 }}>{ROTULO_STATUS[fa.status_aprovacao]}</span>
                        {fa.status_aprovacao === 'reprovado' && fa.motivo_reprovacao && (
                          <p className="dica" style={{ margin: '6px 0' }}>motivo: {fa.motivo_reprovacao}</p>
                        )}
                        <div style={{ marginTop: 6 }}>
                          {fa.status_aprovacao === 'aprovado' && <Link href={`/faccoes/${fa.slug}`}>ver a página</Link>}
                          {fa.status_aprovacao !== 'aprovado' && <Link href={`/faccoes/editar/${fa.slug}`}>editar e reenviar</Link>}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </section>
            </div>
          </div>
        )}

        <footer className="ft">terrasave_system v1.0 // conexão segura estabelecida</footer>
      </main>
    </div>
  );
}
