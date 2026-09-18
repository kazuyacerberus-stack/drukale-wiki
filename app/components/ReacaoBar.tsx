'use client';

import { REACOES, ICONE_REACAO, type Reacao } from '../lib/comentarios';

export default function ReacaoBar({
  reacoes, minhaReacao, onReagir,
}: {
  reacoes: Record<string, number>; minhaReacao: string | null; onReagir: (tipo: Reacao) => void;
}) {
  return (
    <div className="post-reacoes">
      {REACOES.map((tipo) => (
        <button
          key={tipo}
          type="button"
          className={minhaReacao === tipo ? 'post-reacao on' : 'post-reacao'}
          onClick={() => onReagir(tipo)}
        >
          {ICONE_REACAO[tipo]}{reacoes[tipo] > 0 && <span>{reacoes[tipo]}</span>}
        </button>
      ))}
    </div>
  );
}
