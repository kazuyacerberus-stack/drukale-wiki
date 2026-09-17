'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../matrix.css';
import MatrixRain from '../components/MatrixRain';
import Avatar from '../components/Avatar';
import { supabase, type Character } from '../lib/db';
import { sair } from '../lib/auth';
import { garantirPerfil, salvarPerfil, validarAvatar, estaMudo, mensagemPerfil, type Perfil } from '../lib/perfil';
import { type Evento } from '../lib/eventos';

const ROTULO_STATUS: Record<string, string> = { pendente: 'em análise', aprovado: 'aprovado', reprovado: 'reprovado' };

type ContaAdmin = {
  user_id: string; email: string; apelido: string; status_conta: 'pendente' | 'aprovado' | 'reprovado';
};
type Resumo = { contas_pendentes: number; contas_aprovadas: number; fichas_pendentes: number; eventos_pendentes: number; banidos: number };

export default function PerfilPage() {
  const router = useRouter();
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [apelido, setApelido] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const [meusPersonagens, setMeusPersonagens] = useState<Character[]>([]);
  const [meusEventos, setMeusEventos] = useState<Evento[]>([]);
  const [carregandoEnvios, setCarregandoEnvios] = useState(true);

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
      const [p, personagens, eventos, admin] = await Promise.all([
        garantirPerfil(),
        supabase.from('characters').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('eventos').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.rpc('drk_e_admin'),
      ]);
      if (!vivo) return;
      setPerfil(p);
      setApelido(p?.apelido ?? '');
      setMeusPersonagens((personagens.data ?? []) as Character[]);
      setMeusEventos((eventos.data ?? []) as Evento[]);
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

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const escolherAvatar = (file: File | null) => {
    setErro('');
    if (!file) { setAvatar(null); setPreview(''); return; }
    const problema = validarAvatar(file);
    if (problema) { setErro(problema); if (arquivoRef.current) arquivoRef.current.value = ''; return; }
    if (preview) URL.revokeObjectURL(preview);
    setAvatar(file);
    setPreview(URL.createObjectURL(file));
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(''); setAviso('');
    const apelidoLimpo = apelido.trim();
    if (apelidoLimpo.length < 2 || apelidoLimpo.length > 32) {
      setErro('O apelido precisa ter entre 2 e 32 caracteres.');
      return;
    }
    setSalvando(true);
    try {
      const atualizado = await salvarPerfil(apelidoLimpo, avatar);
      setPerfil(atualizado);
      setApelido(atualizado.apelido);
      if (preview) URL.revokeObjectURL(preview);
      setAvatar(null); setPreview('');
      if (arquivoRef.current) arquivoRef.current.value = '';
      setAviso('Perfil atualizado.');
    } catch (err) {
      setErro(err instanceof Error ? err.message : mensagemPerfil(err));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="term">
      <MatrixRain />
      <main className="wrap login-wrap">
        <div className="hd-bar">
          <span className="dot" /><span className="dot" /><span className="dot" />
          <span className="hd-path">drukale://minha-conta</span>
          <div className="hd-act">
            <Link className="ico" href="/">← arquivo</Link>
            <Link className="ico" href="/chat">chat</Link>
            <Link className="ico" href="/cenas">cenas</Link>
            {ehAdmin && <Link className="ico" href="/admin">painel completo</Link>}
            <button className="ico dim" onClick={async () => { await sair(); router.replace('/'); }}>sair</button>
          </div>
        </div>

        {ehAdmin && (
          <section className="panel login" style={{ marginBottom: 24 }}>
            <h2 className="login-t" style={{ fontSize: 18 }}>PAINEL DO GAME MASTER</h2>
            <p className="login-s">&gt; aprovar contas novas, direto daqui</p>

            {erroPainel && <p className="stat bad">FALHA :: {erroPainel}</p>}

            {resumo && (
              <div className="imp-numeros" style={{ margin: '14px 0' }}>
                <div className="imp-numero"><strong>{resumo.contas_pendentes}</strong><span>contas pendentes</span></div>
                <div className="imp-numero"><strong>{resumo.fichas_pendentes}</strong><span>fichas pendentes</span></div>
                <div className="imp-numero"><strong>{resumo.eventos_pendentes}</strong><span>eventos pendentes</span></div>
                <div className="imp-numero"><strong>{resumo.banidos}</strong><span>banidos/silenciados</span></div>
              </div>
            )}

            {contasPendentes.length === 0 ? (
              <p className="vazio">nenhuma conta esperando aprovação no momento</p>
            ) : (
              contasPendentes.map((c) => (
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
              ))
            )}

            <p className="dica" style={{ marginTop: 14 }}>
              Fichas, eventos e moderação de chat: <Link href="/admin" style={{ color: 'var(--g)' }}>abrir o painel completo →</Link>
            </p>
          </section>
        )}

        {!carregandoPerfil && perfil && perfil.status_conta !== 'aprovado' && (
          <p className="stat bad" style={{ marginBottom: 18 }}>
            {perfil.status_conta === 'pendente'
              ? 'Sua conta está aguardando aprovação do game master — você ainda não consegue ver o resto do site.'
              : `Seu cadastro não foi aprovado${perfil.motivo_reprovacao ? `: ${perfil.motivo_reprovacao}` : '.'}`}
          </p>
        )}

        {carregandoPerfil ? (
          <div className="load"><span /><span /><span /><p>carregando perfil...</p></div>
        ) : (
          <form className="panel login" onSubmit={salvar}>
            <h1 className="login-t">MEU PERFIL</h1>
            <p className="login-s">&gt; apelido e foto usados nas cenas e no chat</p>

            <div style={{ display: 'grid', justifyItems: 'center', gap: 8, margin: '4px 0 14px' }}>
              <Avatar url={preview || perfil?.avatar_url} nome={apelido} tamanho={72} />
              <label className="mini-btn" style={{ cursor: 'pointer' }}>
                trocar foto
                <input
                  ref={arquivoRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={(e) => escolherAvatar(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            {perfil && (perfil.banido || estaMudo(perfil)) && (
              <p className="stat bad">
                {perfil.banido ? 'Sua conta foi suspensa — você não consegue mais postar.' : `Você está silenciado até ${new Date(perfil.muted_until as string).toLocaleString('pt-BR')}.`}
              </p>
            )}

            <div className="field">
              <label>apelido</label>
              <input value={apelido} onChange={(e) => setApelido(e.target.value)} maxLength={32} required />
            </div>

            <button className="go" disabled={salvando}>{salvando ? '// salvando...' : 'SALVAR'}</button>

            {erro && <p className="stat bad">FALHA :: {erro}</p>}
            {aviso && <p className="stat ok">{aviso}</p>}
          </form>
        )}

        {!carregandoPerfil && (
          <section className="panel login" style={{ marginTop: 24 }}>
            <h2 className="login-t" style={{ fontSize: 18 }}>MEUS ENVIOS</h2>
            <p className="login-s">&gt; fichas e eventos que você enviou para análise</p>

            {carregandoEnvios ? (
              <div className="load"><span /><span /><span /></div>
            ) : meusPersonagens.length === 0 && meusEventos.length === 0 ? (
              <p className="vazio">
                nenhum envio ainda —{' '}
                <Link href="/personagens/nova" style={{ color: 'var(--g)' }}>enviar personagem</Link>
                {' '}ou{' '}
                <Link href="/linha-do-tempo/nova" style={{ color: 'var(--g)' }}>enviar evento</Link>
              </p>
            ) : (
              <>
                {meusPersonagens.map((c) => (
                  <div className="linha" key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(0,255,102,.12)' }}>
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
                  <div className="linha" key={ev.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(0,255,102,.12)' }}>
                    <strong>{ev.titulo}</strong>
                    <span className={`selo-${ev.status_aprovacao}`} style={{ marginLeft: 10 }}>{ROTULO_STATUS[ev.status_aprovacao]}</span>
                    {ev.status_aprovacao === 'reprovado' && ev.motivo_reprovacao && (
                      <p className="dica" style={{ margin: '6px 0' }}>motivo: {ev.motivo_reprovacao}</p>
                    )}
                    <div style={{ marginTop: 6 }}>
                      {ev.status_aprovacao === 'aprovado' && <Link href="/linha-do-tempo">ver a linha do tempo</Link>}
                      {ev.status_aprovacao !== 'aprovado' && <Link href={`/linha-do-tempo/editar/${ev.id}`}>editar e reenviar</Link>}
                    </div>
                  </div>
                ))}
              </>
            )}
          </section>
        )}

        <footer className="ft">drukale_system v1.0 // conexão segura estabelecida</footer>
      </main>
    </div>
  );
}
