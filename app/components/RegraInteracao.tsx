'use client';

import { useState } from 'react';
import RegraComentarios from './RegraComentarios';
import RegraPerguntas from './RegraPerguntas';

type Painel = 'perguntas' | 'ideias' | null;

/**
 * Rodapé de cada seção: dois botões — perguntas (o moderador responde) e
 * ideias e melhorias — que só abrem o campo de escrever quando clicados,
 * pra não roubar espaço da leitura. Abrir um fecha o outro. As contagens
 * vêm de fora (o leitor do documento busca de todas as seções de uma vez).
 */
export default function RegraInteracao({
  regraId, userId, ehAdmin, ideias, perguntas, pendentes, onIdeias, onPerguntas,
}: {
  regraId: string; userId: string | null; ehAdmin: boolean;
  ideias: number; perguntas: number; pendentes: number;
  onIdeias: (delta: number) => void;
  onPerguntas: (total: number, pendentes: number) => void;
}) {
  const [painel, setPainel] = useState<Painel>(null);
  const alternar = (p: Exclude<Painel, null>) => setPainel((atual) => (atual === p ? null : p));

  return (
    <div className="regra-comentarios">
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

      {painel === 'perguntas' && <RegraPerguntas regraId={regraId} userId={userId} ehAdmin={ehAdmin} onMudou={onPerguntas} />}
      {painel === 'ideias' && <RegraComentarios regraId={regraId} userId={userId} ehAdmin={ehAdmin} onMudou={onIdeias} />}
    </div>
  );
}
