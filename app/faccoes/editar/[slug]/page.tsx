'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import '../../../matrix.css';
import MatrixRain from '../../../components/MatrixRain';
import PrecisaAprovacao from '../../../components/PrecisaAprovacao';
import FaccaoForm from '../../../components/FaccaoForm';
import { supabase } from '../../../lib/db';
import { type Faccao } from '../../../lib/faccoes';

/** Edição pública: só o dono do envio (ou o admin) consegue mexer nela. */
export default function EditarFaccaoPublica() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(String(params?.slug ?? ''));

  const [alvo, setAlvo] = useState<Faccao | null>(null);
  const [podeEditar, setPodeEditar] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const [{ data: auth }, { data: admin }, { data: faccao }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc('drk_e_admin'),
        supabase.from('faccoes').select('*').eq('slug', slug).maybeSingle(),
      ]);
      const f = faccao as Faccao | null;
      setAlvo(f);
      setPodeEditar(Boolean(f) && (admin === true || f?.user_id === auth.user?.id));
      setLoading(false);
    })();
  }, [slug]);

  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap narrow">
       <PrecisaAprovacao>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">terranova://arquivo/faccoes/editar/{slug}</span>
            <div className="hd-act">
              <Link className="ico" href="/perfil">← meus envios</Link>
            </div>
          </div>
          <h1 data-txt="EDITAR E REENVIAR">EDITAR E REENVIAR</h1>
          <p className="sub">
            &gt; {loading ? 'carregando...' : alvo?.nome ?? 'não encontrada'} <span className="cur" />
          </p>
        </header>

        {loading ? (
          <div className="load"><span /><span /><span /><p>acessando registro...</p></div>
        ) : !alvo || !podeEditar ? (
          <p className="vazio">
            {alvo ? 'esta facção não é sua para editar' : `nenhuma facção responde por "${slug}"`} —{' '}
            <Link href="/perfil" style={{ color: 'var(--g)' }}>voltar aos meus envios</Link>
          </p>
        ) : (
          <>
            {alvo.status_aprovacao === 'reprovado' && alvo.motivo_reprovacao && (
              <p className="erro" style={{ marginBottom: 20 }}>
                Motivo da reprovação: {alvo.motivo_reprovacao}
              </p>
            )}
            <FaccaoForm inicial={alvo} />
          </>
        )}

        <footer className="ft">terranova_system v1.0 // conexão segura estabelecida</footer>
       </PrecisaAprovacao>
      </main>
    </div>
  );
}
