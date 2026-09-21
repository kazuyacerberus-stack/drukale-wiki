'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import '../../../matrix.css';
import MatrixRain from '../../../components/MatrixRain';
import PrecisaAprovacao from '../../../components/PrecisaAprovacao';
import FichaForm from '../../../components/FichaForm';
import { supabase, type Character } from '../../../lib/db';

/** Edição pública: só o dono do envio (ou o admin) consegue mexer nele. */
export default function EditarPersonagemPublico() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(String(params?.id ?? ''));

  const [alvo, setAlvo] = useState<Character | null>(null);
  const [podeEditar, setPodeEditar] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [{ data: auth }, { data: admin }, { data: personagem }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc('drk_e_admin'),
        supabase.from('characters').select('*').eq('id', id).maybeSingle(),
      ]);
      const c = personagem as Character | null;
      setAlvo(c);
      setPodeEditar(Boolean(c) && (admin === true || c?.user_id === auth.user?.id));
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
            <span className="hd-path">terranova://arquivo/personagens/editar/{id}</span>
            <div className="hd-act">
              <Link className="ico" href="/perfil">← meus envios</Link>
            </div>
          </div>
          <h1 data-txt="EDITAR E REENVIAR">EDITAR E REENVIAR</h1>
          <p className="sub">
            &gt; {loading ? 'carregando...' : alvo?.name ?? 'não encontrado'} <span className="cur" />
          </p>
        </header>

        {loading ? (
          <div className="load"><span /><span /><span /><p>acessando registro...</p></div>
        ) : !alvo || !podeEditar ? (
          <p className="vazio">
            {alvo ? 'esta ficha não é sua para editar' : `nenhum personagem responde por "${id}"`} —{' '}
            <Link href="/perfil" style={{ color: 'var(--g)' }}>voltar aos meus envios</Link>
          </p>
        ) : (
          <>
            {alvo.status_aprovacao === 'reprovado' && alvo.motivo_reprovacao && (
              <p className="erro" style={{ marginBottom: 20 }}>
                Motivo da reprovação: {alvo.motivo_reprovacao}
              </p>
            )}
            <FichaForm inicial={alvo} />
          </>
        )}

        <footer className="ft">terranova_system v1.0 // conexão segura estabelecida</footer>
       </PrecisaAprovacao>
      </main>
    </div>
  );
}
