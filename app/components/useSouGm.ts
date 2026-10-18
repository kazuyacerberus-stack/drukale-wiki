'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/db';

/**
 * true só para o GM real (conta em drukale_admins). Com as portas abertas
 * (sql/44) todo visitante passa em drk_e_admin, então botões e links de
 * GM usam esta checagem para ficarem ocultos de quem não é o GM.
 */
export function useSouGm(): boolean {
  const [gm, setGm] = useState(false);
  useEffect(() => {
    let vivo = true;
    const verificar = () => {
      supabase.rpc('drk_e_gm').then(({ data, error }) => { if (vivo) setGm(!error && data === true); });
    };
    verificar();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { window.setTimeout(verificar, 0); });
    return () => { vivo = false; sub.subscription.unsubscribe(); };
  }, []);
  return gm;
}
