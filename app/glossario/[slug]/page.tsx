'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import '../../matrix.css';
import MatrixRain from '../../components/MatrixRain';
import PrecisaAprovacao from '../../components/PrecisaAprovacao';
import { useBeep } from '../../components/useBeep';
import { supabase } from '../../lib/db';
import { mensagemGlossario, type Termo } from '../../lib/glossario';

/**
 * A busca do termo só começa depois que `PrecisaAprovacao` libera —
 * senão, para quem ainda não tem conta aprovada, a RLS devolveria vazio
 * e a tela mostraria "termo não encontrado" em vez do aviso de espera.
 */
export default function TermoPage() {
  return (
    <div className="term">
      <MatrixRain />
      <main className="wrap narrow">
        <PrecisaAprovacao>
          <TermoPageInterna />
        </PrecisaAprovacao>
      </main>
    </div>
  );
}

function TermoPageInterna() {
  const params = useParams<{ slug: string }>();
  const chave = decodeURIComponent(String(params?.slug ?? ''));

  const [alvo, setAlvo] = useState<Termo | null>(null);
  const [loading, setLoading] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [erro, setErro] = useState('');
  const [quebrada, setQuebrada] = useState(false);
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
    return <div className="load"><span /><span /><span /><p>acessando registro...</p></div>;
  }

  if (naoEncontrado || erro || !alvo) {
    return (
      <header className="hd">
        <div className="hd-bar">
          <span className="dot" /><span className="dot" /><span className="dot" />
          <span className="hd-path">terrasave://arquivo/glossario/{chave}</span>
          <div className="hd-act"><Link className="ico" href="/glossario">← glossário</Link></div>
        </div>
        <h1 data-txt="TERMO NÃO ENCONTRADO">TERMO NÃO ENCONTRADO</h1>
        <p className="sub">&gt; {erro || `nenhum termo responde por "${chave}"`}</p>
      </header>
    );
  }

  return (
    <>
        <div className="hd-bar">
          <span className="dot" /><span className="dot" /><span className="dot" />
          <span className="hd-path">terrasave://arquivo/glossario/{alvo.slug}</span>
          <div className="hd-act">
            <Link className="ico" href="/glossario" onClick={() => beep('close')}>← glossário</Link>
            <Link className="ico" href="/admin/glossario">gerenciar</Link>
          </div>
        </div>

        <div style={{ height: 26 }} />

        <span className="epi">{alvo.categoria}</span>
        <h1 data-txt={alvo.termo}>{alvo.termo}</h1>

        {alvo.imagem && !quebrada && (
          <figure className="painel-foto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={alvo.imagem} alt={alvo.termo} onError={() => setQuebrada(true)} />
          </figure>
        )}

        {alvo.resumo && <p className="cit">{alvo.resumo}</p>}

        {alvo.definicao ? (
          <section className="sec" style={{ animationDelay: '60ms' }}>
            <h2>definição</h2>
            <p>{alvo.definicao}</p>
          </section>
        ) : (
          !alvo.resumo && <p className="vazio">nenhum conteúdo arquivado para este termo ainda.</p>
        )}

        <footer className="ft">terrasave_system v1.0 // conexão segura estabelecida</footer>
    </>
  );
}
