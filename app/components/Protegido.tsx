'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/db';

type Estado = 'verificando' | 'dentro' | 'fora';

/**
 * Envolve as telas do admin. Se não houver sessão, manda para o login.
 *
 * Importante: isto é conveniência de interface, não é a tranca.
 * A tranca de verdade são as regras do banco (sql/03-seguranca.sql):
 * mesmo que alguém burle esta tela, o Supabase recusa a escrita.
 */
export default function Protegido({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>('verificando');
  const router = useRouter();

  useEffect(() => {
    let vivo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (vivo) setEstado(data.session ? 'dentro' : 'fora');
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (vivo) setEstado(sessao ? 'dentro' : 'fora');
    });

    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (estado === 'fora') router.replace('/admin/login');
  }, [estado, router]);

  if (estado === 'verificando') {
    return (
      <div className="load">
        <span /><span /><span />
        <p>verificando credenciais...</p>
      </div>
    );
  }

  if (estado === 'fora') {
    return (
      <div className="load">
        <p>acesso negado — redirecionando...</p>
      </div>
    );
  }

  return <>{children}</>;
}
