'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import '../../matrix.css';
import MatrixRain from '../../components/MatrixRain';
import { useBeep } from '../../components/useBeep';
import { supabase } from '../../lib/db';
import { mensagemGlossario, type Termo } from '../../lib/glossario';

export default function TermoPage() {
  const params = useParams<{ slug: string }>();
  const chave = decodeURIComponent(String(params?.slug ?? ''));

  const [alvo, setAlvo] = useState<Termo | null>(null);
  const [loading, setLoading] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [erro, setErro] = useState('');
  const { beep } = useBeep();

  useEffect(() => {
    if (!chave) return;
    (async () => {
      setLoading(true);
      setNaoEncontrado(false);
      setErro('');
      const { data, error } = await supabase.from('glossario').select('*').eq('slug', chave).maybeSingle();
      if (error) { setErro(mensagemGlossario(error)); setLoading(false); return; }
      if (!data) { setNaoEncontrado(true); setLoading(false); return; }
      setAlvo(data as Termo);
      setLoading(false);
    })();
  }, [chave]);

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

  if (naoEncontrado || erro || !alvo) {
    return (
      <div className="term">
        <MatrixRain />
        <main className="wrap narrow">
          <header className="hd">
            <div className="hd-bar">
              <span className="dot" /><span className="dot" /><span className="dot" />
              <span className="hd-path">drukale://arquivo/glossario/{chave}</span>
              <div className="hd-act"><Link className="ico" href="/glossario">← glossário</Link></div>
            </div>
            <h1 data-txt="TERMO NÃO ENCONTRADO">TERMO NÃO ENCONTRADO</h1>
            <p className="sub">&gt; {erro || `nenhum termo responde por "${chave}"`}</p>
          </header>
        </main>
      </div>
    );
  }

  return (
    <div className="term">
      <MatrixRain />
      <main className="wrap narrow">
        <div className="hd-bar">
          <span className="dot" /><span className="dot" /><span className="dot" />
          <span className="hd-path">drukale://arquivo/glossario/{alvo.slug}</span>
          <div className="hd-act">
            <Link className="ico" href="/glossario" onClick={() => beep('close')}>← glossário</Link>
            <Link className="ico" href="/admin/glossario">gerenciar</Link>
          </div>
        </div>

        <div style={{ height: 26 }} />

        <span className="epi">{alvo.categoria}</span>
        <h1 data-txt={alvo.termo}>{alvo.termo}</h1>

        {alvo.resumo && <p className="cit">{alvo.resumo}</p>}

        {alvo.definicao ? (
          <section className="sec" style={{ animationDelay: '60ms' }}>
            <h2>definição</h2>
            <p>{alvo.definicao}</p>
          </section>
        ) : (
          !alvo.resumo && <p className="vazio">nenhum conteúdo arquivado para este termo ainda.</p>
        )}

        <footer className="ft">drukale_system v1.0 // conexão segura estabelecida</footer>
      </main>
    </div>
  );
}
