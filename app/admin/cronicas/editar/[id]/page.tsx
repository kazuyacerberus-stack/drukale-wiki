'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import '../../../../matrix.css';
import Protegido from '../../../../components/Protegido';
import EventoForm from '../../../../components/EventoForm';
import { supabase } from '../../../../lib/db';
import { type Evento } from '../../../../lib/eventos';

export default function EditarCronica() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(String(params?.id ?? ''));

  const [alvo, setAlvo] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('eventos').select('*').eq('id', id).maybeSingle();
      setAlvo((data as Evento) ?? null);
      setLoading(false);
    })();
  }, [id]);

  return (
    <div className="term">

      <main className="wrap narrow">
       <Protegido>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">terrasave://admin/cronicas/editar</span>
            <div className="hd-act">
              <Link className="ico" href="/admin/cronicas">← crônicas</Link>
            </div>
          </div>
          <h1 data-txt="EDITAR CRÔNICA">EDITAR CRÔNICA</h1>
          <p className="sub">&gt; {loading ? 'carregando...' : alvo?.titulo ?? 'não encontrado'} <span className="cur" /></p>
        </header>

        {loading ? (
          <div className="load"><span /><span /><span /><p>acessando registro...</p></div>
        ) : !alvo ? (
          <p className="vazio">
            nenhuma crônica encontrada —{' '}
            <Link href="/admin/cronicas" style={{ color: 'var(--g)' }}>voltar à lista</Link>
          </p>
        ) : (
          <EventoForm inicial={alvo} />
        )}

        <footer className="ft">terrasave_system v1.0 // conexão segura estabelecida</footer>
       </Protegido>
      </main>
    </div>
  );
}
