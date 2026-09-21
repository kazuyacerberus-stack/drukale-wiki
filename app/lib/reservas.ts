import { supabase, traduzErroSupabase } from './db';

export type Reserva = {
  id: string;
  user_id: string;
  nome: string;
  faccao: string | null;
  raca: string | null;
  classe: string | null;
  subclasse: string | null;
  personagem: string;
  universo: string;
  autoral: boolean;
  titulo: string;
  caminho: string;
  imagem_hash: string;
  created_at: string;
};

export const BUCKET_RESERVAS = 'reservas';
export const UNIVERSO_AUTORAL = 'Autoria própria';
export const MAX_BYTES_RESERVA = 8 * 1024 * 1024;
export const MIMES_RESERVA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function urlImagemReserva(caminho: string): string {
  return supabase.storage.from(BUCKET_RESERVAS).getPublicUrl(caminho).data.publicUrl;
}

export function validarImagemReserva(f: Pick<File, 'size' | 'type'>): string | null {
  if (!MIMES_RESERVA.includes(f.type)) return 'Use JPG, PNG, WebP ou GIF.';
  if (f.size === 0) return 'O arquivo está vazio.';
  if (f.size > MAX_BYTES_RESERVA) return `A imagem tem ${(f.size / 1024 / 1024).toFixed(1)} MB e o limite é 8 MB.`;
  return null;
}

/** Impressão digital do arquivo: a mesma imagem nunca é reservada duas vezes, mesmo com outro nome. */
export async function hashDaImagem(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const COM_ACENTO = 'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ';
const SEM_ACENTO = 'aaaaaaeeeeiiiiooooouuuucnyy';

/**
 * A mesma conta que o banco faz na coluna "chave" (sql/35): personagem e
 * universo em minúscula, sem acento e sem espaço a mais. É por ela que o
 * formulário avisa, antes de enviar, que aquele personagem já foi reservado.
 */
export function chaveDaReserva(personagem: string, universo: string): string {
  const base = `${personagem.trim()}|${universo.trim()}`.toLowerCase();
  let saida = '';
  for (const c of base) {
    const i = COM_ACENTO.indexOf(c);
    saida += i === -1 ? c : SEM_ACENTO[i];
  }
  return saida.replace(/\s+/g, ' ');
}

export async function removerImagemReserva(caminho: string) {
  await supabase.storage.from(BUCKET_RESERVAS).remove([caminho]);
}

export function mensagemReserva(erro: unknown): string {
  const e = erro as { code?: string; message?: string };
  if (e?.code === '23505') {
    if (/hash/.test(e.message ?? '')) return 'Essa imagem (o mesmo arquivo) já foi reservada por alguém.';
    return 'Esse personagem deste universo já foi reservado por outro jogador.';
  }
  return traduzErroSupabase(erro, () => null, 'sql/35-reserva-imagens.sql');
}
