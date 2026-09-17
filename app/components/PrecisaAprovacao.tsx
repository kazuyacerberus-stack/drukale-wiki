'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/db';

type Estado = 'verificando' | 'dentro' | 'fora' | 'pendente' | 'reprovado' | 'erro';

/**
 * Envolve as telas que exigem conta aprovada pelo administrador — a
 * maior parte do site, desde que o cadastro deixou de liberar acesso na
 * hora (sql/22-conta-aprovacao-e-acesso.sql). Diferente de `PrecisaLogin`
 * (só exige sessão) e de `Protegido` (só admin): aqui uma sessão válida
 * não basta, a conta também precisa estar com status_conta = 'aprovado'
 * — admin sempre passa, independente do próprio status.
 *
 * Importante: isto é conveniência de interface, não é a tranca. A tranca
 * de verdade é a RLS (sql/22-conta-aprovacao-e-acesso.sql): mesmo que
 * alguém burle esta tela, o Supabase não devolve nenhuma linha.
 */
export default function PrecisaAprovacao({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>('verificando');
  const [motivo, setMotivo] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let vivo = true;
    let versao = 0;

    const verificar = async (logado: boolean) => {
      const atual = ++versao;
      if (!logado) { if (vivo) setEstado('fora'); return; }

      const { data: admin, error: erroAdmin } = await supabase.rpc('drk_e_admin');
      if (!vivo || atual !== versao) return;
      if (erroAdmin) { setEstado('erro'); return; }
      if (admin === true) { setEstado('dentro'); return; }

      const { data: auth } = await supabase.auth.getUser();
      const { data: perfil, error: erroPerfil } = await supabase
        .from('profiles')
        .select('status_conta,motivo_reprovacao')
        .eq('user_id', auth.user?.id ?? '')
        .maybeSingle();
      if (!vivo || atual !== versao) return;
      if (erroPerfil) { setEstado('erro'); return; }

      const status = perfil?.status_conta ?? 'pendente';
      setMotivo(perfil?.motivo_reprovacao ?? null);
      setEstado(status === 'aprovado' ? 'dentro' : status === 'reprovado' ? 'reprovado' : 'pendente');
    };

    supabase.auth.getSession().then(({ data }) => { if (vivo) void verificar(Boolean(data.session)); });

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, sessao) => {
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

  if (estado === 'verificando' || estado === 'fora') {
    return (
      <div className="load">
        <span /><span /><span />
        <p>{estado === 'fora' ? 'é preciso entrar — redirecionando...' : 'verificando credenciais...'}</p>
      </div>
    );
  }

  if (estado === 'erro') {
    return <p className="erro">Não foi possível verificar sua conta. Aplique sql/22-conta-aprovacao-e-acesso.sql e recarregue a página.</p>;
  }

  if (estado === 'pendente') {
    return (
      <div className="load">
        <p>Sua conta está aguardando aprovação do game master.</p>
        <p>Volte mais tarde ou fale com o administrador do grupo.</p>
      </div>
    );
  }

  if (estado === 'reprovado') {
    return (
      <div className="load">
        <p>Seu cadastro não foi aprovado.</p>
        {motivo && <p className="dica">motivo: {motivo}</p>}
      </div>
    );
  }

  return <>{children}</>;
}
