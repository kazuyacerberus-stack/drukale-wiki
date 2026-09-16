'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import '../matrix.css';
import MatrixRain from '../components/MatrixRain';
import { useBeep } from '../components/useBeep';
import { supabase } from '../lib/db';
import { mensagemEvento, type Evento } from '../lib/eventos';

export default function LinhaDoTempoPage() {
  const [lista, setLista] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const { beep, muted, setMuted } = useBeep();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('eventos').select('*').order('ordem', { ascending: true });
      if (error) setErro(mensagemEvento(error));
      else setLista((data ?? []) as Evento[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap narrow">
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">drukale://arquivo/linha-do-tempo</span>
            <div className="hd-act">
              <button className="ico" onClick={() => { const n = !muted; setMuted(n); if (!n) beep('hover'); }} title={muted ? 'ativar som' : 'silenciar'}>
                {muted ? '♪ off' : '♪ on'}
              </button>
              <Link className="ico" href="/">← arquivo</Link>
              <Link className="ico" href="/faccoes">facções</Link>
              <Link className="ico" href="/admin/linha-do-tempo">+ novo</Link>
            </div>
          </div>

          <h1 data-txt="LINHA DO TEMPO">LINHA DO TEMPO</h1>
          <p className="sub">&gt; os grandes marcos do império, em ordem <span className="cur" /></p>
        </header>

        {erro && <p className="erro">FALHA :: {erro}</p>}

        {loading ? (
          <div className="load"><span /><span /><span /><p>decodificando arquivo...</p></div>
        ) : lista.length === 0 ? (
          <p className="vazio">nenhum evento cadastrado ainda</p>
        ) : (
          <div className="linha-tempo">
            {lista.map((ev, i) => (
              <article className="evento-tempo" key={ev.id} style={{ animationDelay: `${Math.min(i * 70, 700)}ms` }}>
                <span className="evento-marca" />
                {ev.data && <span className="evento-data">{ev.data}</span>}
                <h2>{ev.titulo}</h2>
                {ev.resumo && <p className="evento-resumo">{ev.resumo}</p>}
                {ev.descricao && <p className="evento-desc">{ev.descricao}</p>}
              </article>
            ))}
          </div>
        )}

        <footer className="ft">drukale_system v1.0 // conexão segura estabelecida</footer>
      </main>
    </div>
  );
}
