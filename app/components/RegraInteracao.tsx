'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/db';
import RegraComentarios from './RegraComentarios';
import RegraPerguntas from './RegraPerguntas';

type Painel = 'perguntas' | 'ideias' | null;

/**
 * Rodapé de cada regra: dois botões — perguntas (o moderador responde) e
 * ideias e melhorias — que só abrem o campo de escrever quando clicados,
 * pra não roubar espaço da leitura. Abrir um fecha o outro.
 */
export default function RegraInteracao({
  regraId, userId, ehAdmin, onPendentes,
}: { regraId: string; userId: string | null; ehAdmin: boolean; onPendentes?: (regraId: string, pendentes: number) => void }) {
  const [painel, setPainel] = useState<Painel>(null);
  const [ideias, setIdeias] = useState<number | null>(null);
  const [perguntas, setPerguntas] = useState<number | null>(null);
  const [pendentes, setPendentes] = useState(0);

  // só as contagens, pros botões: a lista de cada um só é buscada quando abrir
  useEffect(() => {
    let vivo = true;
    const contar = (tabela: string, semResposta = false) => {
      const q = supabase.from(tabela).select('id', { count: 'exact', head: true }).eq('regra_id', regraId);
      return semResposta ? q.is('resposta', null) : q;
    };
    Promise.all([contar('regra_comentarios'), contar('regra_perguntas'), contar('regra_perguntas', true)]).then(([i, p, s]) => {
      if (!vivo) return;
      setIdeias(i.count ?? 0);
      setPerguntas(p.count ?? 0);
      setPendentes(s.count ?? 0);
    });
    return () => { vivo = false; };
  }, [regraId]);

  const alternar = (p: Exclude<Painel, null>) => setPainel((atual) => (atual === p ? null : p));

  return (
    <section className="regra-comentarios">
      <div className="regra-interacao-botoes">
        <button type="button" className="regra-comentarios-botao" onClick={() => alternar('perguntas')} aria-expanded={painel === 'perguntas'}>
          <span aria-hidden="true">❓</span>
          {perguntas ? `perguntas (${perguntas})` : 'fazer uma pergunta'}
          {ehAdmin && pendentes > 0 && <b className="regra-pendente-etiqueta">{pendentes} sem resposta</b>}
          <em aria-hidden="true">{painel === 'perguntas' ? '▴' : '▾'}</em>
        </button>
        <button type="button" className="regra-comentarios-botao" onClick={() => alternar('ideias')} aria-expanded={painel === 'ideias'}>
          <span aria-hidden="true">💬</span>
          {ideias ? `ideias e melhorias (${ideias})` : 'sugerir uma melhoria'}
          <em aria-hidden="true">{painel === 'ideias' ? '▴' : '▾'}</em>
        </button>
      </div>

      {painel === 'perguntas' && (
        <RegraPerguntas
          regraId={regraId}
          userId={userId}
          ehAdmin={ehAdmin}
          onMudou={(total, pend) => { setPerguntas(total); setPendentes(pend); onPendentes?.(regraId, pend); }}
        />
      )}
      {painel === 'ideias' && (
        <RegraComentarios regraId={regraId} userId={userId} ehAdmin={ehAdmin} onMudou={(d) => setIdeias((n) => Math.max(0, (n ?? 0) + d))} />
      )}
    </section>
  );
}
