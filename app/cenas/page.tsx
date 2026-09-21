'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import '../matrix.css';
import { supabase } from '../lib/db';
import { entrar } from '../lib/auth';
import { BUCKET_CENAS, TIPOS_CENA, normalizarCena, validarAnexoCena, mensagemCena, urlAnexoCena, type Cena, type AnexoCena, type TipoCena } from '../lib/cenas';
import { REACOES, ICONE_REACAO, type Reacao } from '../lib/comentarios';
import Avatar from '../components/Avatar';
import PrecisaAprovacao from '../components/PrecisaAprovacao';
import Comentarios from './Comentarios';
import s from './cenas.module.css';

type PerfilLeve = { apelido: string; avatar_url: string | null; banido: boolean };

type Arquivo = { id: string; file: File; preview: string };
const TAMANHO = 20;
const vazio = { tipo: TIPOS_CENA[0] as TipoCena, titulo: '', local: '', texto: '', autor: '', personagem: '' };

function Midia({ url, tipo, nome }: { url: string; tipo: string; nome: string }) {
  const [falhou, setFalhou] = useState(false);
  if (falhou) return <p>Não foi possível exibir {nome}. <a href={url} target="_blank" rel="noreferrer">Abrir arquivo</a></p>;
  return tipo.startsWith('video/')
    ? <video src={url} controls preload="metadata" playsInline aria-label={nome} onError={() => setFalhou(true)} />
    : <img src={url} alt={nome} loading="lazy" onError={() => setFalhou(true)} />;
}

