import { supabase, traduzErroSupabase } from './db';

/** Upload próprio (imagem/vídeo) ou GIF/figurinha do Giphy (url externa). */
export type AnexoComentario =
  | { tipo: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'video/mp4' | 'video/webm'; caminho: string; nome: string }
  | { tipo: 'gif' | 'figurinha'; url: string; nome: string };

export type Comentario = {
  id: string;
  cena_id: string;
  parent_id: string | null;
  user_id: string;
  texto: string | null;
  anexo: AnexoComentario | null;
  created_at: string;
};

export const REACOES = ['curtir', 'amei', 'bombastico', 'nao_gostei'] as const;
export type Reacao = typeof REACOES[number];
export const ICONE_REACAO: Record<Reacao, string> = { curtir: '⭐', amei: '❤️', bombastico: '💣', nao_gostei: '👎' };
export const ROTULO_REACAO: Record<Reacao, string> = { curtir: 'curtir', amei: 'amei', bombastico: 'bombástico', nao_gostei: 'não gostei' };

export const BUCKET_COMENTARIOS = 'cena_comentarios';
export const MAX_BYTES_ANEXO_COMENTARIO = 40 * 1024 * 1024;
export const MIMES_ANEXO_COMENTARIO = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];

export function validarAnexoComentario(f: Pick<File, 'size' | 'type'>): string | null {
  if (!MIMES_ANEXO_COMENTARIO.includes(f.type)) return 'Use JPG, PNG, WebP, GIF, MP4 ou WebM.';
  if (f.size === 0) return 'O arquivo está vazio.';
  if (f.size > MAX_BYTES_ANEXO_COMENTARIO) return `O arquivo tem ${(f.size / 1024 / 1024).toFixed(1)} MB e o limite é 40 MB.`;
  return null;
}

/** Sobe o anexo pra pasta da própria conta — mesmo isolamento de cenas/novidades. */
export async function subirAnexoComentario(file: File, uid: string): Promise<AnexoComentario> {
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const caminho = `${uid}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET_COMENTARIOS).upload(caminho, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error(`Não consegui enviar o anexo: ${error.message}`);
  return { caminho, nome: file.name.slice(0, 240), tipo: file.type as Extract<AnexoComentario, { caminho: string }>['tipo'] };
}

export function urlAnexoComentario(anexo: AnexoComentario): string {
  if ('url' in anexo) return anexo.url;
  return supabase.storage.from(BUCKET_COMENTARIOS).getPublicUrl(anexo.caminho).data.publicUrl;
}

/** Remove o anexo do Storage quando é upload próprio; GIF/figurinha não tem o que apagar. */
export async function apagarAnexoComentario(anexo: AnexoComentario | null) {
  if (!anexo || 'url' in anexo) return;
  await supabase.storage.from(BUCKET_COMENTARIOS).remove([anexo.caminho]);
}

export type ComentarioComRespostas = Comentario & { respostas: ComentarioComRespostas[] };

/** Monta a árvore comentário → respostas a partir da lista plana vinda do banco. */
export function montarArvoreComentarios(lista: Comentario[]): ComentarioComRespostas[] {
  const porId = new Map<string, ComentarioComRespostas>(lista.map((c) => [c.id, { ...c, respostas: [] }]));
  const raizes: ComentarioComRespostas[] = [];
  for (const c of lista) {
    const no = porId.get(c.id)!;
    if (c.parent_id && porId.has(c.parent_id)) porId.get(c.parent_id)!.respostas.push(no);
    else raizes.push(no);
  }
  return raizes;
}

export function mensagemComentario(erro: unknown): string {
  return traduzErroSupabase(erro, () => null, 'sql/25-comentarios-e-reacoes.sql');
}
