'use client';

import Icone from './Icone';

/** Botão de ligar/desligar os bipes de clique — mesmo comportamento repetido em toda página com cabeçalho. */
export default function BotaoSom({
  muted, setMuted, beep, className = 'ico',
}: {
  muted: boolean;
  setMuted: (v: boolean) => void;
  beep: (tipo: 'hover' | 'click') => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => { const n = !muted; setMuted(n); if (!n) beep('hover'); }}
      title={muted ? 'ativar som' : 'silenciar'}
    >
      <Icone nome={muted ? 'som-off' : 'som-on'} /> {muted ? 'off' : 'on'}
    </button>
  );
}
