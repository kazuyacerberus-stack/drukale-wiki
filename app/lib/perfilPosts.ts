import { supabase, traduzErroSupabase } from './db';
import type { AnexoComentario } from './comentarios';
import type { Musica } from './musica';

export type Visibilidade = 'publico' | 'amigos' | 'privado' | 'personalizado';
export const ROTULO_VISIBILIDADE: Record<Visibilidade, string> = {
  publico: 'qualquer jogador', amigos: 'só amigos', privado: 'só eu', personalizado: 'pessoas específicas',
};
export const ICONE_VISIBILIDADE: Record<Visibilidade, string> = { publico: '🌐', amigos: '👥', privado: '🔒', personalizado: '✎' };

export type PerfilPost = {
  id: string;
  user_id: string;
  texto: string | null;
  anexo: AnexoComentario | null;
  musica: Musica | null;
  visibilidade: Visibilidade;
  created_at: string;
  total_comentarios: number;
  reacoes: Record<string, number>;
  minha_reacao: string | null;
};

export type AtividadeCena = { cena_id: string; titulo: string; created_at: string; papel: 'autor' | 'comentou' };

export const BUCKET_PERFIL_POSTS = 'perfil_posts';

/** Busca os posts do perfil de "alvo" que a conta logada tem permissão de ver, já com comentários/reações agregados. */
export async function buscarPostsPerfil(alvo: string): Promise<PerfilPost[]> {
  const { data, error } = await supabase.rpc('drk_buscar_posts_perfil', { alvo });
  if (error) throw error;
  return (data ?? []) as PerfilPost[];
}

/** Feed público da Linha do Tempo, paginado (21 por página, mesmo padrão de Cenas). */
export async function buscarFeedPublico(offset = 0): Promise<PerfilPost[]> {
  const { data, error } = await supabase.rpc('drk_buscar_feed_publico', { p_offset: offset });
  if (error) throw error;
  return (data ?? []) as PerfilPost[];
}

export async function buscarAtividadePerfil(alvo: string): Promise<AtividadeCena[]> {
  const { data, error } = await supabase.rpc('drk_atividade_perfil', { alvo });
  if (error) throw error;
  return (data ?? []) as AtividadeCena[];
}

export async function publicarPost(
  texto: string, anexo: AnexoComentario | null, musica: Musica | null, visibilidade: Visibilidade, audiencia: string[],
): Promise<PerfilPost> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Entre novamente para postar.');
  const { data: novo, error } = await supabase
    .from('perfil_posts')
    .insert({ user_id: auth.user.id, texto: texto.trim() || null, anexo, musica, visibilidade })
    .select()
    .single();
  if (error) throw error;
  const post = { ...(novo as Omit<PerfilPost, 'total_comentarios' | 'reacoes' | 'minha_reacao'>), total_comentarios: 0, reacoes: {}, minha_reacao: null };
  if (visibilidade === 'personalizado' && audiencia.length) {
    await supabase.from('perfil_post_audiencia').insert(audiencia.map((user_id) => ({ post_id: post.id, user_id })));
  }
  return post;
}

export function mensagemPerfilPost(erro: unknown): string {
  return traduzErroSupabase(erro, () => null, 'sql/27-perfil-timeline.sql e sql/32-posts-comentarios-reacoes-musica.sql');
}
