'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import '../../matrix.css';
import MatrixRain from '../../components/MatrixRain';
import { useBeep } from '../../components/useBeep';
import { supabase, FICHA, type Character } from '../../lib/db';

export default function PersonagemPage() {
  const params = useParams<{ slug: string }>();
  const chave = decodeURIComponent(String(params?.slug ?? ''));

  const [alvo, setAlvo] = useState<Character | null>(null);
  const [vizinhos, setVizinhos] = useState<{ ant: Character | null; prox: Character | null }>({
    ant: null,
    prox: null,
  });
  const [loading, setLoading] = useState(true);
  const [quebrada, setQuebrada] = useState(false);
  const { beep, muted, setMuted } = useBeep();

  useEffect(() => {
    if (!chave) return;
    (async () => {
      setLoading(true);

      // busca todos e resolve localmente: funciona por slug ou por id,
      // e já entrega os vizinhos para a navegação do rodapé
      const { data } = await supabase
        .from('characters')
        .select('*')
        .order('name', { ascending: true });

      const todos = (data ?? []) as Character[];
      const idx = todos.findIndex(
        (c) => c.slug === chave || String(c.id) === chave
      );

      if (idx >= 0) {
        setAlvo(todos[idx]);
        // com um só personagem não faz sentido navegar para ele mesmo
        setVizinhos(
          todos.length < 2
            ? { ant: null, prox: null }
            : {
                ant: todos[(idx - 1 + todos.length) % todos.length],
                prox: todos[(idx + 1) % todos.length],
              }
        );
      } else {
        setAlvo(null);
      }
      setLoading(false);
    })();
  }, [chave]);

  const inicial = (n: string | null) => (n?.trim()?.[0] ?? '?').toUpperCase();
  const rota = (c: Character) => `/personagem/${c.slug || c.id}`;

  /* ---------- carregando ---------- */
  if (loading) {
    return (
      <div className="term">
        <MatrixRain />
        <main className="wrap narrow">
          <div className="load">
            <span /><span /><span />
            <p>acessando registro...</p>
          </div>
        </main>
      </div>
    );
  }

  /* ---------- não encontrado ---------- */
  if (!alvo) {
    return (
      <div className="term">
        <MatrixRain />
        <main className="wrap narrow">
          <Link className="volta" href="/" onClick={() => beep('close')}>
            ← voltar ao arquivo
          </Link>
          <header className="hd">
            <h1 data-txt="REGISTRO NÃO ENCONTRADO">REGISTRO NÃO ENCONTRADO</h1>
            <p className="sub">&gt; nenhum personagem responde por &quot;{chave}&quot;</p>
          </header>
        </main>
      </div>
    );
  }

  /* ---------- ficha ---------- */
  const linhas = FICHA.map((f) => ({
    rotulo: f.rotulo,
    valor: (alvo[f.campo] as string | null) ?? null,
  })).filter((l) => l.valor);

  const temImagem = alvo.image_url && !quebrada;

  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap">
        <div className="hd-bar">
          <span className="dot" /><span className="dot" /><span className="dot" />
          <span className="hd-path">
            drukale://arquivo/personagem/{alvo.slug || alvo.id}
          </span>
          <div className="hd-act">
            <button
              className="ico"
              onClick={() => { const n = !muted; setMuted(n); if (!n) beep('hover'); }}
            >
              {muted ? '♪ off' : '♪ on'}
            </button>
            <Link className="ico" href="/" onClick={() => beep('close')}>
              ← arquivo
            </Link>
          </div>
        </div>

        <div style={{ height: 26 }} />

        <div className="perfil">
          {/* ---------- coluna principal ---------- */}
          <div>
            <div className="pcab">
              <div className="retrato">
                <span className="halo" />
                <div className="orb">
                  {temImagem ? (
                    <img
                      src={alvo.image_url as string}
                      alt={alvo.name ?? ''}
                      onError={() => setQuebrada(true)}
                    />
                  ) : (
                    <span className="ini big">{inicial(alvo.name)}</span>
                  )}
                </div>
              </div>

              <div className="pnome">
                {alvo.epithet && <span className="epi">{alvo.epithet}</span>}
                <h1 data-txt={alvo.name ?? 'sem nome'}>{alvo.name ?? 'sem nome'}</h1>
              </div>
            </div>

            {alvo.quote && <p className="cit">&ldquo;{alvo.quote}&rdquo;</p>}

            {alvo.description && (
              <section className="sec" style={{ animationDelay: '60ms' }}>
                <h2>resumo</h2>
                <p>{alvo.description}</p>
              </section>
            )}

            {alvo.history && (
              <section className="sec" style={{ animationDelay: '140ms' }}>
                <h2>história</h2>
                <p>{alvo.history}</p>
              </section>
            )}

            {alvo.powers && (
              <section className="sec" style={{ animationDelay: '220ms' }}>
                <h2>poderes e habilidades</h2>
                <p>{alvo.powers}</p>
              </section>
            )}

            {!alvo.description && !alvo.history && !alvo.powers && (
              <p className="vazio">nenhum conteúdo arquivado para este registro.</p>
            )}
          </div>

          {/* ---------- ficha lateral ---------- */}
          <aside className="ficha">
            <h3>ficha</h3>
            <dl>
              <div className="linha">
                <dt>registro</dt>
                <dd>#{String(alvo.id).replace(/-/g, '').slice(0, 8).toUpperCase()}</dd>
              </div>
              {linhas.map((l) => (
                <div className="linha" key={l.rotulo}>
                  <dt>{l.rotulo}</dt>
                  <dd>{l.valor}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>

        {/* ---------- navegação ---------- */}
        {(vizinhos.ant || vizinhos.prox) && (
          <nav className="naveg">
            {vizinhos.ant && (
              <Link href={rota(vizinhos.ant)} onClick={() => beep('click')}>
                <small>← anterior</small>
                {vizinhos.ant.name ?? 'sem nome'}
              </Link>
            )}
            {vizinhos.prox && (
              <Link
                href={rota(vizinhos.prox)}
                onClick={() => beep('click')}
                style={{ textAlign: 'right' }}
              >
                <small>próximo →</small>
                {vizinhos.prox.name ?? 'sem nome'}
              </Link>
            )}
          </nav>
        )}

        <footer className="ft">drukale_system v1.0 // conexão segura estabelecida</footer>
      </main>
    </div>
  );
}
