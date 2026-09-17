import { supabase, traduzErroSupabase } from './db';

export type Amizade = { solicitante: string; destinatario: string; status: 'pendente' | 'aceita'; created_at: string };

/** Estado da relação entre "eu" e outra conta, do ponto de vista de quem está olhando. */
export type EstadoAmizade = 'nenhum' | 'amigos' | 'pedido_enviado' | 'pedido_recebido';

export function estadoAmizade(minhasLinhas: Amizade[], eu: string, outro: string): EstadoAmizade {
  const comoEu = minhasLinhas.find((a) => a.solicitante === eu && a.destinatario === outro);
  if (comoEu?.status === 'aceita') return 'amigos';
  if (comoEu?.status === 'pendente') return 'pedido_enviado';
  const doOutro = minhasLinhas.find((a) => a.solicitante === outro && a.destinatario === eu);
  if (doOutro?.status === 'pendente') return 'pedido_recebido';
  return 'nenhum';
}

/** Todas as linhas de amizade onde a conta logada aparece — dá pra montar amigos, pedidos enviados e recebidos localmente. */
export async function buscarMinhasAmizades(): Promise<Amizade[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase.from('amizades').select('*').or(`solicitante.eq.${auth.user.id},destinatario.eq.${auth.user.id}`);
  if (error) throw error;
  return (data ?? []) as Amizade[];
}

export const pedirAmizade = (alvo: string) => supabase.rpc('drk_pedir_amizade', { alvo });
export const aceitarAmizade = (de: string) => supabase.rpc('drk_aceitar_amizade', { de });
export const recusarAmizade = (de: string) => supabase.rpc('drk_recusar_amizade', { de });
export const desfazerAmizade = (de: string) => supabase.rpc('drk_desfazer_amizade', { de });

export function mensagemAmizade(erro: unknown): string {
  return traduzErroSupabase(erro, () => null, 'sql/26-amizades.sql');
}
