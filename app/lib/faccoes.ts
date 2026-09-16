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
  created_at: string;
};

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
export async function subirSimbolo(file: File, base: string): Promise<string> {
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const caminho = `${Date.now()}-${slugify(base, 'faccao')}.${ext}`;
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

export function mensagemFaccao(erro: unknown): string {
  const e = erro as { message?: string; code?: string };
  if (['42P01', 'PGRST205'].includes(e?.code ?? '')) return 'As facções ainda precisam ser configuradas no Supabase. Aplique o arquivo sql/10-faccoes.sql.';
  if (e?.code === '42501') return 'Sua sessão não tem permissão para isto. Entre novamente como administrador.';
  if (e?.code === '23505') return 'Já existe uma facção com esse endereço.';
  if (/fetch|network/i.test(e?.message ?? '')) return 'Não foi possível conectar. Tente novamente.';
  return e?.message || 'Não foi possível concluir. Tente novamente.';
}
