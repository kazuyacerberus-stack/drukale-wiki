'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import '../../../../matrix.css';
import MatrixRain from '../../../../components/MatrixRain';
import Protegido from '../../../../components/Protegido';
import GlossarioForm from '../../../../components/GlossarioForm';
import { supabase } from '../../../../lib/db';
import { type Termo } from '../../../../lib/glossario';

export default function EditarTermo() {
  const params = useParams<{ slug: string }>();
  const chave = decodeURIComponent(String(params?.slug ?? ''));

  const [alvo, setAlvo] = useState<Termo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chave) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('glossario').select('*').eq('slug', chave).maybeSingle();
      setAlvo((data as Termo) ?? null);
      setLoading(false);
    })();
  }, [chave]);

  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap narrow">
       <Protegido>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">terranova://admin/glossario/editar/{chave}</span>
            <div className="hd-act">
              <Link className="ico" href="/admin/glossario">← glossário</Link>
              {alvo && <Link className="ico" href={`/glossario/${alvo.slug}`}>ver página</Link>}
            </div>
          </div>
          <h1 data-txt="EDITAR TERMO">EDITAR TERMO</h1>
          <p className="sub">&gt; {loading ? 'carregando...' : alvo?.termo ?? 'não encontrado'} <span className="cur" /></p>
        </header>

        {loading ? (
          <div className="load"><span /><span /><span /><p>acessando registro...</p></div>
        ) : !alvo ? (
          <p className="vazio">
            nenhum termo responde por &quot;{chave}&quot; —{' '}
            <Link href="/admin/glossario" style={{ color: 'var(--g)' }}>voltar à lista</Link>
          </p>
        ) : (
          <GlossarioForm inicial={alvo} />
        )}

        <footer className="ft">terranova_system v1.0 // conexão segura estabelecida</footer>
       </Protegido>
      </main>
    </div>
  );
}
