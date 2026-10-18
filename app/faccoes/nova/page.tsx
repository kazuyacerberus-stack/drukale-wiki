'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import '../../matrix.css';
import PrecisaAprovacao from '../../components/PrecisaAprovacao';
import FaccaoForm from '../../components/FaccaoForm';
import { supabase } from '../../lib/db';

/**
 * Qualquer pessoa pode propor facção. Quem tem conta segue o caminho de
 * sempre (precisa de conta aprovada e vira líder ao ser aprovada); quem
 * não tem envia sem login e a proposta fica pendente até o GM aprovar
 * (sql/43-faccao-sem-conta.sql).
 */
export default function NovaFaccaoPublica() {
  const [logado, setLogado] = useState<boolean | null>(null);

  useEffect(() => {
    let vivo = true;
    supabase.auth.getSession().then(({ data }) => { if (vivo) setLogado(Boolean(data.session)); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sessao) => { if (vivo) setLogado(Boolean(sessao)); });
    return () => { vivo = false; sub.subscription.unsubscribe(); };
  }, []);

  const cabecalho = (
    <header className="hd">
      <div className="hd-bar">
        <span className="dot" /><span className="dot" /><span className="dot" />
        <span className="hd-path">terrasave://arquivo/faccoes/nova</span>
        <div className="hd-act">
          <Link className="ico" href="/faccoes">← facções</Link>
          {logado
            ? <Link className="ico" href="/perfil">meus envios</Link>
            : <Link className="ico" href="/admin/login">entrar</Link>}
        </div>
      </div>
      <h1 data-txt="PROPOR FACÇÃO">PROPOR FACÇÃO</h1>
      <p className="sub">&gt; a facção entra em análise e só aparece no site depois que o GM aprovar <span className="cur" /></p>
    </header>
  );

  return (
    <div className="term">
      <main className="wrap narrow">
        {logado === null ? (
          <div className="load"><span /><span /><span /><p>abrindo formulário...</p></div>
        ) : logado ? (
          <PrecisaAprovacao>
            {cabecalho}
            <FaccaoForm />
          </PrecisaAprovacao>
        ) : (
          <>
            {cabecalho}
            <FaccaoForm semConta />
          </>
        )}
        <footer className="ft">terrasave_system v1.0 // conexão segura estabelecida</footer>
      </main>
    </div>
  );
}
