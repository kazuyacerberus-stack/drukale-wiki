import { supabase, traduzErroSupabase } from './db';

export type AnexoChat =
  | { tipo: 'imagem' | 'video'; caminho: string; nome: string }
  | { tipo: 'figurinha' | 'gif'; url: string; nome: string };

export type Mensagem = { id: string; user_id: string; texto: string | null; anexo: AnexoChat | null; created_at: string };

export const BUCKET_CHAT = 'chat';
export const MAX_BYTES_CHAT = 40 * 1024 * 1024;
export const MIMES_CHAT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];

export function validarAnexoChat(f: Pick<File, 'size' | 'type'>): string | null {
  if (!MIMES_CHAT.includes(f.type)) return 'Use JPG, PNG, WebP, GIF, MP4 ou WebM.';
  if (f.size === 0) return 'O arquivo está vazio.';
  if (f.size > MAX_BYTES_CHAT) return 'O arquivo pode ter até 40 MB.';
  return null;
}

export function urlAnexoChat(caminho: string) {
  return supabase.storage.from(BUCKET_CHAT).getPublicUrl(caminho).data.publicUrl;
}

export async function subirAnexoChat(file: File, uid: string): Promise<{ caminho: string; nome: string }> {
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const caminho = `${uid}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET_CHAT).upload(caminho, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Não consegui enviar o arquivo: ${error.message}`);
  return { caminho, nome: file.name.slice(0, 240) };
}

export function mensagemChat(erro: unknown): string {
  return traduzErroSupabase(erro, (codigo) => {
    if (codigo === '42501') return 'Você não tem permissão para postar — sua conta pode estar silenciada ou suspensa.';
    if (codigo === '23514') return 'A mensagem passou do limite de 4000 caracteres.';
    return null;
  }, 'sql/09-comunidade.sql');
}

/* ============================================================
   GIPHY — busca de GIFs e figurinhas
   ============================================================ */

export type AbaGiphy = 'gifs' | 'figurinhas';
export type ResultadoGiphy = { id: string; url: string; preview: string; nome: string };

export function giphyConfigurado(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GIPHY_API_KEY);
}

type ImagemGiphy = { url: string };
type ItemGiphy = {
  id: string;
  title?: string;
  images?: {
    original?: ImagemGiphy;
    downsized?: ImagemGiphy;
    fixed_width_small?: ImagemGiphy;
    preview_gif?: ImagemGiphy;
  };
};

export async function buscarGiphy(termo: string, aba: AbaGiphy, limite = 24): Promise<ResultadoGiphy[]> {
  const chave = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
  if (!chave) throw new Error('Configure a chave do Giphy (NEXT_PUBLIC_GIPHY_API_KEY) para buscar GIFs e figurinhas.');

  const rota = aba === 'figurinhas' ? 'stickers' : 'gifs';
  const termoLimpo = termo.trim();
  const url = termoLimpo
    ? `https://api.giphy.com/v1/${rota}/search?api_key=${chave}&q=${encodeURIComponent(termoLimpo)}&limit=${limite}&rating=pg-13&lang=pt`
    : `https://api.giphy.com/v1/${rota}/trending?api_key=${chave}&limit=${limite}&rating=pg-13`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Não foi possível buscar no Giphy agora.');
  const json = (await res.json()) as { data?: ItemGiphy[] };

  return (json.data ?? [])
    .map((d) => ({
      id: d.id,
      url: d.images?.original?.url ?? d.images?.downsized?.url ?? '',
      preview: d.images?.fixed_width_small?.url ?? d.images?.preview_gif?.url ?? d.images?.original?.url ?? '',
      nome: d.title?.trim() || (aba === 'figurinhas' ? 'Figurinha' : 'GIF'),
    }))
    .filter((r) => r.url && r.preview);
}
