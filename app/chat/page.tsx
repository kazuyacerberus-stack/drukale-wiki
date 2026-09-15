'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import '../matrix.css';
import { supabase } from '../lib/db';
import { sair } from '../lib/auth';
import { garantirPerfil, estaMudo, type Perfil } from '../lib/perfil';
import { subirAnexoChat, urlAnexoChat, validarAnexoChat, mensagemChat, type AnexoChat, type Mensagem } from '../lib/chat';
import Avatar from '../components/Avatar';
import GifPicker from '../components/GifPicker';
import s from './chat.module.css';

const TAMANHO = 30;
type PerfilLeve = { apelido: string; avatar_url: string | null; banido: boolean };
type AnexoArquivo = { file: File; preview: string; tipo: 'imagem' | 'video' };

function Midia({ anexo }: { anexo: AnexoChat }) {
  const [falhou, setFalhou] = useState(false);
  const url = 'caminho' in anexo ? urlAnexoChat(anexo.caminho) : anexo.url;
  const figurinha = anexo.tipo === 'figurinha' || anexo.tipo === 'gif';
  if (falhou) return <p>Não foi possível exibir {anexo.nome}.</p>;
  return (
    <div className={`${s.bolhaMidia} ${figurinha ? s.figurinhaMidia : ''}`}>
      {anexo.tipo === 'video'
        ? <video src={url} controls preload="metadata" playsInline aria-label={anexo.nome} onError={() => setFalhou(true)} />
        : <img src={url} alt={anexo.nome} loading="lazy" onError={() => setFalhou(true)} />}
    </div>
  );
}

