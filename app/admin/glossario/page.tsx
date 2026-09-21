'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import '../../matrix.css';
import MatrixRain from '../../components/MatrixRain';
import Protegido from '../../components/Protegido';
import { supabase } from '../../lib/db';
import { CATEGORIAS_GLOSSARIO, mensagemGlossario, type Termo } from '../../lib/glossario';

export default function PainelGlossario() {
  const [lista, setLista] = useState<Termo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [query, setQuery] = useState('');
  const [categoria, setCategoria] = useState('');
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [apagando, setApagando] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('glossario').select('*').order('termo', { ascending: true });
    if (error) setErro(mensagemGlossario(error));
    else setLista((data ?? []) as Termo[]);
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const excluir = async (t: Termo) => {
    setApagando(t.id);
    setAviso('');
    const { error } = await supabase.from('glossario').delete().eq('id', t.id);
    if (error) {
      setAviso('FALHA :: ' + mensagemGlossario(error));
    } else {
      setLista((l) => l.filter((x) => x.id !== t.id));
      setAviso(`TERMO "${t.termo}" REMOVIDO`);
    }
    setApagando(null);
    setConfirmar(null);
  };

  const q = query.trim().toLowerCase();
  const filtrada = lista.filter((t) => (!categoria || t.categoria === categoria) && (!q || t.termo.toLowerCase().includes(q)));
  const ruim = aviso.startsWith('FALHA');

  return (
    <div className="term">
      <MatrixRain />
      <main className="wrap">
       <Protegido>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">terranova://admin/glossario</span>
            <div className="hd-act">
              <Link className="ico" href="/admin">← painel</Link>
              <Link className="ico" href="/admin/glossario/novo">+ novo termo</Link>
            </div>
          </div>
          <h1 data-txt="GLOSSÁRIO">GLOSSÁRIO</h1>
          <p className="sub">&gt; raças, magia, tecnologia e mais <span className="cur" /></p>
        </header>

        <div className="bar">
          <input className="srch" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="filtrar termos..." />
          <span className="count">{loading ? 'CARREGANDO' : `${filtrada.length} DE ${lista.length}`}</span>
        </div>

        <div className="abas" style={{ marginBottom: 24 }}>
          <button className={`aba${categoria === '' ? ' on' : ''}`} onClick={() => setCategoria('')}>todas</button>
          {CATEGORIAS_GLOSSARIO.map((c) => (
            <button key={c} className={`aba${categoria === c ? ' on' : ''}`} onClick={() => setCategoria(categoria === c ? '' : c)}>{c}</button>
          ))}
        </div>

        {erro && <p className="erro">FALHA :: {erro}</p>}
        {aviso && <p className={'stat ' + (ruim ? 'bad' : 'ok')} style={{ textAlign: 'left', margin: '0 0 20px' }}>{aviso}</p>}

        {loading ? (
          <div className="load"><span /><span /><span /><p>lendo o glossário...</p></div>
        ) : filtrada.length === 0 ? (
          <p className="vazio">{q || categoria ? 'nenhum termo corresponde ao filtro' : 'nenhum termo cadastrado ainda'}</p>
        ) : (
          <div className="lista">
            {filtrada.map((t) => {
              const emConfirmacao = confirmar === t.id;
              return (
                <div className={'item' + (emConfirmacao ? ' perigo' : '')} key={t.id}>
                  <div className="info">
                    <strong>{t.termo}</strong>
                    <span className="meta">{t.categoria}{t.resumo ? ` · ${t.resumo}` : ''}</span>
                    <span className="slug">/glossario/{t.slug}</span>
                  </div>
                  {emConfirmacao ? (
                    <div className="acoes">
                      <button className="mini-btn perigo" disabled={apagando === t.id} onClick={() => excluir(t)}>
                        {apagando === t.id ? '...' : 'confirmar'}
                      </button>
                      <button className="mini-btn" onClick={() => setConfirmar(null)}>cancelar</button>
                    </div>
                  ) : (
                    <div className="acoes">
                      <Link className="mini-btn" href={`/glossario/${t.slug}`}>ver</Link>
                      <Link className="mini-btn" href={`/admin/glossario/editar/${t.slug}`}>editar</Link>
                      <button className="mini-btn dim" onClick={() => { setConfirmar(t.id); setAviso(''); }}>excluir</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <footer className="ft">terranova_system v1.0 // conexão segura estabelecida</footer>
       </Protegido>
      </main>
    </div>
  );
}
