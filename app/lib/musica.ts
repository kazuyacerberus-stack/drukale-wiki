export type Musica = { provedor: 'youtube' | 'spotify'; url: string };

const RE_YOUTUBE = /^https?:\/\/(?:www\.|music\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,20})/i;
const RE_SPOTIFY = /^https?:\/\/open\.spotify\.com\/(track|album|playlist|episode)\/([A-Za-z0-9]{10,30})/i;

/** Reconhece um link de YouTube ou Spotify; qualquer outra coisa (ou link inválido) devolve null. */
export function parseMusicaUrl(url: string): Musica | null {
  const limpo = url.trim();
  if (!limpo) return null;
  if (RE_YOUTUBE.test(limpo)) return { provedor: 'youtube', url: limpo };
  if (RE_SPOTIFY.test(limpo)) return { provedor: 'spotify', url: limpo };
  return null;
}

/** Monta a URL de embed a partir do link original — null se o link não bater com o padrão esperado. */
export function embedSrc(m: Musica): string | null {
  if (m.provedor === 'youtube') {
    const match = m.url.match(RE_YOUTUBE);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  }
  const match = m.url.match(RE_SPOTIFY);
  return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}` : null;
}

export const ROTULO_PROVEDOR: Record<Musica['provedor'], string> = { youtube: 'YouTube', spotify: 'Spotify' };
