'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import '../../../../matrix.css';
import MatrixRain from '../../../../components/MatrixRain';
import Protegido from '../../../../components/Protegido';
import FaccaoForm from '../../../../components/FaccaoForm';
import { supabase } from '../../../../lib/db';
import { type Faccao } from '../../../../lib/faccoes';

export default function EditarFaccao() {
  const params = useParams<{ slug: string }>();
  const chave = decodeURIComponent(String(params?.slug ?? ''));

  const [alvo, setAlvo] = useState<Faccao | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chave) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('faccoes').select('*').eq('slug', chave).maybeSingle();
      setAlvo((data as Faccao) ?? null);
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
            <span className="hd-path">terrasave://admin/faccoes/editar/{chave}</span>
            <div className="hd-act">
              <Link className="ico" href="/admin/faccoes">← facções</Link>
              {alvo && <Link className="ico" href={`/faccoes/${alvo.slug}`}>ver página</Link>}
            </div>
          </div>
          <h1 data-txt="EDITAR FACÇÃO">EDITAR FACÇÃO</h1>
          <p className="sub">&gt; {loading ? 'carregando...' : alvo?.nome ?? 'não encontrada'} <span className="cur" /></p>
        </header>

        {loading ? (
          <div className="load"><span /><span /><span /><p>acessando registro...</p></div>
        ) : !alvo ? (
          <p className="vazio">
            nenhuma facção responde por &quot;{chave}&quot; —{' '}
            <Link href="/admin/faccoes" style={{ color: 'var(--g)' }}>voltar à lista</Link>
          </p>
        ) : (
          <FaccaoForm inicial={alvo} />
        )}

        <footer className="ft">terrasave_system v1.0 // conexão segura estabelecida</footer>
       </Protegido>
      </main>
    </div>
  );
}
