'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../matrix.css';
import MatrixRain from '../components/MatrixRain';
import Protegido from '../components/Protegido';
import { cabecalhoAuth, sair } from '../lib/auth';
import { supabase, lerSecoes, type Character } from '../lib/db';

export default function Painel() {
  const router = useRouter();
  const [chars, setChars] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [query, setQuery] = useState('');
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [apagando, setApagando] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .order('name', { ascending: true });
    if (error) setErro(error.message);
    else setChars((data ?? []) as Character[]);
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const excluir = async (c: Character) => {
    setApagando(String(c.id));
    setAviso('');
    try {
      const res = await fetch(`/api/characters?id=${encodeURIComponent(String(c.id))}`, {
        method: 'DELETE',
        headers: await cabecalhoAuth(),
      });
      const data = await res.json();
      if (!res.ok) {
        setAviso('FALHA :: ' + (data.error ?? 'não foi possível excluir'));
      } else {
        setChars((l) => l.filter((x) => String(x.id) !== String(c.id)));
        setAviso(`REGISTRO "${c.name ?? ''}" REMOVIDO`);
      }
    } catch (err) {
      setAviso('FALHA :: ' + (err instanceof Error ? err.message : 'desconhecida'));
    }
    setApagando(null);
    setConfirmar(null);
  };

  const q = query.trim().toLowerCase();
  const list = q
    ? chars.filter((c) =>
        [c.name, c.epithet, c.faction].some((v) => (v ?? '').toLowerCase().includes(q))
      )
    : chars;

  const inicial = (n: string | null) => (n?.trim()?.[0] ?? '?').toUpperCase();
  const ruim = aviso.startsWith('FALHA');

  /* quantos itens da ficha estão preenchidos — mostra o que falta completar */
  const ITENS_FICHA = 7;   // epíteto, citação, facção, status, raça, afiliações e as abas
  const completude = (c: Character) => {
    const campos = [c.epithet, c.quote, c.faction, c.status, c.race, c.affiliation];
    const temAbas = lerSecoes(c.sections).length > 0;
    return campos.filter(Boolean).length + (temAbas ? 1 : 0);
  };

  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap">
       <Protegido>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">drukale://admin/painel</span>
            <div className="hd-act">
              <Link className="ico" href="/">← arquivo</Link>
              <Link className="ico" href="/admin/novo">+ novo registro</Link>
              <Link className="ico" href="/admin/comunidade">comunidade</Link>
              <button
                className="ico dim"
                onClick={async () => { await sair(); router.replace('/admin/login'); }}
              >
                sair
              </button>
            </div>
          </div>
          <h1 data-txt="PAINEL">PAINEL</h1>
          <p className="sub">&gt; gerenciar registros <span className="cur" /></p>
        </header>

        <div className="bar">
          <input
            className="srch"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="filtrar registros..."
          />
          <span className="count">
            {loading ? 'CARREGANDO' : `${list.length} DE ${chars.length}`}
          </span>
        </div>

        {erro && <p className="erro">FALHA :: {erro}</p>}
        {aviso && <p className={'stat ' + (ruim ? 'bad' : 'ok')} style={{ textAlign: 'left', margin: '0 0 20px' }}>{aviso}</p>}

        {loading ? (
          <div className="load">
            <span /><span /><span />
            <p>lendo arquivo...</p>
          </div>
        ) : list.length === 0 ? (
          <p className="vazio">
            {q ? 'nenhum registro corresponde ao filtro' : 'nenhum personagem registrado ainda'}
          </p>
        ) : (
          <div className="lista">
            {list.map((c) => {
              const id = String(c.id);
              const emConfirmacao = confirmar === id;
              const preenchidos = completude(c);
              return (
                <div className={'item' + (emConfirmacao ? ' perigo' : '')} key={id}>
                  <div className="mini">
                    {c.image_url ? (
                      <img src={c.image_url} alt="" />
                    ) : (
                      <span className="ini" style={{ fontSize: 22 }}>{inicial(c.name)}</span>
                    )}
                  </div>

                  <div className="info">
                    <strong>{c.name ?? 'sem nome'}</strong>
                    <span className="meta">
                      {c.epithet || <em>sem epíteto</em>}
                      {c.faction ? ` · ${c.faction}` : ''}
                      {c.status ? ` · ${c.status}` : ''}
                    </span>
                    <span className="slug">/personagem/{c.slug || id}</span>
                  </div>

                  <div className="barra" title={`${preenchidos} de ${ITENS_FICHA} itens preenchidos`}>
                    <span style={{ width: `${(preenchidos / ITENS_FICHA) * 100}%` }} />
                  </div>

                  {emConfirmacao ? (
                    <div className="acoes">
                      <button
                        className="mini-btn perigo"
                        disabled={apagando === id}
                        onClick={() => excluir(c)}
                      >
                        {apagando === id ? '...' : 'confirmar'}
                      </button>
                      <button className="mini-btn" onClick={() => setConfirmar(null)}>cancelar</button>
                    </div>
                  ) : (
                    <div className="acoes">
                      <Link className="mini-btn" href={`/personagem/${c.slug || id}`}>ver</Link>
                      <Link className="mini-btn" href={`/admin/editar/${c.slug || id}`}>editar</Link>
                      <button className="mini-btn dim" onClick={() => { setConfirmar(id); setAviso(''); }}>
                        excluir
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <footer className="ft">drukale_system v1.0 // conexão segura estabelecida</footer>
       </Protegido>
      </main>
    </div>
  );
}