export default function ChatPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authPronto, setAuthPronto] = useState(false);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [perfilProprio, setPerfilProprio] = useState<Perfil | null>(null);
  const [perfis, setPerfis] = useState<Map<string, PerfilLeve>>(new Map());
  const [emails, setEmails] = useState<Map<string, string>>(new Map());
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [temMais, setTemMais] = useState(false);
  const [erroFeed, setErroFeed] = useState('');
  const [texto, setTexto] = useState('');
  const [anexoArquivo, setAnexoArquivo] = useState<AnexoArquivo | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState('');
  const [gifAberto, setGifAberto] = useState(false);

  const janelaRef = useRef<HTMLDivElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const perfisRef = useRef(perfis);
  perfisRef.current = perfis;
  const buscandoPerfil = useRef<Set<string>>(new Set());

  /* -------- sessão -------- */
  useEffect(() => {
    let vivo = true;
    supabase.auth.getSession().then(({ data }) => { if (vivo) { setUserId(data.session?.user.id ?? null); setAuthPronto(true); } });
    const { data } = supabase.auth.onAuthStateChange((_ev, sessao) => { setUserId(sessao?.user.id ?? null); setAuthPronto(true); });
    return () => { vivo = false; data.subscription.unsubscribe(); };
  }, []);

  /* -------- perfil próprio, papel de admin e lista de perfis -------- */
  const mesclarPerfis = useCallback((linhas: { user_id: string; apelido: string; avatar_url: string | null; banido: boolean }[]) => {
    setPerfis((prev) => {
      const novo = new Map(prev);
      for (const l of linhas) novo.set(l.user_id, { apelido: l.apelido, avatar_url: l.avatar_url, banido: l.banido });
      return novo;
    });
  }, []);

  useEffect(() => {
    if (!userId) { setPerfilProprio(null); setEhAdmin(false); return; }
    let vivo = true;
    (async () => {
      const [p, admin, todos] = await Promise.all([
        garantirPerfil(),
        supabase.rpc('drk_e_admin'),
        supabase.from('profiles').select('user_id,apelido,avatar_url,banido'),
      ]);
      if (!vivo) return;
      setPerfilProprio(p);
      setEhAdmin(admin.data === true);
      if (todos.data) mesclarPerfis(todos.data as { user_id: string; apelido: string; avatar_url: string | null; banido: boolean }[]);
      if (admin.data === true) {
        const lista = await supabase.rpc('drk_admin_listar_perfis');
        if (vivo && lista.data) {
          const mapa = new Map<string, string>();
          for (const r of lista.data as { user_id: string; email: string }[]) mapa.set(r.user_id, r.email);
          setEmails(mapa);
        }
      }
    })();
    return () => { vivo = false; };
  }, [userId, mesclarPerfis]);

  const perfilDe = useCallback((uid: string): PerfilLeve => {
    return perfisRef.current.get(uid) ?? { apelido: 'membro', avatar_url: null, banido: false };
  }, []);

  const buscarPerfilFaltante = useCallback((uid: string) => {
    if (perfisRef.current.has(uid) || buscandoPerfil.current.has(uid)) return;
    buscandoPerfil.current.add(uid);
    supabase.from('profiles').select('user_id,apelido,avatar_url,banido').eq('user_id', uid).maybeSingle()
      .then(({ data }) => { if (data) mesclarPerfis([data as { user_id: string; apelido: string; avatar_url: string | null; banido: boolean }]); });
  }, [mesclarPerfis]);

  /* -------- mensagens iniciais -------- */
  useEffect(() => {
    if (!userId) return;
    let vivo = true;
    setCarregando(true); setErroFeed('');
    supabase.from('chat_mensagens').select('*').order('created_at', { ascending: false }).limit(TAMANHO)
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error) { setErroFeed(mensagemChat(error)); setCarregando(false); return; }
        const linhas = ((data ?? []) as Mensagem[]).slice().reverse();
        setMensagens(linhas);
        setTemMais((data ?? []).length === TAMANHO);
        setCarregando(false);
        window.setTimeout(() => { if (janelaRef.current) janelaRef.current.scrollTop = janelaRef.current.scrollHeight; }, 0);
      });
    return () => { vivo = false; };
  }, [userId]);

  /* -------- tempo real -------- */
  useEffect(() => {
    if (!userId) return;
    const canal = supabase
      .channel('chat_mensagens')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mensagens' }, (payload) => {
        const nova = payload.new as Mensagem;
        buscarPerfilFaltante(nova.user_id);
        const el = janelaRef.current;
        const pertoDoFim = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 160;
        setMensagens((prev) => (prev.some((m) => m.id === nova.id) ? prev : [...prev, nova]));
        if (pertoDoFim) window.setTimeout(() => { if (janelaRef.current) janelaRef.current.scrollTop = janelaRef.current.scrollHeight; }, 30);
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [userId, buscarPerfilFaltante]);

  const carregarMais = async () => {
    if (!mensagens.length) return;
    setCarregandoMais(true);
    const el = janelaRef.current;
    const alturaAntes = el?.scrollHeight ?? 0;
    const { data, error } = await supabase.from('chat_mensagens').select('*').lt('created_at', mensagens[0].created_at).order('created_at', { ascending: false }).limit(TAMANHO);
    if (!error) {
      const linhas = ((data ?? []) as Mensagem[]).slice().reverse();
      setMensagens((prev) => [...linhas, ...prev]);
      setTemMais((data ?? []).length === TAMANHO);
      window.setTimeout(() => { if (el) el.scrollTop = el.scrollHeight - alturaAntes; }, 0);
    }
    setCarregandoMais(false);
  };

  /* -------- composer -------- */
  useEffect(() => {
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(140, el.scrollHeight)}px`; }
  }, [texto]);

  const escolherArquivo = (file: File | null) => {
    setErroEnvio('');
    if (!file) return;
    const problema = validarAnexoChat(file);
    if (problema) { setErroEnvio(problema); if (arquivoRef.current) arquivoRef.current.value = ''; return; }
    if (anexoArquivo) URL.revokeObjectURL(anexoArquivo.preview);
    setAnexoArquivo({ file, preview: URL.createObjectURL(file), tipo: file.type.startsWith('video/') ? 'video' : 'imagem' });
  };
  const removerAnexo = () => {
    if (anexoArquivo) URL.revokeObjectURL(anexoArquivo.preview);
    setAnexoArquivo(null);
    if (arquivoRef.current) arquivoRef.current.value = '';
  };

  const suspenso = Boolean(perfilProprio?.banido);
  const mudo = estaMudo(perfilProprio);
  const composerDesabilitado = !userId || suspenso || mudo || enviando;

  const enviar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!userId || composerDesabilitado) return;
    const textoLimpo = texto.trim();
    if (!textoLimpo && !anexoArquivo) return;
    setEnviando(true); setErroEnvio('');
    try {
      let anexo: AnexoChat | null = null;
      if (anexoArquivo) {
        const { caminho, nome } = await subirAnexoChat(anexoArquivo.file, userId);
        anexo = { tipo: anexoArquivo.tipo, caminho, nome };
      }
      const { error } = await supabase.from('chat_mensagens').insert({ id: crypto.randomUUID(), user_id: userId, texto: textoLimpo || null, anexo });
      if (error) throw error;
      setTexto('');
      removerAnexo();
    } catch (err) {
      setErroEnvio(mensagemChat(err));
    } finally {
      setEnviando(false);
    }
  };

  const enviarGif = async (anexo: { tipo: 'gif' | 'figurinha'; url: string; nome: string }) => {
    if (!userId || composerDesabilitado) return;
    setGifAberto(false);
    try {
      const { error } = await supabase.from('chat_mensagens').insert({ id: crypto.randomUUID(), user_id: userId, texto: null, anexo });
      if (error) throw error;
    } catch (err) {
      setErroEnvio(mensagemChat(err));
    }
  };

  const teclaComposer = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void enviar(); }
  };

  /* -------- moderação rápida (admin) -------- */
  const silenciarRapido = async (alvo: string) => {
    const ate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { error } = await supabase.rpc('drk_silenciar_usuario', { alvo, ate });
    if (!error) mesclarPerfis([{ ...perfilDe(alvo), user_id: alvo }]);
  };
  const alternarExpulsao = async (alvo: string, estado: boolean) => {
    const { error } = await supabase.rpc('drk_expulsar_usuario', { alvo, expulso: estado });
    if (!error) mesclarPerfis([{ user_id: alvo, apelido: perfilDe(alvo).apelido, avatar_url: perfilDe(alvo).avatar_url, banido: estado }]);
  };

  if (!authPronto) {
    return <div className={s.terminal}><div className={s.wrap}><p className={s.portao}>verificando sessão…</p></div></div>;
  }

  if (!userId) {
    return (
      <div className={s.terminal}>
        <div className={s.wrap}>
          <header className={s.topo}>
            <span className={s.caminho}><i /> drukale://chat</span>
            <nav><Link href="/">◄ Arquivo</Link><Link href="/cenas">▤ cenas</Link></nav>
          </header>
          <div className={s.portao}>
            <h1>CHAT FECHADO</h1>
            <p>O chat é só para quem tem conta na wiki.</p>
            <div className={s.acoesPortao}>
              <Link href="/admin/login" className={s.primario} style={{ padding: '10px 16px', borderRadius: 3 }}>Entrar</Link>
              <Link href="/cadastro">Criar conta</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.terminal}>
      <div className={s.wrap}>
        <header className={s.topo}>
          <span className={s.caminho}><i /> drukale://chat</span>
          <nav aria-label="Navegação">
            <Link href="/">◄ Arquivo</Link>
            <Link href="/cenas">▤ cenas</Link>
            <Link href="/perfil">perfil</Link>
            {ehAdmin && <Link href="/admin/comunidade">moderação</Link>}
            <button onClick={async () => { await sair(); }}>sair</button>
          </nav>
        </header>

        {erroFeed && <div className={s.erro} role="alert">{erroFeed}</div>}

        <div className={s.janela} ref={janelaRef} aria-busy={carregando}>
          {temMais && (
            <button className={s.carregarAntigas} disabled={carregandoMais} onClick={carregarMais}>
              {carregandoMais ? 'carregando…' : '↑ carregar mensagens antigas'}
            </button>
          )}
          {carregando && <p className={s.vazioChat}>decodificando canal…</p>}
          {!carregando && mensagens.length === 0 && <p className={s.vazioChat}>Nenhuma mensagem ainda. Diga olá!</p>}
          {mensagens.map((m) => {
            const perfil = perfilDe(m.user_id);
            const propria = m.user_id === userId;
            const hora = new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={m.id} className={`${s.linhaMsg} ${propria ? s.propria : ''}`}>
                <Avatar url={perfil.avatar_url} nome={perfil.apelido} tamanho={34} />
                <div className={s.corpoMsg}>
                  <div className={s.cabecalhoMsg}>
                    <span className={s.apelidoMsg}>{propria ? 'você' : perfil.apelido}</span>
                    <span>{hora}</span>
                    {ehAdmin && emails.get(m.user_id) && <span className={s.emailAdmin}>({emails.get(m.user_id)})</span>}
                  </div>
                  <div className={s.bolha}>
                    {m.texto && <p className={s.bolhaTexto}>{m.texto}</p>}
                    {m.anexo && <Midia anexo={m.anexo} />}
                  </div>
                  {ehAdmin && !propria && (
                    <div className={s.acoesAdmin}>
                      <button type="button" onClick={() => silenciarRapido(m.user_id)}>🔇 silenciar 1h</button>
                      <button type="button" onClick={() => alternarExpulsao(m.user_id, !perfil.banido)}>
                        {perfil.banido ? '✓ reintegrar' : '⛔ expulsar'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className={s.composerZona}>
          {suspenso && <p className={s.avisoComposer}>Sua conta foi suspensa — você não consegue mais postar aqui.</p>}
          {!suspenso && mudo && perfilProprio?.muted_until && (
            <p className={s.avisoComposer}>Você está silenciado até {new Date(perfilProprio.muted_until).toLocaleString('pt-BR')}.</p>
          )}
          {erroEnvio && <p className={s.avisoComposer}>{erroEnvio}</p>}
          {anexoArquivo && (
            <div className={s.anexoPreview}>
              {anexoArquivo.tipo === 'video'
                ? <video src={anexoArquivo.preview} muted />
                : <img src={anexoArquivo.preview} alt="" />}
              <span>{anexoArquivo.file.name}</span>
              <button type="button" onClick={removerAnexo}>remover</button>
            </div>
          )}
          <form className={s.composer} onSubmit={enviar}>
            <label className={s.btnIcone} title="Anexar imagem ou vídeo">
              📎
              <input
                ref={arquivoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                style={{ display: 'none' }}
                disabled={composerDesabilitado}
                onChange={(e) => { escolherArquivo(e.target.files?.[0] ?? null); e.target.value = ''; }}
              />
            </label>
            <button type="button" className={s.btnIcone} title="GIF ou figurinha" disabled={composerDesabilitado} onClick={() => setGifAberto((v) => !v)}>🖼</button>
            {gifAberto && <GifPicker onFechar={() => setGifAberto(false)} onEscolher={enviarGif} />}
            <textarea
              ref={textareaRef}
              value={texto}
              disabled={composerDesabilitado}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={teclaComposer}
              placeholder={suspenso ? 'você não pode postar' : mudo ? 'você está silenciado' : 'escreva uma mensagem…'}
              rows={1}
            />
            <button type="submit" className={`${s.btnIcone} ${s.primario}`} disabled={composerDesabilitado || (!texto.trim() && !anexoArquivo)} title="Enviar">➤</button>
          </form>
        </div>
      </div>
    </div>
  );
}
