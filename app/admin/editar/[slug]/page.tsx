'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import '../../../matrix.css';
import MatrixRain from '../../../components/MatrixRain';
import Protegido from '../../../components/Protegido';
import FichaForm from '../../../components/FichaForm';
import { supabase, type Character } from '../../../lib/db';

export default function EditarRegistro() {
  const params = useParams<{ slug: string }>();
  const chave = decodeURIComponent(String(params?.slug ?? ''));

  const [alvo, setAlvo] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chave) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('characters').select('*');
      const todos = (data ?? []) as Character[];
      setAlvo(todos.find((c) => c.slug === chave || String(c.id) === chave) ?? null);
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
            <span className="hd-path">drukale://admin/editar/{chave}</span>
            <div className="hd-act">
              <Link className="ico" href="/admin">← painel</Link>
              {alvo && (
                <Link className="ico" href={`/personagem/${alvo.slug || alvo.id}`}>ver página</Link>
              )}
            </div>
          </div>
          <h1 data-txt="EDITAR REGISTRO">EDITAR REGISTRO</h1>
          <p className="sub">
            &gt; {loading ? 'carregando...' : alvo?.name ?? 'não encontrado'} <span className="cur" />
          </p>
        </header>

        {loading ? (
          <div className="load">
            <span /><span /><span />
            <p>acessando registro...</p>
          </div>
        ) : !alvo ? (
          <p className="vazio">
            nenhum personagem responde por &quot;{chave}&quot; —{' '}
            <Link href="/admin" style={{ color: 'var(--g)' }}>voltar ao painel</Link>
          </p>
        ) : (
          <FichaForm inicial={alvo} />
        )}

        <footer className="ft">drukale_system v1.0 // conexão segura estabelecida</footer>
       </Protegido>
      </main>
    </div>
  );
}
