import { supabase, traduzErroSupabase } from './db';

export type AnexoNovidade = { caminho: string; nome: string; tipo: string };

export type Novidade = {
  id: string;
  user_id: string;
  titulo: string;
  texto: string;
  quando: string | null;
  anexo: AnexoNovidade | null;
  created_at: string;
};

export const LIMITES_NOVIDADE = { titulo: 160, texto: 20000 };

export const BUCKET_NOVIDADES = 'novidades';
export const MAX_BYTES_ANEXO_NOVIDADE = 40 * 1024 * 1024;
export const MIMES_ANEXO_NOVIDADE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];

export function validarAnexoNovidade(f: Pick<File, 'size' | 'type'>): string | null {
  if (!MIMES_ANEXO_NOVIDADE.includes(f.type)) return 'Use JPG, PNG, WebP, GIF, MP4 ou WebM.';
  if (f.size === 0) return 'O arquivo está vazio.';
  if (f.size > MAX_BYTES_ANEXO_NOVIDADE) return `O arquivo tem ${(f.size / 1024 / 1024).toFixed(1)} MB e o limite é 40 MB.`;
  return null;
}

/** Sobe o anexo para a pasta da própria conta — mesmo isolamento de cenas/avatares. */
export async function subirAnexoNovidade(file: File, uid: string): Promise<AnexoNovidade> {
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const caminho = `${uid}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET_NOVIDADES).upload(caminho, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error(`Não consegui enviar o anexo: ${error.message}`);
  return { caminho, nome: file.name.slice(0, 240), tipo: file.type };
}

export function urlAnexoNovidade(caminho: string) {
  return supabase.storage.from(BUCKET_NOVIDADES).getPublicUrl(caminho).data.publicUrl;
}

/** Remove um anexo do Storage. Silencioso: é faxina, não trava a tela. */
export async function apagarAnexoNovidade(anexo: AnexoNovidade | null) {
  if (!anexo) return;
  await supabase.storage.from(BUCKET_NOVIDADES).remove([anexo.caminho]);
}

export function mensagemNovidade(erro: unknown): string {
  return traduzErroSupabase(erro, () => null, 'sql/21-novidades.sql');
}
