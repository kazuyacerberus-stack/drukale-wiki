'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/db';
import { buscarPostsPerfil, buscarAtividadePerfil, mensagemPerfilPost, type PerfilPost, type AtividadeCena } from '../lib/perfilPosts';
import Avatar from './Avatar';
import PostComposer from './PostComposer';
import PostCard from './PostCard';

type PerfilLeve = { apelido: string; avatar_url: string | null };
type ItemLinha =
  | { tipo: 'post'; data: string; post: PerfilPost }
  | { tipo: 'atividade'; data: string; atividade: AtividadeCena };

export default function PerfilTimeline({ alvo, ehProprioPerfil, ehAdmin }: { alvo: string; ehProprioPerfil: boolean; ehAdmin: boolean }) {
  const [posts, setPosts] = useState<PerfilPost[]>([]);
  const [atividade, setAtividade] = useState<AtividadeCena[]>([]);
  const [perfis, setPerfis] = useState<Map<string, PerfilLeve>>(new Map());
  const [userId, setUserId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
  }, []);

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

  const linhas: ItemLinha[] = [
    ...posts.map((post): ItemLinha => ({ tipo: 'post', data: post.created_at, post })),
    ...atividade.map((a): ItemLinha => ({ tipo: 'atividade', data: a.created_at, atividade: a })),
  ].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <div>
      {ehProprioPerfil && <PostComposer onPublicado={(post) => setPosts((prev) => [post, ...prev])} />}

      {erro && <p className="erro">FALHA :: {erro}</p>}

      {carregando ? (
        <div className="load"><span /><span /><span /></div>
      ) : linhas.length === 0 ? (
        <p className="vazio">nada por aqui ainda</p>
      ) : (
        <div className="novidades-lista">
          {linhas.map((item) => item.tipo === 'post' ? (
            <PostCard
              key={`p-${item.post.id}`}
              post={item.post}
              autor={perfis.get(item.post.user_id)}
              userId={userId}
              ehAdmin={ehAdmin}
              onApagado={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
            />
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
