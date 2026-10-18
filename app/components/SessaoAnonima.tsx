'use client';

import { useEffect } from 'react';
import { supabase } from '../lib/db';
import { garantirPerfil } from '../lib/perfil';

/**
 * Portas abertas (sql/44-portas-abertas.sql): todo visitante sem login
 * ganha, sem perceber, uma conta invisível ("anônima") neste navegador.
 * É ela que dá identidade às postagens e libera criar/editar sem tela
 * de login. Só acontece na primeira visita: a sessão fica guardada.
 *
 * Exige "Allow anonymous sign-ins" ligado no Supabase. Se estiver
 * desligado, o site continua funcionando só para leitura.
 */
const CHAVE_RECARREGOU = 'drk-sessao-anonima-recarregou';

async function entrarComoVisitante() {
  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn('Sessão de visitante indisponível — ligue "Allow anonymous sign-ins" no Supabase.', error.message);
    return;
  }
  try { await garantirPerfil(); } catch { /* o perfil é criado depois, na primeira tela que precisar */ }
  // as páginas leem a sessão ao abrir; recarrega uma vez para elas já
  // nascerem com a conta nova (sem isto a 1ª tela pediria login)
  try {
    if (window.sessionStorage.getItem(CHAVE_RECARREGOU)) return;
    window.sessionStorage.setItem(CHAVE_RECARREGOU, '1');
  } catch { return; }
  window.location.reload();
}

export default function SessaoAnonima() {
  useEffect(() => {
    let vivo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (vivo && !data.session) void entrarComoVisitante();
    });
    // quem sai da própria conta (ex.: o GM) volta a ser visitante
    const { data: sub } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') window.setTimeout(() => { if (vivo) void entrarComoVisitante(); }, 0);
    });
    return () => { vivo = false; sub.subscription.unsubscribe(); };
  }, []);

  return null;
}
