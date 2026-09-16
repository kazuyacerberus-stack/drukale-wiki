import { supabase } from './db';

export const CATEGORIAS_GLOSSARIO = ['Raça', 'Magia', 'Tecnologia', 'Organização', 'Lugar', 'Objeto', 'Outro'] as const;
export type CategoriaGlossario = typeof CATEGORIAS_GLOSSARIO[number];

export type Termo = {
  id: string;
  slug: string;
  termo: string;
  categoria: string;
  resumo: string | null;
  definicao: string | null;
  created_at: string;
};

export const LIMITES_GLOSSARIO = { termo: 80, resumo: 300, definicao: 20000 };

/** Garante endereço único: se "magia-de-sangue" já existe, vira "magia-de-sangue-2". */
export async function slugLivre(base: string, ignorar?: string | null): Promise<string> {
  const { data } = await supabase.from('glossario').select('slug').like('slug', `${base}%`);
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

export function mensagemGlossario(erro: unknown): string {
  const e = erro as { message?: string; code?: string };
  if (['42P01', 'PGRST205'].includes(e?.code ?? '')) return 'O glossário ainda precisa ser configurado no Supabase. Aplique o arquivo sql/12-glossario.sql.';
  if (e?.code === '42501') return 'Sua sessão não tem permissão para isto. Entre novamente como administrador.';
  if (e?.code === '23505') return 'Já existe um termo com esse endereço.';
  if (/fetch|network/i.test(e?.message ?? '')) return 'Não foi possível conectar. Tente novamente.';
  return e?.message || 'Não foi possível concluir. Tente novamente.';
}
