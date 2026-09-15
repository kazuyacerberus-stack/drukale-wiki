import { supabase } from './db';

export const TIPOS_CENA = ['Cena aberta', 'Cena fechada', 'Cena de desenvolvimento'] as const;
export type TipoCena = typeof TIPOS_CENA[number];
export type AnexoCena = { caminho: string; nome: string; tipo: string };
export type Cena = { id: string; user_id: string; tipo: TipoCena; titulo: string; local: string; texto: string; autor: string; personagem: string; anexos: AnexoCena[]; created_at: string };
export const BUCKET_CENAS = 'cenas';
export const MAX_BYTES_CENA = 40 * 1024 * 1024;
export const MIMES_CENA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
export const normalizarCena = (v: string) => v.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');

export function validarAnexoCena(f: Pick<File, 'size' | 'type'>): string | null {
  if (!MIMES_CENA.includes(f.type)) return 'Use JPG, PNG, WebP, GIF, MP4 ou WebM.';
  if (f.size === 0) return 'O arquivo está vazio.';
  if (f.size > MAX_BYTES_CENA) return 'Cada arquivo pode ter até 40 MB.';
  return null;
}

export function urlAnexoCena(caminho: string) {
  return supabase.storage.from(BUCKET_CENAS).getPublicUrl(caminho).data.publicUrl;
}

export function mensagemCena(erro: unknown): string {
  const e = erro as { message?: string; code?: string };
  if (['42P01', 'PGRST205', '42883', 'PGRST202'].includes(e?.code ?? '')) return 'A aba ainda precisa ser configurada no Supabase. Aplique o arquivo sql/08-cenas.sql.';
  if (e?.code === '42501') return 'Sua sessão não tem permissão. Entre novamente ou fale com o administrador.';
  if (/fetch|network/i.test(e?.message ?? '')) return 'Não foi possível conectar. Seu texto continua no editor; tente novamente.';
  return e?.message || 'Não foi possível concluir. Tente novamente.';
}
