import { supabase } from './db';

/**
 * Edição com aprovação do GM (sql/45 e sql/47): quem não é o GM não
 * altera o que já está publicado — manda uma proposta, e a versão no
 * site só muda quando o GM aprova no painel (/admin).
 */
export type TabelaAlteracao = 'characters' | 'reservas_imagens' | 'faccoes' | 'eventos';

/** É o GM de verdade (conta em drukale_admins)? Qualquer falha conta como "não". */
export async function souGm(): Promise<boolean> {
  const { data, error } = await supabase.rpc('drk_e_gm');
  return !error && data === true;
}

export async function proporAlteracao(tabela: TabelaAlteracao, alvoId: string, dados: Record<string, unknown>) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from('alteracoes_pendentes').insert({
    tabela, alvo_id: alvoId, dados, user_id: auth.user?.id ?? null,
  });
  if (error) {
    if (['42P01', 'PGRST205'].includes(error.code ?? '')) {
      throw new Error('A aprovação de alterações ainda não foi ativada. Aplique o sql/45 e o sql/47 no Supabase.');
    }
    if (error.code === '23514') {
      throw new Error('A aprovação para este tipo de conteúdo ainda não foi ativada. Aplique o sql/47 no Supabase.');
    }
    throw new Error(`Não consegui enviar a alteração: ${error.message}`);
  }
}

/** Tenho alguma alteração minha esperando o GM neste item? (só enxergo as minhas) */
export async function tenhoAlteracaoPendente(tabela: TabelaAlteracao, alvoId: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data } = await supabase.from('alteracoes_pendentes').select('id')
    .eq('tabela', tabela).eq('alvo_id', alvoId).eq('status', 'pendente').eq('user_id', auth.user.id).limit(1);
  return (data ?? []).length > 0;
}
