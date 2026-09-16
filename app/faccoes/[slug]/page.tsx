'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import '../../matrix.css';
import MatrixRain from '../../components/MatrixRain';
import { useBeep } from '../../components/useBeep';
import { supabase, type Character } from '../../lib/db';
import { normalizarNome, mensagemFaccao, type Faccao } from '../../lib/faccoes';

export default function FaccaoPage() {
  const params = useParams<{ slug: string }>();
  const chave = decodeURIComponent(String(params?.slug ?? ''));

  const [alvo, setAlvo] = useState<Faccao | null>(null);
  const [membros, setMembros] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [naoEncontrada, setNaoEncontrada] = useState(false);
  const [erro, setErro] = useState('');
  const [quebrada, setQuebrada] = useState(false);
  const { beep } = useBeep();

  useEffect(() => {
    if (!chave) return;
    (async () => {
      setLoading(true);
      setNaoEncontrada(false);
      setErro('');

      const [{ data: fac, error: erroFac }, { data: chars }] = await Promise.all([
        supabase.from('faccoes').select('*').eq('slug', chave).maybeSingle(),
        supabase.from('characters').select('*'),
      ]);

      if (erroFac) { setErro(mensagemFaccao(erroFac)); setLoading(false); return; }
      if (!fac) { setNaoEncontrada(true); setLoading(false); return; }

      const facao = fac as Faccao;
      const alvoNorm = normalizarNome(facao.nome);
      const todos = (chars ?? []) as Character[];
      setAlvo(facao);
      setMembros(
        todos
          .filter((c) => c.faction && normalizarNome(c.faction) === alvoNorm)
          .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'pt-BR'))
      );
      setLoading(false);
    })();
  }, [chave]);

  const inicial = useMemo(() => (alvo?.nome.trim()[0] ?? '?').toUpperCase(), [alvo]);
  const temSimbolo = alvo?.simbolo && !quebrada;

  if (loading) {
    return (
      <div className="term">
        <MatrixRain />
        <main className="wrap narrow">
          <div className="load"><span /><span /><span /><p>acessando registro...</p></div>
        </main>
      </div>
    );
  }

  if (naoEncontrada || erro || !alvo) {
    return (
      <div className="term">
        <MatrixRain />
        <main className="wrap narrow">
          <header className="hd">
            <div className="hd-bar">
              <span className="dot" /><span className="dot" /><span className="dot" />
              <span className="hd-path">drukale://arquivo/faccoes/{chave}</span>
              <div className="hd-act"><Link className="ico" href="/faccoes">← facções</Link></div>
            </div>
            <h1 data-txt="FACÇÃO NÃO ENCONTRADA">FACÇÃO NÃO ENCONTRADA</h1>
            <p className="sub">&gt; {erro || `nenhuma facção responde por "${chave}"`}</p>
          </header>
        </main>
      </div>
    );
  }

  return (
    <div className="term">
      <MatrixRain />
      <main className="wrap">
        <div className="hd-bar">
          <span className="dot" /><span className="dot" /><span className="dot" />
          <span className="hd-path">drukale://arquivo/faccoes/{alvo.slug}</span>
          <div className="hd-act">
            <Link className="ico" href="/faccoes" onClick={() => beep('close')}>← facções</Link>
            <Link className="ico" href="/admin/faccoes">gerenciar</Link>
          </div>
        </div>

        <div style={{ height: 26 }} />

        <div style={{ maxWidth: 680 }}>
          <div className="pcab">
            <div className="retrato">
              <span className="halo" style={{ borderColor: alvo.cor }} />
              <div className="orb" style={{ borderColor: alvo.cor }}>
                {temSimbolo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={alvo.simbolo as string} alt={alvo.nome} onError={() => setQuebrada(true)} />
                ) : (
                  <span className="ini big" style={{ color: alvo.cor }}>{inicial}</span>
                )}
              </div>
            </div>
            <div className="pnome">
              <span className="epi" style={{ color: alvo.cor }}>facção</span>
              <h1 data-txt={alvo.nome}>{alvo.nome}</h1>
            </div>
          </div>

          {alvo.resumo && <p className="cit" style={{ borderColor: alvo.cor }}>{alvo.resumo}</p>}

          {alvo.territorio && (
            <section className="sec" style={{ animationDelay: '60ms' }}>
              <h2>território</h2>
              <p>{alvo.territorio}</p>
            </section>
          )}

          {alvo.historia && (
            <section className="sec" style={{ animationDelay: '120ms' }}>
              <h2>história</h2>
              <p>{alvo.historia}</p>
            </section>
          )}

          {!alvo.resumo && !alvo.territorio && !alvo.historia && (
            <p className="vazio">nenhum conteúdo arquivado para esta facção ainda.</p>
          )}
        </div>

        <section style={{ marginTop: 44 }}>
          <h2 style={{ margin: '0 0 18px' }}>membros{membros.length > 0 ? ` (${membros.length})` : ''}</h2>
          {membros.length === 0 ? (
            <p className="vazio">nenhum personagem vinculado a esta facção ainda.</p>
          ) : (
            <section className="grid">
              {membros.map((c, i) => {
                const ok = c.image_url;
                const nomeInicial = (c.name?.trim()?.[0] ?? '?').toUpperCase();
                return (
                  <Link
                    key={String(c.id)}
                    href={`/personagem/${c.slug || c.id}`}
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
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.image_url as string} alt={c.name ?? ''} />
                        ) : (
                          <span className="ini">{nomeInicial}</span>
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
        </section>

        <footer className="ft">drukale_system v1.0 // conexão segura estabelecida</footer>
      </main>
    </div>
  );
}
