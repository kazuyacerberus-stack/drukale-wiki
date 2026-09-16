export type Evento = {
  id: string;
  titulo: string;
  data: string | null;
  resumo: string | null;
  descricao: string | null;
  ordem: number;
  created_at: string;
};

export const LIMITES_EVENTO = { titulo: 120, resumo: 300, descricao: 20000 };

/** Onde um evento novo cai por padrão: no fim da linha do tempo. */
export function proximaOrdem(lista: Pick<Evento, 'ordem'>[]): number {
  if (lista.length === 0) return 1;
  return Math.max(...lista.map((e) => e.ordem)) + 1;
}

export function mensagemEvento(erro: unknown): string {
  const e = erro as { message?: string; code?: string };
  if (['42P01', 'PGRST205'].includes(e?.code ?? '')) return 'A linha do tempo ainda precisa ser configurada no Supabase. Aplique o arquivo sql/11-eventos.sql.';
  if (e?.code === '42501') return 'Sua sessão não tem permissão para isto. Entre novamente como administrador.';
  if (/fetch|network/i.test(e?.message ?? '')) return 'Não foi possível conectar. Tente novamente.';
  return e?.message || 'Não foi possível concluir. Tente novamente.';
}
