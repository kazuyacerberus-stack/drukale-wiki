import { supabase, traduzErroSupabase } from './db';

export type Regra = {
  id: string;
  doc: string;
  doc_ordem: number;
  ordem: number;
  titulo: string;
  conteudo: string;
  updated_at: string;
  updated_by: string | null;
};

export type ComentarioRegra = {
  id: string;
  regra_id: string;
  user_id: string;
  texto: string;
  created_at: string;
};

export const BUCKET_REGRAS = 'regras';
export const MAX_BYTES_MIDIA_REGRA = 40 * 1024 * 1024;
export const MIMES_MIDIA_REGRA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
export const LIMITE_COMENTARIO_REGRA = 2000;

export function validarMidiaRegra(f: Pick<File, 'size' | 'type'>): string | null {
  if (!MIMES_MIDIA_REGRA.includes(f.type)) return 'Use JPG, PNG, WebP, GIF, MP4 ou WebM.';
  if (f.size === 0) return 'O arquivo está vazio.';
  if (f.size > MAX_BYTES_MIDIA_REGRA) return `O arquivo tem ${(f.size / 1024 / 1024).toFixed(1)} MB e o limite é 40 MB.`;
  return null;
}

/** Sobe a mídia pro bucket público das regras (só administrador) e devolve o endereço e o tipo. */
export async function subirMidiaRegra(file: File): Promise<{ url: string; video: boolean; nome: string }> {
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const caminho = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET_REGRAS).upload(caminho, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error(`Não consegui enviar o arquivo: ${error.message}`);
  return {
    url: supabase.storage.from(BUCKET_REGRAS).getPublicUrl(caminho).data.publicUrl,
    video: file.type.startsWith('video/'),
    nome: file.name.replace(/\.[^.]+$/, '').slice(0, 80),
  };
}

/** Compara sem acento nem maiúscula — é assim que o filtro da lateral procura. */
export function normalizarBusca(v: string): string {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');
}

export function mensagemRegra(erro: unknown): string {
  return traduzErroSupabase(erro, () => null, 'sql/33-regras.sql');
}
