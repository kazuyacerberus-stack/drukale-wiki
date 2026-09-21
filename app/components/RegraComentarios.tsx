'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/db';
import { LIMITE_COMENTARIO_REGRA, mensagemRegra, type ComentarioRegra } from '../lib/regras';
import Avatar from './Avatar';

type PerfilLeve = { user_id: string; apelido: string; avatar_url: string | null };

/** Ideias e melhorias dos jogadores para uma regra. */
export default function RegraComentarios({ regraId, userId, ehAdmin }: { regraId: string; userId: string | null; ehAdmin: boolean }) {
  const [lista, setLista] = useState<ComentarioRegra[]>([]);
  const [perfis, setPerfis] = useState<Map<string, PerfilLeve>>(new Map());
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data, error } = await supabase.from('regra_comentarios').select('*').eq('regra_id', regraId).order('created_at', { ascending: true });
      if (!vivo) return;
      if (error) { setErro(mensagemRegra(error)); setCarregando(false); return; }
      const linhas = (data ?? []) as ComentarioRegra[];
      setLista(linhas);
      const ids = [...new Set(linhas.map((c) => c.user_id))];
      if (ids.length) {
        const { data: p } = await supabase.from('profiles').select('user_id,apelido,avatar_url').in('user_id', ids);
        if (vivo && p) setPerfis(new Map((p as PerfilLeve[]).map((x) => [x.user_id, x])));
      }
      setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [regraId]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !texto.trim()) return;
    setEnviando(true); setErro('');
    const { data, error } = await supabase.from('regra_comentarios')
      .insert({ regra_id: regraId, user_id: userId, texto: texto.trim() }).select().single();
    setEnviando(false);
    if (error) { setErro(mensagemRegra(error)); return; }
    const novo = data as ComentarioRegra;
    setLista((prev) => [...prev, novo]);
    setTexto('');
    if (!perfis.has(userId)) {
      const { data: p } = await supabase.from('profiles').select('user_id,apelido,avatar_url').eq('user_id', userId).maybeSingle();
      if (p) setPerfis((prev) => new Map(prev).set(userId, p as PerfilLeve));
    }
  };

  const apagar = async (id: string) => {
    if (!confirm('Apagar este comentário?')) return;
    const { error } = await supabase.from('regra_comentarios').delete().eq('id', id);
    if (error) { setErro(mensagemRegra(error)); return; }
    setLista((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <section className="regra-comentarios">
      <h3>ideias e melhorias{lista.length > 0 ? ` (${lista.length})` : ''}</h3>
      <p className="dica">tem uma sugestão para esta regra? Escreva aqui — os moderadores leem.</p>

      {userId && (
        <form onSubmit={enviar} className="regra-comentario-form">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, LIMITE_COMENTARIO_REGRA))}
            rows={3}
            placeholder="sua ideia ou sugestão de melhoria..."
          />
          <button className="go" style={{ width: 'auto', padding: '9px 22px', fontSize: 13 }} disabled={enviando || !texto.trim()}>
            {enviando ? '...' : 'ENVIAR IDEIA'}
          </button>
        </form>
      )}
      {erro && <p className="stat bad">FALHA :: {erro}</p>}

      {carregando ? (
        <p className="dica">carregando…</p>
      ) : lista.length === 0 ? (
        <p className="post-comentario-vazio">nenhuma ideia ainda — seja o primeiro.</p>
      ) : (
        lista.map((c) => {
          const p = perfis.get(c.user_id);
          return (
            <div className="post-comentario" key={c.id}>
              <Avatar url={p?.avatar_url} nome={p?.apelido} tamanho={26} />
              <div className="post-comentario-corpo">
                <div className="post-comentario-balao">
                  <Link href={`/jogador/${c.user_id}`}><strong>{p?.apelido ?? 'membro'}</strong></Link>
                  <p>{c.texto}</p>
                </div>
                <div className="post-comentario-meta">
                  <time dateTime={c.created_at}>{new Date(c.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time>
                  {(c.user_id === userId || ehAdmin) && <button type="button" onClick={() => apagar(c.id)}>apagar</button>}
                </div>
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}
