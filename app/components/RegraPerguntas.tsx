'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/db';
import { LIMITE_PERGUNTA_REGRA, LIMITE_RESPOSTA_REGRA, mensagemRegra, type PerguntaRegra } from '../lib/regras';
import Avatar from './Avatar';

type PerfilLeve = { user_id: string; apelido: string; avatar_url: string | null };

const fmt = (d: string) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Perguntas sobre uma regra. Qualquer jogador aprovado pergunta; só o
 * moderador responde, e a resposta fica visível pra todos (vira um FAQ).
 */
export default function RegraPerguntas({
  regraId, userId, ehAdmin, onMudou,
}: { regraId: string; userId: string | null; ehAdmin: boolean; onMudou: (total: number, pendentes: number) => void }) {
  const [lista, setLista] = useState<PerguntaRegra[]>([]);
  const [perfis, setPerfis] = useState<Map<string, PerfilLeve>>(new Map());
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [resposta, setResposta] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const carregarPerfis = async (ids: string[]) => {
    const novos = ids.filter((i) => !perfis.has(i));
    if (!novos.length) return;
    const { data } = await supabase.from('profiles').select('user_id,apelido,avatar_url').in('user_id', novos);
    if (data) setPerfis((prev) => { const n = new Map(prev); (data as PerfilLeve[]).forEach((p) => n.set(p.user_id, p)); return n; });
  };

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data, error } = await supabase.from('regra_perguntas').select('*').eq('regra_id', regraId).order('created_at', { ascending: true });
      if (!vivo) return;
      if (error) { setErro(mensagemRegra(error)); setCarregando(false); return; }
      const linhas = (data ?? []) as PerguntaRegra[];
      setLista(linhas);
      const ids = [...new Set(linhas.flatMap((q) => [q.user_id, q.respondida_por].filter((x): x is string => Boolean(x))))];
      if (ids.length) {
        const { data: p } = await supabase.from('profiles').select('user_id,apelido,avatar_url').in('user_id', ids);
        if (vivo && p) setPerfis(new Map((p as PerfilLeve[]).map((x) => [x.user_id, x])));
      }
      setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [regraId]);

  const avisar = (l: PerguntaRegra[]) => onMudou(l.length, l.filter((q) => !q.resposta).length);

  const perguntar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || texto.trim().length < 3) return;
    setEnviando(true); setErro('');
    const { data, error } = await supabase.from('regra_perguntas')
      .insert({ regra_id: regraId, user_id: userId, pergunta: texto.trim() }).select().single();
    setEnviando(false);
    if (error) { setErro(mensagemRegra(error)); return; }
    const nova = [...lista, data as PerguntaRegra];
    setLista(nova); avisar(nova); setTexto('');
    void carregarPerfis([userId]);
  };

  const responder = async (id: string) => {
    if (!userId || !resposta.trim()) return;
    setSalvando(true); setErro('');
    const { data, error } = await supabase.from('regra_perguntas')
      .update({ resposta: resposta.trim(), respondida_por: userId, respondida_em: new Date().toISOString() })
      .eq('id', id).select().single();
    setSalvando(false);
    if (error) { setErro(mensagemRegra(error)); return; }
    const nova = lista.map((q) => (q.id === id ? (data as PerguntaRegra) : q));
    setLista(nova); avisar(nova); setRespondendo(null); setResposta('');
    void carregarPerfis([userId]);
  };

  const apagar = async (id: string) => {
    if (!confirm('Apagar esta pergunta?')) return;
    const { error } = await supabase.from('regra_perguntas').delete().eq('id', id);
    if (error) { setErro(mensagemRegra(error)); return; }
    const nova = lista.filter((q) => q.id !== id);
    setLista(nova); avisar(nova);
  };

  return (
    <div className="regra-interacao-corpo">
      {userId && (
        <form onSubmit={perguntar} className="regra-comentario-form">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, LIMITE_PERGUNTA_REGRA))}
            rows={2}
            placeholder="ficou com dúvida sobre esta regra? Pergunte aqui — um moderador responde"
          />
          <button className="go" style={{ width: 'auto', padding: '9px 22px', fontSize: 13 }} disabled={enviando || texto.trim().length < 3}>
            {enviando ? '...' : 'PERGUNTAR'}
          </button>
        </form>
      )}
      {erro && <p className="stat bad">FALHA :: {erro}</p>}

      {carregando ? (
        <p className="dica">carregando…</p>
      ) : lista.length === 0 ? (
        <p className="post-comentario-vazio">nenhuma pergunta ainda.</p>
      ) : (
        lista.map((q) => {
          const autor = perfis.get(q.user_id);
          const quem = q.respondida_por ? perfis.get(q.respondida_por) : undefined;
          return (
            <div className="regra-pergunta" key={q.id}>
              <div className="post-comentario">
                <Avatar url={autor?.avatar_url} nome={autor?.apelido} tamanho={26} />
                <div className="post-comentario-corpo">
                  <div className="post-comentario-balao">
                    <Link href={`/jogador/${q.user_id}`}><strong>{autor?.apelido ?? 'membro'}</strong></Link>
                    <p>{q.pergunta}</p>
                  </div>
                  <div className="post-comentario-meta">
                    <time dateTime={q.created_at}>{fmt(q.created_at)}</time>
                    {!q.resposta && <span className="regra-pergunta-espera">aguardando resposta</span>}
                    {ehAdmin && respondendo !== q.id && (
                      <button type="button" onClick={() => { setRespondendo(q.id); setResposta(q.resposta ?? ''); }}>
                        {q.resposta ? 'editar resposta' : 'responder'}
                      </button>
                    )}
                    {(q.user_id === userId || ehAdmin) && <button type="button" onClick={() => apagar(q.id)}>apagar</button>}
                  </div>
                </div>
              </div>

              {respondendo === q.id ? (
                <div className="regra-resposta-form">
                  <textarea
                    value={resposta}
                    onChange={(e) => setResposta(e.target.value.slice(0, LIMITE_RESPOSTA_REGRA))}
                    rows={3}
                    placeholder="sua resposta (todos os jogadores vão ver)"
                    autoFocus
                  />
                  <div className="perfil-cartao-acoes">
                    <button type="button" className="go" style={{ width: 'auto', padding: '8px 20px', fontSize: 13 }} disabled={salvando || !resposta.trim()} onClick={() => responder(q.id)}>
                      {salvando ? '...' : 'ENVIAR RESPOSTA'}
                    </button>
                    <button type="button" className="mini-btn" onClick={() => { setRespondendo(null); setResposta(''); }}>cancelar</button>
                  </div>
                </div>
              ) : q.resposta ? (
                <div className="regra-resposta">
                  <p className="regra-resposta-quem">
                    <span>RESPOSTA</span>{quem ? ` · ${quem.apelido}` : ''}{q.respondida_em ? ` · ${fmt(q.respondida_em)}` : ''}
                  </p>
                  <p>{q.resposta}</p>
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
