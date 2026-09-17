import { supabase, slugify } from './db';

export type AnexoEvento = { caminho: string; nome: string; tipo: string };

export type Evento = {
  id: string;
  titulo: string;
  data: string | null;
  resumo: string | null;
  descricao: string | null;
  ordem: number;
  anexo: AnexoEvento | null;
  user_id: string | null;
  status_aprovacao: 'pendente' | 'aprovado' | 'reprovado';
  motivo_reprovacao: string | null;
  created_at: string;
};

export const LIMITES_EVENTO = { titulo: 120, resumo: 300, descricao: 20000 };

export const BUCKET_EVENTOS = 'eventos';
export const MAX_BYTES_ANEXO_EVENTO = 40 * 1024 * 1024;
export const MIMES_ANEXO_EVENTO = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];

export function validarAnexoEvento(f: Pick<File, 'size' | 'type'>): string | null {
  if (!MIMES_ANEXO_EVENTO.includes(f.type)) return 'Use JPG, PNG, WebP, GIF, MP4 ou WebM.';
  if (f.size === 0) return 'O arquivo está vazio.';
  if (f.size > MAX_BYTES_ANEXO_EVENTO) return `O arquivo tem ${(f.size / 1024 / 1024).toFixed(1)} MB e o limite é 40 MB.`;
  return null;
}

/** Sobe o anexo direto do navegador para o Storage e devolve caminho + nome. */
export async function subirAnexoEvento(file: File, base: string): Promise<AnexoEvento> {
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const caminho = `${Date.now()}-${slugify(base, 'evento')}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET_EVENTOS).upload(caminho, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error(`Não consegui enviar o anexo: ${error.message}`);
  return { caminho, nome: file.name.slice(0, 240), tipo: file.type };
}

export function urlAnexoEvento(caminho: string) {
  return supabase.storage.from(BUCKET_EVENTOS).getPublicUrl(caminho).data.publicUrl;
}

/** Remove um anexo do Storage. Silencioso: é faxina, não trava a tela. */
export async function apagarAnexoEvento(anexo: AnexoEvento | null) {
  if (!anexo) return;
  await supabase.storage.from(BUCKET_EVENTOS).remove([anexo.caminho]);
}

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
