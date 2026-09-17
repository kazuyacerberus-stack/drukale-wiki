'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/db';
import { subirAnexoComentario, apagarAnexoComentario, validarAnexoComentario, urlAnexoComentario, type AnexoComentario } from '../lib/comentarios';
import {
  buscarPostsPerfil, buscarAtividadePerfil, publicarPost, mensagemPerfilPost,
  ROTULO_VISIBILIDADE, ICONE_VISIBILIDADE, type PerfilPost, type AtividadeCena, type Visibilidade,
} from '../lib/perfilPosts';
import { buscarMinhasAmizades, type Amizade } from '../lib/amizades';
import Avatar from './Avatar';
import GifPicker from './GifPicker';

type PerfilLeve = { apelido: string; avatar_url: string | null };
type ItemLinha =
  | { tipo: 'post'; data: string; post: PerfilPost }
  | { tipo: 'atividade'; data: string; atividade: AtividadeCena };

function Midia({ anexo }: { anexo: AnexoComentario }) {
  const [falhou, setFalhou] = useState(false);
  const url = urlAnexoComentario(anexo);
  const video = anexo.tipo === 'video/mp4' || anexo.tipo === 'video/webm';
  if (falhou) return <p>Não foi possível exibir {anexo.nome}.</p>;
  return video
    ? <video src={url} controls preload="metadata" playsInline aria-label={anexo.nome} onError={() => setFalhou(true)} />
    : <img src={url} alt={anexo.nome} loading="lazy" onError={() => setFalhou(true)} />;
}

