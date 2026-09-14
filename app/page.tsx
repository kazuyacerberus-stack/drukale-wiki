'use client';

import { useState, useEffect, useMemo } from 'react';
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
  const [faccao, setFaccao] = useState('');   // '' = todas
  const [estado, setEstado] = useState('');   // '' = todos
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

  /**
   * Monta a lista de abas de um campo a partir dos personagens que existem.
   * Agrupa ignorando maiúsculas — "Casa Drukale" e "casa drukale" viram
   * uma aba só — e mostra a forma como foi escrita da primeira vez.
   * Ordena da facção mais numerosa para a menos numerosa.
   */
  const abasDe = (campo: 'faction' | 'status') => {
    const mapa = new Map<string, { rotulo: string; n: number }>();
    for (const c of chars) {
      const bruto = (c[campo] ?? '').trim();
      if (!bruto) continue;
      const chave = bruto.toLowerCase();
      const atual = mapa.get(chave);
      if (atual) atual.n++;
      else mapa.set(chave, { rotulo: bruto, n: 1 });
    }
    return [...mapa.entries()]
      .map(([chave, v]) => ({ chave, rotulo: v.rotulo, n: v.n }))
      .sort((a, b) => b.n - a.n || a.rotulo.localeCompare(b.rotulo));
  };

  const faccoes = useMemo(() => abasDe('faction'), [chars]);
  const estados = useMemo(() => abasDe('status'), [chars]);

  const q = query.trim().toLowerCase();
  const list = chars.filter((c) => {
    if (faccao && (c.faction ?? '').trim().toLowerCase() !== faccao) return false;
    if (estado && (c.status ?? '').trim().toLowerCase() !== estado) return false;
    if (
      q &&
      ![c.name, c.epithet, c.faction, c.description].some((v) =>
        (v ?? '').toLowerCase().includes(q)
      )
    ) return false;
    return true;
  });

  const filtrando = Boolean(q || faccao || estado);

  const inicial = (n: string | null) => (n?.trim()?.[0] ?? '?').toUpperCase();
  const rota = (c: Character) => `/personagem/${c.slug || c.id}`;

  /** Desenha uma linha de abas. Clicar na aba já ativa desliga o filtro. */
  const linhaDeAbas = (
    titulo: string,
    todos: string,
    opcoes: { chave: string; rotulo: string; n: number }[],
    valor: string,
    definir: (v: string) => void
  ) => (
    <div className="abas">
      <span className="abas-rot">{titulo}</span>
      <button
        className={`aba${valor === '' ? ' on' : ''}`}
        onClick={() => { definir(''); beep('click'); }}
        onMouseEnter={() => beep('hover')}
      >
        {todos}<span className="n">{chars.length}</span>
      </button>
      {opcoes.map((o) => (
        <button
          key={o.chave}
          className={`aba${valor === o.chave ? ' on' : ''}`}
          onClick={() => { definir(valor === o.chave ? '' : o.chave); beep('click'); }}
          onMouseEnter={() => beep('hover')}
        >
          {o.rotulo}<span className="n">{o.n}</span>
        </button>
      ))}
    </div>
  );

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

        {/* abas de filtragem — aparecem assim que existir facção ou status preenchido */}
        {!loading && (faccoes.length > 0 || estados.length > 0) && (
          <div className="filtros">
            {faccoes.length > 0 &&
              linhaDeAbas('facção', 'todas', faccoes, faccao, setFaccao)}
            {estados.length > 0 &&
              linhaDeAbas('status', 'todos', estados, estado, setEstado)}
          </div>
        )}

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
            {filtrando
              ? 'nenhum registro corresponde aos filtros'
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
