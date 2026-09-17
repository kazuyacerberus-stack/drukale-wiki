'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import '../matrix.css';
import MatrixRain from '../components/MatrixRain';
import { useBeep } from '../components/useBeep';
import { supabase } from '../lib/db';
import { mensagemFaccao, type Faccao } from '../lib/faccoes';

export default function FaccoesPage() {
  const [lista, setLista] = useState<Faccao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [query, setQuery] = useState('');
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const { beep, muted, setMuted } = useBeep();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('faccoes').select('*').order('nome', { ascending: true });
      if (error) setErro(mensagemFaccao(error));
      else setLista((data ?? []) as Faccao[]);
      setLoading(false);
    })();
  }, []);

  const q = query.trim().toLowerCase();
  const filtrada = q ? lista.filter((f) => f.nome.toLowerCase().includes(q) || (f.resumo ?? '').toLowerCase().includes(q)) : lista;
  const inicial = (n: string) => (n.trim()[0] ?? '?').toUpperCase();

  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap">
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">drukale://arquivo/faccoes</span>
            <div className="hd-act">
              <button className="ico" onClick={() => { const n = !muted; setMuted(n); if (!n) beep('hover'); }} title={muted ? 'ativar som' : 'silenciar'}>
                {muted ? '♪ off' : '♪ on'}
              </button>
              <Link className="ico" href="/">← arquivo</Link>
              <Link className="ico" href="/personagens">personagens</Link>
              <Link className="ico" href="/linha-do-tempo">linha do tempo</Link>
              <Link className="ico" href="/glossario">glossário</Link>
              <Link className="ico" href="/admin/faccoes">+ nova</Link>
            </div>
          </div>

          <h1 data-txt="FACÇÕES">FACÇÕES</h1>
          <p className="sub">&gt; casas, ordens e organizações do império <span className="cur" /></p>
        </header>

        <div className="bar">
          <input className="srch" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="buscar por nome ou resumo..." />
          <span className="count">{loading ? 'CARREGANDO' : `${filtrada.length} ${filtrada.length === 1 ? 'FACÇÃO' : 'FACÇÕES'}`}</span>
        </div>

        {erro && <p className="erro">FALHA :: {erro}</p>}

        {loading ? (
          <div className="load"><span /><span /><span /><p>decodificando arquivo...</p></div>
        ) : filtrada.length === 0 ? (
          <p className="vazio">{q ? 'nenhuma facção corresponde à busca' : 'nenhuma facção cadastrada ainda'}</p>
        ) : (
          <section className="grid">
            {filtrada.map((f, i) => {
              const ok = f.simbolo && !broken[f.id];
              return (
                <Link
                  key={f.id}
                  href={`/faccoes/${f.slug}`}
                  className="node"
                  style={{ animationDelay: `${Math.min(i * 55, 700)}ms` }}
                  onMouseEnter={() => beep('hover')}
                  onClick={() => beep('click')}
                >
                  <div className="ringwrap">
                    <span className="ring" style={{ borderColor: f.cor }} />
                    <span className="ring2" />
                    <div className="orb" style={{ borderColor: f.cor }}>
                      {ok ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.simbolo as string} alt={f.nome} onError={() => setBroken((b) => ({ ...b, [f.id]: true }))} />
                      ) : (
                        <span className="ini" style={{ color: f.cor }}>{inicial(f.nome)}</span>
                      )}
                      <span className="sheen" />
                    </div>
                  </div>
                  <h3>{f.nome}</h3>
                  <p className="desc">{f.resumo || ''}</p>
                </Link>
              );
            })}
          </section>
        )}

        <footer className="ft">drukale_system v1.0 // conexão segura estabelecida</footer>
      </main>
    </div>
  );
}