export default function CenasPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authPronto, setAuthPronto] = useState(false);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [perfis, setPerfis] = useState<Map<string, PerfilLeve>>(new Map());
  const [emails, setEmails] = useState<Map<string, string>>(new Map());
  const [login, setLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [autenticando, setAutenticando] = useState(false);
  const [erroLogin, setErroLogin] = useState('');
  const [cenas, setCenas] = useState<Cena[]>([]);
  const [filtroPessoa, setFiltroPessoa] = useState('');
  const [filtroLocal, setFiltroLocal] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [locais, setLocais] = useState<string[]>([]);
  const [pessoas, setPessoas] = useState<string[]>([]);
  const [pagina, setPagina] = useState(0);
  const [mais, setMais] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroFeed, setErroFeed] = useState('');
  const [revisao, setRevisao] = useState(0);
  const [comentariosAbertos, setComentariosAbertos] = useState<Set<string>>(new Set());
  const [aberto, setAberto] = useState(false);
  const [ampliado, setAmpliado] = useState(false);
  const [form, setForm] = useState(vazio);
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [progresso, setProgresso] = useState('');
  const [erroForm, setErroForm] = useState('');
  const [aviso, setAviso] = useState('');
  const textoRef = useRef<HTMLTextAreaElement>(null);
  const tituloRef = useRef<HTMLInputElement>(null);
  const novaRef = useRef<HTMLButtonElement>(null);
  const arquivosRef = useRef<Arquivo[]>([]);
  const bloqueio = useRef(false);
  const tentativa = useRef<{ id: string; userId: string; anexos: Map<string, AnexoCena> } | null>(null);
  const requisicao = useRef(0);

  useEffect(() => {
    let vivo = true;
    supabase.auth.getSession().then(({ data }) => { if (vivo) { setUserId(data.session?.user.id ?? null); setAuthPronto(true); } });
    const { data } = supabase.auth.onAuthStateChange((_evento, session) => { setUserId(session?.user.id ?? null); setAuthPronto(true); });
    return () => { vivo = false; data.subscription.unsubscribe(); arquivosRef.current.forEach(a => URL.revokeObjectURL(a.preview)); };
  }, []);

  // apelido/avatar de quem postou só aparece para quem tem conta; e-mail, só para o admin
  useEffect(() => {
    if (!userId) { setEhAdmin(false); return; }
    let vivo = true;
    (async () => {
      const [admin, todos] = await Promise.all([
        supabase.rpc('drk_e_admin'),
        supabase.from('profiles').select('user_id,apelido,avatar_url,banido'),
      ]);
      if (!vivo) return;
      setEhAdmin(admin.data === true);
      if (todos.data) setPerfis(new Map((todos.data as { user_id: string; apelido: string; avatar_url: string | null; banido: boolean }[]).map(p => [p.user_id, p])));
      if (admin.data === true) {
        const lista = await supabase.rpc('drk_admin_listar_perfis');
        if (vivo && lista.data) setEmails(new Map((lista.data as { user_id: string; email: string }[]).map(r => [r.user_id, r.email])));
      }
    })();
    return () => { vivo = false; };
  }, [userId]);

  const silenciarRapido = async (alvo: string) => {
    const ate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await supabase.rpc('drk_silenciar_usuario', { alvo, ate });
  };
  const alternarExpulsao = async (alvo: string, estado: boolean) => {
    const { error } = await supabase.rpc('drk_expulsar_usuario', { alvo, expulso: estado });
    if (!error) setPerfis(prev => { const p = prev.get(alvo); return p ? new Map(prev).set(alvo, { ...p, banido: estado }) : prev; });
  };

  /** Clicar na reação já ativa remove; clicar em outra troca (upsert). Atualização otimista na tela. */
  const reagir = async (cena: Cena, tipo: Reacao) => {
    if (!userId) { setLogin(true); return; }
    const original = cena;
    const removendo = cena.minha_reacao === tipo;
    const reacoes = { ...cena.reacoes };
    if (cena.minha_reacao) reacoes[cena.minha_reacao] = Math.max(0, (reacoes[cena.minha_reacao] ?? 1) - 1);
    if (!removendo) reacoes[tipo] = (reacoes[tipo] ?? 0) + 1;
    setCenas(prev => prev.map(c => c.id === cena.id ? { ...c, reacoes, minha_reacao: removendo ? null : tipo } : c));

    const { error } = removendo
      ? await supabase.from('cena_reacoes').delete().eq('cena_id', cena.id).eq('user_id', userId)
      : await supabase.from('cena_reacoes').upsert({ cena_id: cena.id, user_id: userId, tipo }, { onConflict: 'cena_id,user_id' });
    if (error) {
      setCenas(prev => prev.map(c => c.id === cena.id ? original : c));
      setAviso('FALHA :: ' + mensagemCena(error));
    }
  };

  const alternarComentarios = (id: string) => {
    setComentariosAbertos(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  useEffect(() => {
    const el = textoRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.max(380, el.scrollHeight)}px`; }
  }, [form.texto, aberto, ampliado]);
  useEffect(() => { if (aberto) tituloRef.current?.focus(); }, [aberto]);
  useEffect(() => {
    if (!form.texto && !arquivos.length && !form.titulo) return;
    const alertar = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', alertar);
    return () => window.removeEventListener('beforeunload', alertar);
  }, [form.texto, form.titulo, arquivos.length]);

  useEffect(() => {
    const seq = ++requisicao.current;
    setCarregando(true); setErroFeed('');
    const timer = window.setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('drk_buscar_cenas', { p_pessoa: filtroPessoa.trim(), p_local: filtroLocal, p_tipo: filtroTipo, p_offset: pagina * TAMANHO });
        if (error) throw error;
        if (seq !== requisicao.current) return;
        const rows = (data ?? []) as Cena[];
        setCenas(prev => pagina === 0 ? rows.slice(0, TAMANHO) : [...prev, ...rows.slice(0, TAMANHO).filter(r => !prev.some(p => p.id === r.id))]);
        setMais(rows.length > TAMANHO);
      } catch (e) { if (seq === requisicao.current) setErroFeed(mensagemCena(e)); }
      finally { if (seq === requisicao.current) setCarregando(false); }
    }, 250);
    return () => { window.clearTimeout(timer); requisicao.current++; };
  }, [filtroPessoa, filtroLocal, filtroTipo, pagina, revisao]);

  useEffect(() => {
    let vivo = true;
    supabase.rpc('drk_filtros_cenas').then(({ data, error }) => {
      if (!vivo || error) return;
      const rows = (data ?? []) as { categoria: string; valor: string }[];
      const unicos = (categoria: string) => [...new Map(rows.filter(r => r.categoria === categoria).map(r => [normalizarCena(r.valor), r.valor])).values()].sort((a,b) => a.localeCompare(b, 'pt-BR'));
      setLocais(unicos('local')); setPessoas(unicos('pessoa'));
    });
    return () => { vivo = false; };
  }, [revisao]);

  const mudar = (campo: keyof typeof vazio, valor: string) => setForm(p => ({ ...p, [campo]: valor }));
  const palavras = useMemo(() => form.texto.trim() ? form.texto.trim().split(/\s+/).length : 0, [form.texto]);
  const novaCena = () => { setAviso(''); if (!userId) setLogin(true); else setAberto(true); };
  const atualizar = () => { setPagina(0); setRevisao(r => r + 1); };
  const filtrar = (campo: 'pessoa' | 'local' | 'tipo', valor: string) => {
    setPagina(0); setCenas([]);
    if (campo === 'pessoa') setFiltroPessoa(valor);
    if (campo === 'local') setFiltroLocal(valor);
    if (campo === 'tipo') setFiltroTipo(valor);
  };
  const adicionar = (files: FileList | null) => {
    setErroForm('');
    if (!files) return;
    const lista = Array.from(files);
    if (lista.length + arquivos.length > 4) { setErroForm('Você pode anexar até 4 arquivos por cena.'); return; }
    for (const file of lista) { const erro = validarAnexoCena(file); if (erro) { setErroForm(`${file.name}: ${erro}`); return; } }
    const novos = [...arquivos, ...lista.map(file => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }))];
    arquivosRef.current = novos; setArquivos(novos);
  };
  const remover = (id: string) => {
    const a = arquivos.find(a => a.id === id); if (a) URL.revokeObjectURL(a.preview);
    const novos = arquivos.filter(a => a.id !== id); arquivosRef.current = novos; setArquivos(novos);
  };

  const publicar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bloqueio.current) return;
    if (Object.values(form).some(v => !v.trim())) { setErroForm('Preencha todos os campos, incluindo texto, autor e personagem.'); return; }
    bloqueio.current = true; setSalvando(true); setErroForm('');
    try {
      const { data: auth, error: authErro } = await supabase.auth.getUser();
      if (authErro || !auth.user) throw new Error('Entre novamente para publicar. Seu texto foi mantido nesta página.');
      if (!tentativa.current || tentativa.current.userId !== auth.user.id) tentativa.current = { id: crypto.randomUUID(), userId: auth.user.id, anexos: new Map() };
      const t = tentativa.current;
      // Um mesmo ID é reutilizado em novas tentativas: conexão interrompida não duplica a cena.
      const { data: existente, error: consultaErro } = await supabase.from('cenas').select('id').eq('id', t.id).maybeSingle();
      if (consultaErro) throw consultaErro;
      if (!existente) {
        const anexos: AnexoCena[] = [];
        for (let i = 0; i < arquivos.length; i++) {
          const a = arquivos[i];
          setProgresso(`Enviando anexo ${i + 1} de ${arquivos.length}…`);
          let anexo = t.anexos.get(a.id);
          if (!anexo) {
            const ext = a.file.type.split('/')[1].replace('jpeg', 'jpg');
            const caminho = `${auth.user.id}/${t.id}/${a.id}.${ext}`;
            const { error } = await supabase.storage.from(BUCKET_CENAS).upload(caminho, a.file, { contentType: a.file.type, upsert: true });
            if (error) throw error;
            anexo = { caminho, nome: a.file.name.slice(0, 240), tipo: a.file.type }; t.anexos.set(a.id, anexo);
          }
          anexos.push(anexo);
        }
        setProgresso('Publicando cena…');
        const { error } = await supabase.from('cenas').insert({ id: t.id, user_id: auth.user.id, ...Object.fromEntries(Object.entries(form).map(([k,v]) => [k,v.trim()])), anexos });
        if (error) throw error;
      }
      arquivos.forEach(a => URL.revokeObjectURL(a.preview)); arquivosRef.current = []; setArquivos([]);
      tentativa.current = null; setForm(vazio); setAberto(false); setAmpliado(false);
      setFiltroPessoa(''); setFiltroLocal(''); setFiltroTipo(''); atualizar();
      setAviso('Cena publicada. Ela já está disponível no arquivo.'); novaRef.current?.focus();
    } catch (e) { setErroForm(mensagemCena(e)); }
    finally { bloqueio.current = false; setSalvando(false); setProgresso(''); }
  };

  const autenticar = async (e: React.FormEvent) => {
    e.preventDefault(); setAutenticando(true); setErroLogin('');
    try { await entrar(email.trim(), senha); setSenha(''); setLogin(false); setAberto(true); }
    catch (e) { setErroLogin(mensagemCena(e)); }
    finally { setAutenticando(false); }
  };

  return <main className={s.terminal}>
    <div className={s.wrap}>
      <header className={s.topo}>
        <span className={s.caminho}><i /> terrasave://arquivo/cenas</span>
        <nav aria-label="Navegação"><Link href="/">◄ Arquivo</Link><Link href="/personagens">personagens</Link><Link href="/faccoes">Facções</Link><Link href="/linha-do-tempo">Linha do tempo</Link><Link href="/cronicas">Crônicas</Link><Link href="/eventos">Eventos</Link><Link href="/glossario">Glossário</Link><Link href="/mundo">◍ Mundo Terra Save</Link><Link href="/chat">chat</Link>{userId && <Link href="/perfil">perfil</Link>}{ehAdmin && <Link href="/admin/comunidade">moderação</Link>}</nav>
      </header>
      <PrecisaAprovacao>
      <section className={s.hero}>
        <div><p className={s.eyebrow}>TERRA SAVE / REGISTROS NARRATIVOS</p><h1>ARQUIVO DE CENAS<span>_</span></h1><p>Cada personagem deixa um rastro. Registre o seu.</p></div>
        <button className={s.primario} ref={novaRef} disabled={!authPronto || salvando} onClick={novaCena}>＋ NOVA CENA</button>
      </section>
      <div className={s.status}><span>● {userId ? 'ACESSO IDENTIFICADO' : 'ARQUIVO PÚBLICO'}</span><span>TERMINAL DE MEMÓRIAS // 01</span></div>
      {aviso && <p className={s.aviso} role="status">{aviso}</p>}
      {login && <section className={s.painel} aria-labelledby="login-titulo"><h2 id="login-titulo">Identifique-se para publicar</h2><p>Entre com sua conta. <Link href="/cadastro">Não tem conta? Cadastre-se</Link></p><form onSubmit={autenticar} className={s.login}>
        <label>E-mail<input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Senha<input type="password" required autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)} /></label>
        <button className={s.primario} disabled={autenticando}>{autenticando ? 'Entrando…' : 'Entrar'}</button><button type="button" disabled={autenticando} onClick={() => { setLogin(false); setSenha(''); }}>Fechar</button>
      </form>{erroLogin && <p role="alert" className={s.erro}>{erroLogin}</p>}</section>}

      {aberto && <section className={`${s.painel} ${s.compositor} ${ampliado ? s.ampliado : ''}`} aria-labelledby="editor-titulo">
        <div className={s.linha}><h2 id="editor-titulo">NOVA CENA</h2><button type="button" aria-pressed={ampliado} onClick={() => setAmpliado(v => !v)}>{ampliado ? '↙ Reduzir editor' : '⤢ Ampliar editor'}</button></div>
        <form onSubmit={publicar}><fieldset disabled={salvando}>
          <div className={s.campos}><label>Tipo de cena<select value={form.tipo} onChange={e => mudar('tipo', e.target.value)}>{TIPOS_CENA.map(t => <option key={t}>{t}</option>)}</select></label><label>Local ou ambiente<input required maxLength={120} list="cenas-locais" value={form.local} placeholder="Ex.: Castle del Las Noches" onChange={e => mudar('local', e.target.value)} /></label></div>
          <label>Título da cena<input className={s.tituloInput} ref={tituloRef} required maxLength={160} value={form.titulo} placeholder="Dê um nome a esta memória…" onChange={e => mudar('titulo', e.target.value)} /></label>
          <div className={s.editorBar}><label htmlFor="cena-texto">Texto da cena</label><span>PT-BR · {palavras} palavras</span></div>
          <textarea id="cena-texto" ref={textoRef} className={s.editor} lang="pt-BR" spellCheck autoCorrect="on" required maxLength={50000} value={form.texto} onChange={e => mudar('texto', e.target.value)} placeholder="O que aconteceu com o seu personagem? Escreva sua cena aqui…" aria-describedby="corretor-ajuda" />
          <p id="corretor-ajuda" className={s.ajuda}>O texto cresce enquanto você escreve. Ative a verificação ortográfica em português no navegador para destacar palavras incorretas.</p>
          <div className={s.anexar}><label>Imagem, vídeo ou GIF<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={e => { adicionar(e.target.files); e.target.value = ''; }} /></label><span>Até 4 arquivos · 40 MB por arquivo</span></div>
          {arquivos.length > 0 && <div className={s.midias}>{arquivos.map(a => <figure key={a.id}><Midia url={a.preview} tipo={a.file.type} nome={a.file.name} /><figcaption>{a.file.name} <button type="button" aria-label={`Remover ${a.file.name}`} onClick={() => remover(a.id)}>Remover</button></figcaption></figure>)}</div>}
          <label>Nome do autor<input required maxLength={100} value={form.autor} onChange={e => mudar('autor', e.target.value)} placeholder="Seu nome ou pseudônimo" /></label>
          <label>Nome do personagem<input required maxLength={100} value={form.personagem} onChange={e => mudar('personagem', e.target.value)} placeholder="Quem vive esta cena?" /></label>
          <div className={s.acoes}><button type="button" onClick={() => { setAberto(false); setAmpliado(false); novaRef.current?.focus(); }}>Fechar e manter texto</button><button className={s.primario} type="submit">PUBLICAR CENA ↗</button></div>
        </fieldset></form>
        {salvando && <p role="status">{progresso || 'Verificando sessão…'}</p>}
        {erroForm && <p className={s.erro} role="alert">{erroForm}</p>}
        {!userId && <button onClick={() => setLogin(true)}>Entrar novamente</button>}
      </section>}

      <div className={s.layout}>
        <aside className={`${s.painel} ${s.filtros}`} aria-label="Filtros de cenas"><p className={s.eyebrow}>01 / BUSCA NO ARQUIVO</p><h2>Localizar cenas</h2>
          <label>Autor ou personagem<input type="search" list="cenas-pessoas" value={filtroPessoa} placeholder="Digite um nome…" onChange={e => filtrar('pessoa', e.target.value)} /></label>
          <label>Local<select value={filtroLocal} onChange={e => filtrar('local', e.target.value)}><option value="">Todos os locais</option>{locais.map(l => <option key={l}>{l}</option>)}</select></label>
          <label>Tipo de cena<select value={filtroTipo} onChange={e => filtrar('tipo', e.target.value)}><option value="">Todos os tipos</option>{TIPOS_CENA.map(t => <option key={t}>{t}</option>)}</select></label>
          <button onClick={() => { setFiltroPessoa(''); setFiltroLocal(''); setFiltroTipo(''); setPagina(0); }}>Limpar filtros</button>
          <p className={s.ajuda}>Novos autores, personagens e locais entram nos filtros conforme as cenas são publicadas.</p>
          <div className={s.selo} aria-hidden="true">╬<br />TERRA SAVE<br /><small>MEMÓRIA DO IMPÉRIO</small></div>
          {userId && <button onClick={async () => { const { error } = await supabase.auth.signOut(); if (error) setAviso(mensagemCena(error)); }}>Sair da conta</button>}
        </aside>
        <section className={s.feed} aria-label="Cenas publicadas" aria-busy={carregando}>
          <div className={s.linha}><h2>Últimas transmissões</h2><button onClick={atualizar} disabled={carregando}>↻ Atualizar</button></div>
          {erroFeed && <div role="alert" className={s.erro}>{erroFeed}<button onClick={() => setRevisao(r => r + 1)}>Tentar novamente</button></div>}
          {!carregando && !erroFeed && cenas.length === 0 && <div className={`${s.painel} ${s.vazio}`}><span aria-hidden="true">[ _ ]</span><h3>{filtroPessoa || filtroLocal || filtroTipo ? 'Nenhuma cena encontrada' : 'O próximo registro é seu'}</h3><p>{filtroPessoa || filtroLocal || filtroTipo ? 'Experimente outro nome ou limpe os filtros.' : 'Abra uma nova cena e comece a história do seu personagem.'}</p></div>}
          {cenas.map(c => <article key={c.id} className={`${s.painel} ${s.cena}`}><div className={s.linha}><span className={s.tipo}>{c.tipo}</span><time dateTime={c.created_at}>{new Date(c.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time></div>
            {perfis.get(c.user_id) && <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 -6px', fontSize: 12, color: '#9ab3a2' }}>
              <Avatar url={perfis.get(c.user_id)!.avatar_url} nome={perfis.get(c.user_id)!.apelido} tamanho={22} />
              <Link href={`/jogador/${c.user_id}`}>{perfis.get(c.user_id)!.apelido}</Link>
              {ehAdmin && emails.get(c.user_id) && <span style={{ color: '#6f8a79' }}>({emails.get(c.user_id)})</span>}
              {ehAdmin && c.user_id !== userId && <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => silenciarRapido(c.user_id)}>🔇 1h</button>
                <button type="button" onClick={() => alternarExpulsao(c.user_id, !perfis.get(c.user_id)?.banido)}>{perfis.get(c.user_id)?.banido ? '✓ reintegrar' : '⛔ expulsar'}</button>
              </span>}
            </div>}
            <h2>{c.titulo}</h2><p className={s.local}>⌖ {c.local}</p><div className={s.texto}>{c.texto}</div>
            {c.anexos.length > 0 && <div className={s.midias}>{c.anexos.map(a => <figure key={a.caminho}><Midia url={urlAnexoCena(a.caminho)} tipo={a.tipo} nome={a.nome} /></figure>)}</div>}

            <div className={s.reacoes}>
              {REACOES.map(tipo => (
                <button
                  key={tipo}
                  type="button"
                  className={c.minha_reacao === tipo ? s.reacaoOn : ''}
                  title={tipo}
                  onClick={() => reagir(c, tipo)}
                >
                  {ICONE_REACAO[tipo]}{c.reacoes[tipo] > 0 && <span>{c.reacoes[tipo]}</span>}
                </button>
              ))}
              <button type="button" className={s.comentarioToggle} onClick={() => alternarComentarios(c.id)}>
                💬 {c.total_comentarios > 0 ? c.total_comentarios : ''} {c.total_comentarios === 1 ? 'comentário' : 'comentários'}
              </button>
            </div>
            {comentariosAbertos.has(c.id) && <Comentarios cenaId={c.id} userId={userId} ehAdmin={ehAdmin} />}

            <footer className={s.assinatura}><div><small>AUTOR</small><strong>{c.autor}</strong></div><div><small>PERSONAGEM</small><strong>{c.personagem}</strong></div><span aria-hidden="true">╬</span></footer>
          </article>)}
          {carregando && <p role="status">Decodificando registros…</p>}
          {mais && !erroFeed && <button className={s.carregar} disabled={carregando} onClick={() => setPagina(p => p + 1)}>Carregar mais cenas</button>}
        </section>
      </div>
      </PrecisaAprovacao>
      <datalist id="cenas-locais">{locais.map(l => <option key={l} value={l} />)}</datalist><datalist id="cenas-pessoas">{pessoas.map(p => <option key={p} value={p} />)}</datalist>
      <footer className={s.rodape}><span>TERRA SAVE // ARQUIVO DE CENAS</span><span>MEMÓRIAS ALÉM DO TEMPO</span></footer>
    </div>
  </main>;
}
