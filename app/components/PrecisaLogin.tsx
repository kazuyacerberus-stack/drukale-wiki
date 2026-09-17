'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/db';

type Estado = 'verificando' | 'dentro' | 'fora';

/**
 * Envolve telas que qualquer conta logada pode usar — diferente de
 * `Protegido`, que exige `drk_e_admin()`. Aqui só verifica se existe
 * sessão. A tranca de verdade continua sendo as políticas do banco:
 * mesmo que alguém burle esta tela, o Supabase decide o que pode ou
 * não ser gravado.
 */
export default function PrecisaLogin({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>('verificando');
  const router = useRouter();

  useEffect(() => {
    let vivo = true;
    const verificar = (logado: boolean) => { if (vivo) setEstado(logado ? 'dentro' : 'fora'); };
    supabase.auth.getSession().then(({ data }) => verificar(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      window.setTimeout(() => verificar(Boolean(sessao)), 0);
    });
    return () => { vivo = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (estado === 'fora') router.replace('/admin/login');
  }, [estado, router]);

  if (estado === 'verificando') {
    return <div className="load"><span /><span /><span /><p>verificando sessão...</p></div>;
  }
  if (estado === 'fora') {
    return <div className="load"><p>é preciso entrar — redirecionando...</p></div>;
  }
  return <>{children}</>;
}
