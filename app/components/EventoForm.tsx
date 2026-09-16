'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/db';
import { mensagemEvento, proximaOrdem, LIMITES_EVENTO, type Evento } from '../lib/eventos';

export type CamposEvento = { titulo: string; data: string; resumo: string; descricao: string };

const VAZIO: CamposEvento = { titulo: '', data: '', resumo: '', descricao: '' };

function doEvento(e: Evento): CamposEvento {
  return { titulo: e.titulo, data: e.data ?? '', resumo: e.resumo ?? '', descricao: e.descricao ?? '' };
}

/** Formulário de evento, usado tanto para criar quanto para editar. */
export default function EventoForm({ inicial }: { inicial?: Evento | null }) {
  const editando = !!inicial;

  const [f, setF] = useState<CamposEvento>(inicial ? doEvento(inicial) : VAZIO);
  const set =
    (k: keyof CamposEvento) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF((s) => ({ ...s, [k]: e.target.value }));

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [salvo, setSalvo] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(editando ? 'ATUALIZANDO...' : 'GRAVANDO...');
    setSalvo(false);

    const linha = {
      titulo: f.titulo.trim().slice(0, LIMITES_EVENTO.titulo),
      data: f.data.trim() || null,
      resumo: f.resumo.trim().slice(0, LIMITES_EVENTO.resumo) || null,
      descricao: f.descricao.trim().slice(0, LIMITES_EVENTO.descricao) || null,
    };

    try {
      if (editando && inicial) {
        const { error } = await supabase.from('eventos').update(linha).eq('id', inicial.id);
        if (error) throw error;
        setStatus('EVENTO ATUALIZADO');
      } else {
        const { data: todos, error: erroBusca } = await supabase.from('eventos').select('ordem');
        if (erroBusca) throw erroBusca;
        const ordem = proximaOrdem((todos ?? []) as { ordem: number }[]);
        const { error } = await supabase.from('eventos').insert([{ ...linha, ordem }]);
        if (error) throw error;
        setStatus('EVENTO GRAVADO NO FIM DA LINHA DO TEMPO');
        setF(VAZIO);
      }
      setSalvo(true);
    } catch (err) {
      setStatus('FALHA :: ' + mensagemEvento(err));
    }
    setLoading(false);
  };

  const ruim = status.startsWith('FALHA');

  return (
    <form className="panel" onSubmit={submit}>
      <div className="grupo">
        <span className="grupo-t">quando</span>
        <div className="field">
          <label>título *</label>
          <input value={f.titulo} onChange={set('titulo')} placeholder="A Queda de Castle del Las Noches" maxLength={LIMITES_EVENTO.titulo} required />
        </div>
        <div className="field">
          <label>data ou período</label>
          <input value={f.data} onChange={set('data')} placeholder="Ano 12 depois da Queda" />
          <p className="dica">texto livre — só o que aparece escrito na linha do tempo. A posição dela é ajustada depois, na lista, com os botões de subir/descer.</p>
        </div>
      </div>

      <div className="grupo">
        <span className="grupo-t">o que aconteceu</span>
        <div className="field">
          <label>resumo</label>
          <textarea value={f.resumo} onChange={set('resumo')} rows={3} maxLength={LIMITES_EVENTO.resumo}
            placeholder="Uma ou duas frases — é o que aparece direto na linha do tempo." />
        </div>
        <div className="field">
          <label>descrição completa</label>
          <textarea value={f.descricao} onChange={set('descricao')} rows={9} maxLength={LIMITES_EVENTO.descricao}
            placeholder="O relato completo do evento, para quem quiser ler mais." />
        </div>
      </div>

      <button className="go" disabled={loading}>
        {loading ? '// salvando...' : editando ? 'SALVAR ALTERAÇÕES' : 'GRAVAR EVENTO'}
      </button>

      {status && (
        <p className={'stat ' + (ruim ? 'bad' : 'ok')}>
          {status}
          {salvo && (
            <>
              {' — '}
              <Link href="/linha-do-tempo">ver a linha do tempo</Link>
              {' · '}
              <Link href="/admin/linha-do-tempo">voltar à lista</Link>
            </>
          )}
        </p>
      )}
    </form>
  );
}
