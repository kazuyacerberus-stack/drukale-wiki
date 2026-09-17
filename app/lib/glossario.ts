import { supabase, caminhoDoStorage, slugify } from './db';

export const CATEGORIAS_GLOSSARIO = ['Raça', 'Magia', 'Tecnologia', 'Organização', 'Lugar', 'Objeto', 'Outro'] as const;
export type CategoriaGlossario = typeof CATEGORIAS_GLOSSARIO[number];

export type Termo = {
  id: string;
  slug: string;
  termo: string;
  categoria: string;
  resumo: string | null;
  definicao: string | null;
  imagem: string | null;
  created_at: string;
};

export const LIMITES_GLOSSARIO = { termo: 80, resumo: 300, definicao: 20000 };

export const BUCKET_GLOSSARIO = 'glossario';
export const IMAGEM_GLOSSARIO_MAX_BYTES = 8 * 1024 * 1024;
export const IMAGEM_GLOSSARIO_TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validarImagemGlossario(f: Pick<File, 'size' | 'type'>): string | null {
  if (!IMAGEM_GLOSSARIO_TIPOS.includes(f.type)) return 'Use JPG, PNG, WEBP ou GIF.';
  if (f.size === 0) return 'O arquivo está vazio.';
  if (f.size > IMAGEM_GLOSSARIO_MAX_BYTES) return `A imagem tem ${(f.size / 1024 / 1024).toFixed(1)} MB e o limite é 8 MB.`;
  return null;
}

/** Sobe a imagem direto do navegador para o Storage e devolve o endereço público. */
export async function subirImagemGlossario(file: File, base: string): Promise<string> {
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const caminho = `${Date.now()}-${slugify(base, 'termo')}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET_GLOSSARIO).upload(caminho, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error(`Não consegui enviar a imagem: ${error.message}`);
  return supabase.storage.from(BUCKET_GLOSSARIO).getPublicUrl(caminho).data.publicUrl;
}

/** Remove uma imagem do Storage. Silencioso: é faxina, não trava a tela. */
export async function apagarImagemGlossario(url: string | null) {
  const caminho = caminhoDoStorage(url, BUCKET_GLOSSARIO);
  if (!caminho) return;
  await supabase.storage.from(BUCKET_GLOSSARIO).remove([caminho]);
}

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