export default function PerfilTimeline({ alvo, ehProprioPerfil, ehAdmin }: { alvo: string; ehProprioPerfil: boolean; ehAdmin: boolean }) {
  const [posts, setPosts] = useState<PerfilPost[]>([]);
  const [atividade, setAtividade] = useState<AtividadeCena[]>([]);
  const [perfis, setPerfis] = useState<Map<string, PerfilLeve>>(new Map());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [texto, setTexto] = useState('');
  const [anexoArquivo, setAnexoArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [gifEscolhido, setGifEscolhido] = useState<AnexoComentario | null>(null);
  const [gifAberto, setGifAberto] = useState(false);
  const [visibilidade, setVisibilidade] = useState<Visibilidade>('amigos');
  const [amigosComId, setAmigosComId] = useState<(PerfilLeve & { user_id: string })[]>([]);
  const [audienciaEscolhida, setAudienciaEscolhida] = useState<Set<string>>(new Set());
  const [publicando, setPublicando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const previewRef = useRef('');

  const carregar = async () => {
    setCarregando(true); setErro('');
    try {
      const [meusPosts, minhaAtividade] = await Promise.all([buscarPostsPerfil(alvo), buscarAtividadePerfil(alvo)]);
      setPosts(meusPosts);
      setAtividade(minhaAtividade);
      const ids = [...new Set(meusPosts.map((p) => p.user_id))];
      if (ids.length) {
        const { data } = await supabase.from('profiles').select('user_id,apelido,avatar_url').in('user_id', ids);
        if (data) setPerfis(new Map((data as (PerfilLeve & { user_id: string })[]).map((p) => [p.user_id, p])));
      }
    } catch (e) {
      setErro(mensagemPerfilPost(e));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { void carregar(); }, [alvo]);

  useEffect(() => {
    if (!ehProprioPerfil) return;
    buscarMinhasAmizades().then((linhas: Amizade[]) => {
      const idsAmigos = linhas.filter((a) => a.solicitante === alvo && a.status === 'aceita').map((a) => a.destinatario);
      if (!idsAmigos.length) return;
      supabase.from('profiles').select('user_id,apelido,avatar_url').in('user_id', idsAmigos).then(({ data }) => {
        if (data) setAmigosComId(data as (PerfilLeve & { user_id: string })[]);
      });
    }).catch(() => {});
  }, [ehProprioPerfil, alvo]);

  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  const escolherArquivo = (file: File | null) => {
    setErroForm('');
    if (!file) return;
    const problema = validarAnexoComentario(file);
    if (problema) { setErroForm(problema); return; }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setAnexoArquivo(file);
    setPreview(url);
    setGifEscolhido(null);
  };

  const descartarAnexo = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = '';
    setAnexoArquivo(null);
    setPreview('');
    setGifEscolhido(null);
  };

  const publicar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim() && !anexoArquivo && !gifEscolhido) { setErroForm('Escreva algo ou anexe uma foto, vídeo ou GIF.'); return; }
    setPublicando(true); setErroForm('');
    let subiuAgora: AnexoComentario | null = null;
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Entre novamente para postar.');
      let anexoLinha: AnexoComentario | null = gifEscolhido;
      if (anexoArquivo) { anexoLinha = await subirAnexoComentario(anexoArquivo, auth.user.id); subiuAgora = anexoLinha; }

      const novo = await publicarPost(texto, anexoLinha, visibilidade, [...audienciaEscolhida]);
      setPosts((prev) => [novo, ...prev]);
      setTexto(''); descartarAnexo(); setAudienciaEscolhida(new Set());
    } catch (e) {
      if (subiuAgora) await apagarAnexoComentario(subiuAgora);
      setErroForm(mensagemPerfilPost(e));
    } finally {
      setPublicando(false);
    }
  };

  const apagarPost = async (post: PerfilPost) => {
    if (!confirm('Apagar esta postagem?')) return;
    const { error } = await supabase.from('perfil_posts').delete().eq('id', post.id);
    if (error) { setErro(mensagemPerfilPost(error)); return; }
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    if (post.anexo) await apagarAnexoComentario(post.anexo);
  };

  const linhas: ItemLinha[] = [
    ...posts.map((post): ItemLinha => ({ tipo: 'post', data: post.created_at, post })),
    ...atividade.map((a): ItemLinha => ({ tipo: 'atividade', data: a.created_at, atividade: a })),
  ].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <div>
      {ehProprioPerfil && (
        <form className="panel" onSubmit={publicar} style={{ marginBottom: 24 }}>
          <div className="grupo">
            <span className="grupo-t">nova postagem</span>
            <div className="field">
              <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} maxLength={4000} placeholder="O que você quer contar?" />
            </div>
            {(preview || gifEscolhido) && (
              <div className="done">
                {preview
                  ? <img src={preview} alt="" className="sq" />
                  : gifEscolhido && <img src={urlAnexoComentario(gifEscolhido)} alt="" className="sq" />}
                <div className="done-txt"><button type="button" className="lnk dim" onClick={descartarAnexo}>remover anexo</button></div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
              <label className="mini-btn" style={{ cursor: 'pointer' }}>
                📎 anexar
                <input type="file" style={{ display: 'none' }} accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                  onChange={(e) => { escolherArquivo(e.target.files?.[0] ?? null); e.target.value = ''; }} />
              </label>
              <button type="button" className="mini-btn" onClick={() => setGifAberto((v) => !v)}>GIF</button>
              <select value={visibilidade} onChange={(e) => setVisibilidade(e.target.value as Visibilidade)}>
                {(Object.keys(ROTULO_VISIBILIDADE) as Visibilidade[]).map((v) => (
                  <option key={v} value={v}>{ICONE_VISIBILIDADE[v]} {ROTULO_VISIBILIDADE[v]}</option>
                ))}
              </select>
            </div>
            {gifAberto && <GifPicker onEscolher={(a) => { setGifEscolhido(a); setAnexoArquivo(null); setPreview(''); setGifAberto(false); }} onFechar={() => setGifAberto(false)} />}
            {visibilidade === 'personalizado' && (
              <div className="field">
                <label>quem pode ver</label>
                {amigosComId.length === 0 ? (
                  <p className="dica">você ainda não tem amigos pra marcar aqui.</p>
                ) : (
                  amigosComId.map((a) => (
                    <label key={a.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, textTransform: 'none', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={audienciaEscolhida.has(a.user_id)}
                        onChange={(e) => setAudienciaEscolhida((prev) => { const n = new Set(prev); e.target.checked ? n.add(a.user_id) : n.delete(a.user_id); return n; })}
                      />
                      {a.apelido}
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
          <button className="go" disabled={publicando}>{publicando ? '// publicando...' : 'PUBLICAR'}</button>
          {erroForm && <p className="stat bad">{erroForm}</p>}
        </form>
      )}

      {erro && <p className="erro">FALHA :: {erro}</p>}

      {carregando ? (
        <div className="load"><span /><span /><span /></div>
      ) : linhas.length === 0 ? (
        <p className="vazio">nada por aqui ainda</p>
      ) : (
        <div className="novidades-lista">
          {linhas.map((item) => item.tipo === 'post' ? (
            <article className="novidade" key={`p-${item.post.id}`}>
              <div className="novidade-topo">
                <Avatar url={perfis.get(item.post.user_id)?.avatar_url} nome={perfis.get(item.post.user_id)?.apelido} tamanho={22} />
                <strong>{perfis.get(item.post.user_id)?.apelido ?? 'membro'}</strong>
                <span className="dica" style={{ marginLeft: 4 }}>{ICONE_VISIBILIDADE[item.post.visibilidade]} {ROTULO_VISIBILIDADE[item.post.visibilidade]}</span>
                <time dateTime={item.post.created_at}>{new Date(item.post.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time>
              </div>
              {item.post.texto && <p className="novidade-texto">{item.post.texto}</p>}
              {item.post.anexo && <figure className="novidade-midia"><Midia anexo={item.post.anexo} /></figure>}
              {(item.post.user_id === alvo && ehProprioPerfil || ehAdmin) && (
                <button type="button" className="mini-btn dim" onClick={() => apagarPost(item.post)} style={{ marginTop: 10 }}>apagar</button>
              )}
            </article>
          ) : (
            <article className="novidade" key={`a-${item.atividade.cena_id}-${item.atividade.papel}`}>
              <div className="novidade-topo">
                <span>{item.atividade.papel === 'autor' ? '✍️ escreveu' : '💬 comentou em'}</span>
                <time dateTime={item.atividade.created_at}>{new Date(item.atividade.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time>
              </div>
              <Link href="/cenas" className="novidade-texto" style={{ display: 'block' }}>{item.atividade.titulo}</Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
