'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import '../matrix.css';
import MatrixRain from '../components/MatrixRain';
import PrecisaAprovacao from '../components/PrecisaAprovacao';
import Avatar from '../components/Avatar';
import { useBeep } from '../components/useBeep';
import { supabase } from '../lib/db';
import { urlAnexoComentario, type AnexoComentario } from '../lib/comentarios';
import { mensagemPerfilPost, type PerfilPost } from '../lib/perfilPosts';

type PerfilLeve = { apelido: string; avatar_url: string | null };

function Midia({ anexo }: { anexo: AnexoComentario }) {
  const [falhou, setFalhou] = useState(false);
  const url = urlAnexoComentario(anexo);
  const video = anexo.tipo === 'video/mp4' || anexo.tipo === 'video/webm';
  if (falhou) return <p className="dica">Não foi possível exibir {anexo.nome}.</p>;
  return video
    ? <video src={url} controls preload="metadata" playsInline aria-label={anexo.nome} onError={() => setFalhou(true)} />
    : <img src={url} alt={anexo.nome} loading="lazy" onError={() => setFalhou(true)} />;
}

/**
 * A "linha do tempo" agora é o mural público do império: todo post que
 * alguém marcar como "qualquer jogador" no próprio perfil aparece aqui,
 * de todo mundo, em ordem cronológica — sem precisar visitar perfil por
 * perfil. A história antiga do império (curada pelo admin) mudou para
 * /cronicas.
 */
export default function LinhaDoTempoPage() {
  const [posts, setPosts] = useState<PerfilPost[]>([]);
  const [perfis, setPerfis] = useState<Map<string, PerfilLeve>>(new Map());
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const { beep, muted, setMuted } = useBeep();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('perfil_posts')
        .select('*')
        .eq('visibilidade', 'publico')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) { setErro(mensagemPerfilPost(error)); setLoading(false); return; }
      const lista = (data ?? []) as PerfilPost[];
      setPosts(lista);
      const ids = [...new Set(lista.map((p) => p.user_id))];
      if (ids.length) {
        const { data: perfisData } = await supabase.from('profiles').select('user_id,apelido,avatar_url').in('user_id', ids);
        if (perfisData) setPerfis(new Map((perfisData as (PerfilLeve & { user_id: string })[]).map((p) => [p.user_id, p])));
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap narrow">
       <PrecisaAprovacao>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">drukale://arquivo/linha-do-tempo</span>
            <div className="hd-act">
              <button className="ico" onClick={() => { const n = !muted; setMuted(n); if (!n) beep('hover'); }} title={muted ? 'ativar som' : 'silenciar'}>
                {muted ? '♪ off' : '♪ on'}
              </button>
              <Link className="ico" href="/">← arquivo</Link>
              <Link className="ico" href="/cronicas">crônicas</Link>
              <Link className="ico" href="/eventos">✦ eventos</Link>
              <Link className="ico" href="/perfil">meu perfil</Link>
            </div>
          </div>

          <h1 data-txt="LINHA DO TEMPO">LINHA DO TEMPO</h1>
          <p className="sub">&gt; o que todo mundo está compartilhando publicamente <span className="cur" /></p>
        </header>

        {erro && <p className="erro">FALHA :: {erro}</p>}

        {loading ? (
          <div className="load"><span /><span /><span /><p>decodificando arquivo...</p></div>
        ) : posts.length === 0 ? (
          <p className="vazio">ninguém postou nada público ainda — seja o primeiro em /perfil</p>
        ) : (
          <div className="novidades-lista">
            {posts.map((post) => {
              const perfil = perfis.get(post.user_id);
              return (
                <article className="novidade" key={post.id}>
                  <div className="novidade-topo">
                    <Avatar url={perfil?.avatar_url} nome={perfil?.apelido} tamanho={22} />
                    <Link href={`/jogador/${post.user_id}`}><strong>{perfil?.apelido ?? 'membro'}</strong></Link>
                    <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time>
                  </div>
                  {post.texto && <p className="novidade-texto">{post.texto}</p>}
                  {post.anexo && <figure className="novidade-midia"><Midia anexo={post.anexo} /></figure>}
                </article>
              );
            })}
          </div>
        )}

        <footer className="ft">drukale_system v1.0 // conexão segura estabelecida</footer>
       </PrecisaAprovacao>
      </main>
    </div>
  );
}
