'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import '../matrix.css';
import PrecisaAprovacao from '../components/PrecisaAprovacao';
import Avatar from '../components/Avatar';
import Icone from '../components/Icone';
import { useBeep } from '../components/useBeep';
import BotaoSom from '../components/BotaoSom';
import { supabase } from '../lib/db';
import {
  LIMITES_NOVIDADE, validarAnexoNovidade, subirAnexoNovidade, apagarAnexoNovidade, urlAnexoNovidade,
  mensagemNovidade, type Novidade, type AnexoNovidade,
} from '../lib/novidades';

type PerfilLeve = { apelido: string; avatar_url: string | null };

function Midia({ caminho, tipo, nome }: { caminho: string; tipo: string; nome: string }) {
  const [falhou, setFalhou] = useState(false);
  const url = urlAnexoNovidade(caminho);
  if (falhou) return <p className="dica">Não foi possível exibir {nome}.</p>;
  return tipo.startsWith('video/')
    ? <video src={url} controls preload="metadata" playsInline aria-label={nome} onError={() => setFalhou(true)} />
    : <img src={url} alt={nome} loading="lazy" onError={() => setFalhou(true)} />;
}

export default function EventosPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [perfis, setPerfis] = useState<Map<string, PerfilLeve>>(new Map());
  const [lista, setLista] = useState<Novidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const { beep, muted, setMuted } = useBeep();

  const [titulo, setTitulo] = useState('');
  const [quando, setQuando] = useState('');
  const [texto, setTexto] = useState('');
  const [anexo, setAnexo] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [previewTipo, setPreviewTipo] = useState('');
  const [erroAnexo, setErroAnexo] = useState('');
  const [publicando, setPublicando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const previewRef = useRef('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      if (!data.session) { setEhAdmin(false); return; }
      supabase.rpc('drk_e_admin').then(({ data: admin }) => setEhAdmin(admin === true));
    });
    return () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); };
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('novidades').select('*').order('created_at', { ascending: false });
      if (error) { setErro(mensagemNovidade(error)); setLoading(false); return; }
      const linhas = (data ?? []) as Novidade[];
      setLista(linhas);
      const ids = [...new Set(linhas.map((n) => n.user_id))];
      if (ids.length) {
        const { data: perfisData } = await supabase.from('profiles').select('user_id,apelido,avatar_url').in('user_id', ids);
        if (perfisData) setPerfis(new Map((perfisData as (PerfilLeve & { user_id: string })[]).map((p) => [p.user_id, p])));
      }
      setLoading(false);
    })();
  }, []);

  const escolherAnexo = (file: File | null) => {
    setErroAnexo('');
    if (!file) return;
    const problema = validarAnexoNovidade(file);
    if (problema) { setErroAnexo(problema); return; }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    setAnexo(file);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreview(url);
    setPreviewTipo(file.type);
  };

  const descartarAnexo = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = '';
    setAnexo(null);
    setPreview('');
  };

  const publicar = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublicando(true); setErroForm('');
    let subiuAgora: AnexoNovidade | null = null;
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Entre novamente para publicar. Seu texto foi mantido.');

      let anexoLinha: AnexoNovidade | null = null;
      if (anexo) {
        anexoLinha = await subirAnexoNovidade(anexo, auth.user.id);
        subiuAgora = anexoLinha;
      }

      const { data: nova, error } = await supabase
        .from('novidades')
        .insert({
          user_id: auth.user.id,
          titulo: titulo.trim().slice(0, LIMITES_NOVIDADE.titulo),
          quando: quando.trim() || null,
          texto: texto.trim().slice(0, LIMITES_NOVIDADE.texto),
          anexo: anexoLinha,
        })
        .select()
        .single();
      if (error) throw error;

      setLista((prev) => [nova as Novidade, ...prev]);
      if (!perfis.has(auth.user.id)) {
        const { data: proprio } = await supabase.from('profiles').select('user_id,apelido,avatar_url').eq('user_id', auth.user.id).maybeSingle();
        if (proprio) setPerfis((prev) => new Map(prev).set(auth.user!.id, proprio as PerfilLeve));
      }
      setTitulo(''); setQuando(''); setTexto(''); descartarAnexo();
    } catch (e) {
      if (subiuAgora) await apagarAnexoNovidade(subiuAgora);
      setErroForm(mensagemNovidade(e));
    } finally {
      setPublicando(false);
    }
  };

  const apagar = async (n: Novidade) => {
    if (!confirm('Apagar esta postagem?')) return;
    const { error } = await supabase.from('novidades').delete().eq('id', n.id);
    if (error) { setErro(mensagemNovidade(error)); return; }
    setLista((prev) => prev.filter((x) => x.id !== n.id));
    await apagarAnexoNovidade(n.anexo);
  };

  return (
    <div className="term">

      <main className="wrap narrow">
       <PrecisaAprovacao>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">terrasave://arquivo/eventos</span>
            <div className="hd-act">
              <BotaoSom muted={muted} setMuted={setMuted} beep={beep} />
              <Link className="ico" href="/">← arquivo</Link>
              <Link className="ico" href="/personagens">personagens</Link>
              <Link className="ico" href="/faccoes">facções</Link>
              <Link className="ico" href="/linha-do-tempo">linha do tempo</Link>
              <Link className="ico" href="/cronicas">crônicas</Link>
              <Link className="ico" href="/cenas">cenas</Link>
              <Link className="ico" href="/chat">chat</Link>
            </div>
          </div>

          <h1 data-txt="EVENTOS">EVENTOS</h1>
          <p className="sub">&gt; novidades do grupo, publicadas por quem joga <span className="cur" /></p>
        </header>

        {userId ? (
          <form className="panel" onSubmit={publicar} style={{ marginBottom: 30 }}>
            <div className="grupo">
              <span className="grupo-t">nova postagem</span>
              <div className="field">
                <label>título *</label>
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="O que rolou de novo?" maxLength={LIMITES_NOVIDADE.titulo} required />
              </div>
              <div className="field">
                <label>quando (opcional)</label>
                <input value={quando} onChange={(e) => setQuando(e.target.value)} placeholder="ex.: sábado às 20h, próxima sessão..." maxLength={120} />
                <p className="dica">preencha se este post é um chamado — data/horário aparecem em destaque no card</p>
              </div>
              <div className="field">
                <label>texto *</label>
                <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} maxLength={LIMITES_NOVIDADE.texto} required
                  placeholder="Conte a novidade para o resto do grupo..." />
              </div>
            </div>

            <div className="grupo">
              <span className="grupo-t">anexo</span>
              {preview ? (
                <div className="done">
                  {previewTipo.startsWith('video/')
                    ? <video src={preview} className="sq" controls muted />
                    /* eslint-disable-next-line @next/next/no-img-element */
                    : <img src={preview} alt="" className="sq" />}
                  <div className="done-txt">
                    <strong>ANEXO PRONTO</strong>
                    <span>{anexo?.name}</span>
                    <button type="button" className="lnk dim" onClick={descartarAnexo}>descartar</button>
                  </div>
                </div>
              ) : (
                <label className="drop">
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                    onChange={(e) => { escolherAnexo(e.target.files?.[0] ?? null); e.target.value = ''; }} />
                  <div className="drop-ico">[ + ]</div>
                  <div className="drop-t">clique para anexar foto, vídeo ou GIF (opcional)</div>
                  <div className="drop-s">jpg · png · webp · gif · mp4 · webm · até 40 MB</div>
                </label>
              )}
              {erroAnexo && <p className="erro" style={{ marginTop: 12 }}>{erroAnexo}</p>}
            </div>

            <button className="go" disabled={publicando}>{publicando ? '// publicando...' : 'PUBLICAR NOVIDADE'}</button>
            {erroForm && <p className="stat bad">{erroForm}</p>}
          </form>
        ) : (
          <p className="vazio">
            <Link href="/admin/login" style={{ color: 'var(--g)' }}>entre na sua conta</Link> para publicar uma novidade.
          </p>
        )}

        {erro && <p className="erro">FALHA :: {erro}</p>}

        {loading ? (
          <div className="load"><span /><span /><span /><p>decodificando arquivo...</p></div>
        ) : lista.length === 0 ? (
          <p className="vazio">nenhuma novidade publicada ainda</p>
        ) : (
          <div className="novidades-lista">
            {lista.map((n, i) => {
              const perfil = perfis.get(n.user_id);
              return (
                <article className="novidade" key={n.id} style={{ animationDelay: `${Math.min(i * 60, 600)}ms` }}>
                  <div className="novidade-topo">
                    <Avatar url={perfil?.avatar_url} nome={perfil?.apelido} tamanho={22} />
                    <strong>{perfil?.apelido ?? 'membro'}</strong>
                    <time dateTime={n.created_at}>{new Date(n.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time>
                  </div>
                  {n.quando && <p className="novidade-chamado"><Icone nome="megafone" /> {n.quando}</p>}
                  <h2>{n.titulo}</h2>
                  <p className="novidade-texto">{n.texto}</p>
                  {n.anexo && (
                    <figure className="novidade-midia">
                      <Midia caminho={n.anexo.caminho} tipo={n.anexo.tipo} nome={n.anexo.nome} />
                    </figure>
                  )}
                  {(n.user_id === userId || ehAdmin) && (
                    <button type="button" className="mini-btn dim" onClick={() => apagar(n)} style={{ marginTop: 10 }}>apagar</button>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <footer className="ft">terrasave_system v1.0 // conexão segura estabelecida</footer>
       </PrecisaAprovacao>
      </main>
    </div>
  );
}
