'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import '../../../matrix.css';
import MatrixRain from '../../../components/MatrixRain';
import PrecisaAprovacao from '../../../components/PrecisaAprovacao';
import EventoForm from '../../../components/EventoForm';
import { supabase } from '../../../lib/db';
import { type Evento } from '../../../lib/eventos';

/** Edição pública: só o dono do envio (ou o admin) consegue mexer nele. */
export default function EditarCronicaPublica() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(String(params?.id ?? ''));

  const [alvo, setAlvo] = useState<Evento | null>(null);
  const [podeEditar, setPodeEditar] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [{ data: auth }, { data: admin }, { data: evento }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc('drk_e_admin'),
        supabase.from('eventos').select('*').eq('id', id).maybeSingle(),
      ]);
      const e = evento as Evento | null;
      setAlvo(e);
      setPodeEditar(Boolean(e) && (admin === true || e?.user_id === auth.user?.id));
      setLoading(false);
    })();
  }, [id]);

  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap narrow">
       <PrecisaAprovacao>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">terranova://arquivo/cronicas/editar/{id}</span>
            <div className="hd-act">
              <Link className="ico" href="/perfil">← meus envios</Link>
            </div>
          </div>
          <h1 data-txt="EDITAR E REENVIAR">EDITAR E REENVIAR</h1>
          <p className="sub">
            &gt; {loading ? 'carregando...' : alvo?.titulo ?? 'não encontrado'} <span className="cur" />
          </p>
        </header>

        {loading ? (
          <div className="load"><span /><span /><span /><p>acessando registro...</p></div>
        ) : !alvo || !podeEditar ? (
          <p className="vazio">
            {alvo ? 'esta crônica não é sua para editar' : `nenhuma crônica responde por "${id}"`} —{' '}
            <Link href="/perfil" style={{ color: 'var(--g)' }}>voltar aos meus envios</Link>
          </p>
        ) : (
          <>
            {alvo.status_aprovacao === 'reprovado' && alvo.motivo_reprovacao && (
              <p className="erro" style={{ marginBottom: 20 }}>
                Motivo da reprovação: {alvo.motivo_reprovacao}
              </p>
            )}
            <EventoForm inicial={alvo} />
          </>
        )}

        <footer className="ft">terranova_system v1.0 // conexão segura estabelecida</footer>
       </PrecisaAprovacao>
      </main>
    </div>
  );
}
