'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/db';
import { urlAnexoComentario, apagarAnexoComentario, type AnexoComentario, type Reacao } from '../lib/comentarios';
import { mensagemPerfilPost, ROTULO_VISIBILIDADE, ICONE_VISIBILIDADE, type PerfilPost } from '../lib/perfilPosts';
import Avatar from './Avatar';
import Icone from './Icone';
import ReacaoBar from './ReacaoBar';
import MusicaEmbed from './MusicaEmbed';
import PostComentarios from './PostComentarios';

type PerfilLeve = { apelido: string; avatar_url: string | null };

function Midia({ anexo }: { anexo: AnexoComentario }) {
  const [falhou, setFalhou] = useState(false);
  const url = urlAnexoComentario(anexo);
  const video = anexo.tipo === 'video/mp4' || anexo.tipo === 'video/webm';
  if (falhou) return <p>Não foi possível exibir {anexo.nome}.</p>;
  return video
    ? <video src={url} controls preload="metadata" playsInline aria-label={anexo.nome} onError={() => setFalhou(true)} />
    : <img src={url} alt={anexo.nome} loading="lazy" onError={() => setFalhou(true)} />;
}

export default function PostCard({
  post, autor, userId, ehAdmin, mostrarVisibilidade = true, onApagado,
}: {
  post: PerfilPost; autor: PerfilLeve | undefined; userId: string | null; ehAdmin: boolean; mostrarVisibilidade?: boolean;
  onApagado: (id: string) => void;
}) {
  const [reacoes, setReacoes] = useState(post.reacoes);
  const [minhaReacao, setMinhaReacao] = useState(post.minha_reacao);
  const [totalComentarios, setTotalComentarios] = useState(post.total_comentarios);
  const [comentariosAbertos, setComentariosAbertos] = useState(false);
  const [erro, setErro] = useState('');

  const podeApagar = post.user_id === userId || ehAdmin;

  const reagir = async (tipo: Reacao) => {
    if (!userId) return;
    const removendo = minhaReacao === tipo;
    const originalReacoes = reacoes;
    const originalMinha = minhaReacao;
    const novo = { ...reacoes };
    if (minhaReacao) novo[minhaReacao] = Math.max(0, (novo[minhaReacao] ?? 1) - 1);
    if (!removendo) novo[tipo] = (novo[tipo] ?? 0) + 1;
    setReacoes(novo);
    setMinhaReacao(removendo ? null : tipo);

    const { error } = removendo
      ? await supabase.from('perfil_post_reacoes').delete().eq('post_id', post.id).eq('user_id', userId)
      : await supabase.from('perfil_post_reacoes').upsert({ post_id: post.id, user_id: userId, tipo }, { onConflict: 'post_id,user_id' });
    if (error) {
      setReacoes(originalReacoes);
      setMinhaReacao(originalMinha);
      setErro(mensagemPerfilPost(error));
    }
  };

  const apagar = async () => {
    if (!confirm('Apagar esta postagem?')) return;
    const { error } = await supabase.from('perfil_posts').delete().eq('id', post.id);
    if (error) { setErro(mensagemPerfilPost(error)); return; }
    onApagado(post.id);
    if (post.anexo) await apagarAnexoComentario(post.anexo);
  };

  return (
    <article className="novidade">
      <div className="novidade-topo">
        <Avatar url={autor?.avatar_url} nome={autor?.apelido} tamanho={22} />
        <Link href={`/jogador/${post.user_id}`}><strong>{autor?.apelido ?? 'membro'}</strong></Link>
        {mostrarVisibilidade && (
          <span className="dica" style={{ marginLeft: 4 }}>{ICONE_VISIBILIDADE[post.visibilidade]} {ROTULO_VISIBILIDADE[post.visibilidade]}</span>
        )}
        <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time>
      </div>
      {post.texto && <p className="novidade-texto">{post.texto}</p>}
      {post.anexo && <figure className="novidade-midia"><Midia anexo={post.anexo} /></figure>}
      {post.musica && <div className="novidade-musica"><MusicaEmbed musica={post.musica} /></div>}

      <div className="post-rodape">
        <ReacaoBar reacoes={reacoes} minhaReacao={minhaReacao} onReagir={reagir} />
        <button type="button" className="post-comentario-toggle" onClick={() => setComentariosAbertos((v) => !v)}>
          <Icone nome="comentario" /> {totalComentarios > 0 ? totalComentarios : ''} comentar
        </button>
        {podeApagar && <button type="button" className="mini-btn dim" onClick={apagar}>apagar</button>}
      </div>
      {erro && <p className="erro">FALHA :: {erro}</p>}

      {comentariosAbertos && (
        <PostComentarios postId={post.id} userId={userId} ehAdmin={ehAdmin} onNovoComentario={() => setTotalComentarios((n) => n + 1)} />
      )}
    </article>
  );
}
