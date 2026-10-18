import { supabase, caminhoDoStorage, slugify } from './db';

export type Faccao = {
  id: string;
  slug: string;
  nome: string;
  cor: string;
  simbolo: string | null;
  resumo: string | null;
  historia: string | null;
  territorio: string | null;
  user_id: string | null;
  status_aprovacao: 'pendente' | 'aprovado' | 'reprovado';
  motivo_reprovacao: string | null;
  /** nome/apelido de quem propôs sem conta (sql/43-faccao-sem-conta.sql) */
  proposto_por?: string | null;
  created_at: string;
};

export type MembroFaccao = { faccao_id: string; user_id: string; status: 'pendente' | 'aceito'; created_at: string };

export const solicitarFaccao = (alvo_faccao: string) => supabase.rpc('drk_solicitar_faccao', { alvo_faccao });
export const convidarParaFaccao = (alvo_faccao: string, alvo_user: string) => supabase.rpc('drk_convidar_para_faccao', { alvo_faccao, alvo_user });
export const aceitarMembro = (alvo_faccao: string, alvo_user: string) => supabase.rpc('drk_aceitar_membro', { alvo_faccao, alvo_user });
export const recusarMembro = (alvo_faccao: string, alvo_user: string) => supabase.rpc('drk_recusar_membro', { alvo_faccao, alvo_user });
export const sairFaccao = (alvo_faccao: string) => supabase.rpc('drk_sair_faccao', { alvo_faccao });

export const BUCKET_FACCOES = 'faccoes';
export const SIMBOLO_MAX_BYTES = 8 * 1024 * 1024;
export const SIMBOLO_TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const LIMITES_FACCAO = { nome: 80, resumo: 300, historia: 20000, territorio: 2000 };

/**
 * Compara nomes ignorando maiúsculas, acento e espaço nas pontas — é
 * assim que o texto livre do campo "facção" do personagem casa com o
 * nome cadastrado da facção, sem precisar de chave estrangeira nem de
 * migrar dado nenhum.
 */
export function normalizarNome(v: string): string {
  return v.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');
}

export function validarSimbolo(f: Pick<File, 'size' | 'type'>): string | null {
  if (!SIMBOLO_TIPOS.includes(f.type)) return 'Use JPG, PNG, WEBP ou GIF.';
  if (f.size === 0) return 'O arquivo está vazio.';
  if (f.size > SIMBOLO_MAX_BYTES) return `O símbolo tem ${(f.size / 1024 / 1024).toFixed(1)} MB e o limite é 8 MB.`;
  return null;
}

/** Sobe o símbolo direto do navegador para o Storage e devolve o endereço público. */
export async function subirSimbolo(file: File, base: string, pasta?: 'propostas'): Promise<string> {
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const nome = `${Date.now()}-${slugify(base, 'faccao')}.${ext}`;
  const caminho = pasta ? `${pasta}/${nome}` : nome;
  const { error } = await supabase.storage.from(BUCKET_FACCOES).upload(caminho, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error(`Não consegui enviar o símbolo: ${error.message}`);
  return supabase.storage.from(BUCKET_FACCOES).getPublicUrl(caminho).data.publicUrl;
}

/** Remove um símbolo do Storage. Silencioso: é faxina, não trava a tela. */
export async function apagarSimbolo(url: string | null) {
  const caminho = caminhoDoStorage(url, BUCKET_FACCOES);
  if (!caminho) return;
  await supabase.storage.from(BUCKET_FACCOES).remove([caminho]);
}

/** Garante endereço único: se "casa-drukale" já existe, vira "casa-drukale-2". */
export async function slugLivre(base: string, ignorar?: string | null): Promise<string> {
  const { data } = await supabase.from('faccoes').select('slug').like('slug', `${base}%`);
  const usados = new Set(
    (data ?? [])
      .map((r: { slug: string }) => r.slug)
      .filter((s): s is string => !!s && s !== ignorar)
  );
  if (!usados.has(base)) return base;
  for (let i = 2; i < 500; i++) {
    if (!usados.has(`${base}-${i}`)) return `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

/**
 * Proposta de quem não tem conta: passa pela função do banco, que força
 * "pendente", sem dono, e devolve o endereço reservado. Ver
 * sql/43-faccao-sem-conta.sql.
 */
export async function proporFaccaoSemConta(c: {
  nome: string; slug: string; cor: string; resumo: string | null; historia: string | null;
  territorio: string | null; simbolo: string | null; propostoPor: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('drk_propor_faccao', {
    p_nome: c.nome, p_slug: c.slug, p_cor: c.cor, p_resumo: c.resumo, p_historia: c.historia,
    p_territorio: c.territorio, p_simbolo: c.simbolo, p_proposto_por: c.propostoPor,
  });
  if (error) throw error;
  return data as string;
}

export function mensagemFaccao(erro: unknown): string {
  const e = erro as { message?: string; code?: string };
  if (['42P01', 'PGRST205'].includes(e?.code ?? '')) return 'As facções ainda precisam ser configuradas no Supabase. Aplique o arquivo sql/10-faccoes.sql.';
  if (['42883', 'PGRST202'].includes(e?.code ?? '')) return 'O envio sem conta ainda precisa ser ativado no Supabase. Aplique o arquivo sql/43-faccao-sem-conta.sql.';
  if (e?.code === 'P0001' && e.message) return e.message;
  if (e?.code === '42501') return 'Sua sessão não tem permissão para isto. Entre novamente como administrador.';
  if (e?.code === '23505') return 'Já existe uma facção com esse endereço.';
  if (/fetch|network/i.test(e?.message ?? '')) return 'Não foi possível conectar. Tente novamente.';
  return e?.message || 'Não foi possível concluir. Tente novamente.';
}
