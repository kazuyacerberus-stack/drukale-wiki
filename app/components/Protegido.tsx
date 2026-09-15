'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/db';

type Estado = 'verificando' | 'dentro' | 'fora' | 'jogador' | 'erro';

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

    let versao = 0;
    const verificar = async (logado: boolean) => {
      const atual = ++versao;
      if (!logado) { if (vivo) setEstado('fora'); return; }
      const { data, error } = await supabase.rpc('drk_e_admin');
      if (vivo && atual === versao) setEstado(error ? 'erro' : data === true ? 'dentro' : 'jogador');
    };
    supabase.auth.getSession().then(({ data }) => { if (vivo) void verificar(Boolean(data.session)); });

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      // Não executa outra chamada Supabase dentro do callback de autenticação.
      window.setTimeout(() => { if (vivo) void verificar(Boolean(sessao)); }, 0);
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

  if (estado === 'erro') return <p className="erro">Não foi possível verificar a permissão. Aplique sql/07-cenas.sql e recarregue a página.</p>;
  if (estado === 'jogador') return <div className="load"><p>Seu acesso permite publicar cenas.</p><a href="/cenas">Ir para o arquivo de cenas →</a></div>;
  return <>{children}</>;
}
