'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import '../matrix.css';
import MatrixRain from '../components/MatrixRain';
import PrecisaAprovacao from '../components/PrecisaAprovacao';
import { useBeep } from '../components/useBeep';
import { supabase } from '../lib/db';
import { CATEGORIAS_GLOSSARIO, mensagemGlossario, type Termo } from '../lib/glossario';

export default function GlossarioPage() {
  const [lista, setLista] = useState<Termo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [query, setQuery] = useState('');
  const [categoria, setCategoria] = useState('');
  const { beep, muted, setMuted } = useBeep();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('glossario').select('*').order('termo', { ascending: true });
      if (error) setErro(mensagemGlossario(error));
      else setLista((data ?? []) as Termo[]);
      setLoading(false);
    })();
  }, []);

  const q = query.trim().toLowerCase();
  const filtrada = lista.filter((t) => (!categoria || t.categoria === categoria) && (!q || t.termo.toLowerCase().includes(q) || (t.resumo ?? '').toLowerCase().includes(q)));

  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap">
       <PrecisaAprovacao>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">drukale://arquivo/glossario</span>
            <div className="hd-act">
              <button className="ico" onClick={() => { const n = !muted; setMuted(n); if (!n) beep('hover'); }} title={muted ? 'ativar som' : 'silenciar'}>
                {muted ? '♪ off' : '♪ on'}
              </button>
              <Link className="ico" href="/">← arquivo</Link>
              <Link className="ico" href="/admin/glossario">+ novo</Link>
            </div>
          </div>

          <h1 data-txt="GLOSSÁRIO">GLOSSÁRIO</h1>
          <p className="sub">&gt; raças, magia, tecnologia e mais, num só lugar <span className="cur" /></p>
        </header>

        <div className="bar">
          <input className="srch" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="buscar por termo ou resumo..." />
          <span className="count">{loading ? 'CARREGANDO' : `${filtrada.length} ${filtrada.length === 1 ? 'TERMO' : 'TERMOS'}`}</span>
        </div>

        {!loading && lista.length > 0 && (
          <div className="abas" style={{ marginBottom: 26 }}>
            <button className={`aba${categoria === '' ? ' on' : ''}`} onClick={() => setCategoria('')}>todas</button>
            {CATEGORIAS_GLOSSARIO.map((c) => (
              <button key={c} className={`aba${categoria === c ? ' on' : ''}`} onClick={() => setCategoria(categoria === c ? '' : c)}>{c}</button>
            ))}
          </div>
        )}

        {erro && <p className="erro">FALHA :: {erro}</p>}

        {loading ? (
          <div className="load"><span /><span /><span /><p>decodificando arquivo...</p></div>
        ) : filtrada.length === 0 ? (
          <p className="vazio">{q || categoria ? 'nenhum termo corresponde à busca' : 'nenhum termo cadastrado ainda'}</p>
        ) : (
          <div className="lista">
            {filtrada.map((t) => (
              <Link key={t.id} href={`/glossario/${t.slug}`} className="item" onMouseEnter={() => beep('hover')} onClick={() => beep('click')}>
                <div className="info">
                  <strong>{t.termo}</strong>
                  <span className="meta">{t.categoria}</span>
                  {t.resumo && <span className="slug">{t.resumo}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}

        <footer className="ft">drukale_system v1.0 // conexão segura estabelecida</footer>
       </PrecisaAprovacao>
      </main>
    </div>
  );
}
