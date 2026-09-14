import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export const BUCKET = 'Characters';

/**
 * Cliente para uso NO SERVIDOR, carimbado com o token de quem chamou.
 * Com ele o Supabase enxerga a requisição como sendo daquele usuário,
 * então as regras de permissão do banco valem de verdade — não existe
 * chave mestra no servidor que possa vazar.
 */
export function clienteComToken(token: string | null) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      global: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

export type Character = {
  id: number | string;
  slug: string | null;
  name: string | null;
  epithet: string | null;      // epíteto / alcunha
  quote: string | null;        // citação marcante
  description: string | null;  // resumo curto (aparece na galeria)
  history: string | null;      // história completa
  powers: string | null;       // poderes e habilidades
  faction: string | null;      // facção / casa
  status: string | null;       // vivo, morto, desaparecido...
  race: string | null;         // raça / origem
  affiliation: string | null;  // afiliações
  image_url: string | null;
};

/** Campos vazios viram null para não poluir a ficha. */
export function limpo(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  return s.length ? s : null;
}

/**
 * Gera a parte do endereço: "Elsharion Drukale" -> "elsharion-drukale".
 * Usado tanto na URL da página quanto no nome do arquivo no Storage.
 */
export function slugify(texto: string, padrao = 'personagem'): string {
  const s = texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60);
  return s || padrao;
}

/** Lista de campos que viram linhas da ficha lateral, na ordem. */
export const FICHA: { campo: keyof Character; rotulo: string }[] = [
  { campo: 'faction', rotulo: 'facção' },
  { campo: 'status', rotulo: 'status' },
  { campo: 'race', rotulo: 'raça' },
  { campo: 'affiliation', rotulo: 'afiliações' },
];
