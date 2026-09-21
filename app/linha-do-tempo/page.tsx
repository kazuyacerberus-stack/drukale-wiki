'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import '../matrix.css';
import PrecisaAprovacao from '../components/PrecisaAprovacao';
import PostComposer from '../components/PostComposer';
import PostCard from '../components/PostCard';
import { useBeep } from '../components/useBeep';
import { supabase } from '../lib/db';
import { buscarFeedPublico, mensagemPerfilPost, type PerfilPost } from '../lib/perfilPosts';

type PerfilLeve = { apelido: string; avatar_url: string | null };
const POR_PAGINA = 21;

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
  const [userId, setUserId] = useState<string | null>(null);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [temMais, setTemMais] = useState(true);
  const [erro, setErro] = useState('');
  const { beep, muted, setMuted } = useBeep();

  const carregarPerfis = async (lista: PerfilPost[]) => {
    const ids = [...new Set(lista.map((p) => p.user_id))];
    if (!ids.length) return;
    const { data } = await supabase.from('profiles').select('user_id,apelido,avatar_url').in('user_id', ids);
    if (data) setPerfis((prev) => new Map([...prev, ...(data as (PerfilLeve & { user_id: string })[]).map((p): [string, PerfilLeve] => [p.user_id, p])]));
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    supabase.rpc('drk_e_admin').then(({ data }) => setEhAdmin(data === true));
    (async () => {
      try {
        const lista = await buscarFeedPublico(0);
        setPosts(lista);
        setTemMais(lista.length === POR_PAGINA);
        await carregarPerfis(lista);
      } catch (e) {
        setErro(mensagemPerfilPost(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const carregarMais = async () => {
    setCarregandoMais(true);
    try {
      const lista = await buscarFeedPublico(posts.length);
      setPosts((prev) => [...prev, ...lista]);
      setTemMais(lista.length === POR_PAGINA);
      await carregarPerfis(lista);
    } catch (e) {
      setErro(mensagemPerfilPost(e));
    } finally {
      setCarregandoMais(false);
    }
  };

  return (
    <div className="term drukale">
      <main className="wrap narrow">
       <PrecisaAprovacao>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">terrasave://arquivo/linha-do-tempo</span>
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

        {userId && <PostComposer visibilidadeFixa="publico" onPublicado={(post) => setPosts((prev) => [post, ...prev])} />}

        {erro && <p className="erro">FALHA :: {erro}</p>}

        {loading ? (
          <div className="load"><span /><span /><span /><p>decodificando arquivo...</p></div>
        ) : posts.length === 0 ? (
          <p className="vazio">ninguém postou nada público ainda — seja o primeiro aqui em cima</p>
        ) : (
          <>
            <div className="novidades-lista">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  autor={perfis.get(post.user_id)}
                  userId={userId}
                  ehAdmin={ehAdmin}
                  mostrarVisibilidade={false}
                  onApagado={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                />
              ))}
            </div>
            {temMais && (
              <button type="button" className="mini-btn" disabled={carregandoMais} onClick={carregarMais} style={{ margin: '18px auto', display: 'block' }}>
                {carregandoMais ? '// carregando...' : 'carregar mais'}
              </button>
            )}
          </>
        )}

        <footer className="ft">terrasave_system v1.0 // conexão segura estabelecida</footer>
       </PrecisaAprovacao>
      </main>
    </div>
  );
}
