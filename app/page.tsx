'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import './matrix.css';
import MatrixRain from './components/MatrixRain';
import { useBeep } from './components/useBeep';
import { supabase, type Character } from './lib/db';

export default function Home() {
  const [chars, setChars] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [query, setQuery] = useState('');
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const { beep, muted, setMuted } = useBeep();

  useEffect(() => {
    (async () => {
      // o id é UUID, então ordenar por ele dá ordem aleatória:
      // alfabética é o que faz sentido num arquivo de personagens
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .order('name', { ascending: true });
      if (error) setErro(error.message);
      else setChars((data ?? []) as Character[]);
      setLoading(false);
    })();
  }, []);

  const q = query.trim().toLowerCase();
  const list = q
    ? chars.filter((c) =>
        [c.name, c.epithet, c.faction, c.description]
          .some((v) => (v ?? '').toLowerCase().includes(q))
      )
    : chars;

  const inicial = (n: string | null) => (n?.trim()?.[0] ?? '?').toUpperCase();
  const rota = (c: Character) => `/personagem/${c.slug || c.id}`;

  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap">
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">drukale://arquivo/personagens</span>
            <div className="hd-act">
              <button
                className="ico"
                onClick={() => { const n = !muted; setMuted(n); if (!n) beep('hover'); }}
                title={muted ? 'ativar som' : 'silenciar'}
              >
                {muted ? '♪ off' : '♪ on'}
              </button>
              <Link className="ico" href="/admin">+ novo</Link>
            </div>
          </div>

          <h1 data-txt="IMPÉRIO DRUKALE">IMPÉRIO DRUKALE</h1>
          <p className="sub">&gt; arquivo central de personagens <span className="cur" /></p>
        </header>

        <div className="bar">
          <input
            className="srch"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="buscar por nome, epíteto ou facção..."
          />
          <span className="count">
            {loading ? 'CARREGANDO' : `${list.length} REGISTRO${list.length === 1 ? '' : 'S'}`}
          </span>
        </div>

        {erro && <p className="erro">FALHA :: {erro}</p>}

        {loading ? (
          <div className="load">
            <span /><span /><span />
            <p>decodificando arquivo...</p>
          </div>
        ) : list.length === 0 ? (
          <p className="vazio">
            {q
              ? 'nenhum registro corresponde à busca'
              : 'arquivo vazio — nenhum personagem registrado'}
          </p>
        ) : (
          <section className="grid">
            {list.map((c, i) => {
              const key = String(c.id);
              const ok = c.image_url && !broken[key];
              return (
                <Link
                  key={key}
                  href={rota(c)}
                  className="node"
                  style={{ animationDelay: `${Math.min(i * 55, 700)}ms` }}
                  onMouseEnter={() => beep('hover')}
                  onClick={() => beep('click')}
                >
                  <div className="ringwrap">
                    <span className="ring" />
                    <span className="ring2" />
                    <div className="orb">
                      {ok ? (
                        <img
                          src={c.image_url as string}
                          alt={c.name ?? ''}
                          onError={() => setBroken((b) => ({ ...b, [key]: true }))}
                        />
                      ) : (
                        <span className="ini">{inicial(c.name)}</span>
                      )}
                      <span className="sheen" />
                    </div>
                  </div>
                  <h3>{c.name ?? 'sem nome'}</h3>
                  <p className="desc">{c.epithet || c.description || ''}</p>
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
