import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export const BUCKET = 'Characters';

/**
 * Erros do Postgres/PostgREST vêm em códigos técnicos; isto traduz os mais
 * comuns para português. `extras` deixa cada recurso (chat, perfil...)
 * acrescentar seus próprios códigos (ex.: violação de índice único) sem
 * duplicar os códigos genéricos que todos compartilham.
 */
export function traduzErroSupabase(
  erro: unknown,
  extras: (codigo: string) => string | null,
  arquivoSql: string,
): string {
  const e = erro as { message?: string; code?: string };
  const codigo = e?.code ?? '';
  const doRecurso = extras(codigo);
  if (doRecurso) return doRecurso;
  if (['42P01', 'PGRST205', '42883', 'PGRST202'].includes(codigo)) {
    return `Isto ainda precisa ser configurado no Supabase. Aplique o arquivo ${arquivoSql}.`;
  }
  if (codigo === '42501') return 'Sua sessão não tem permissão para isto. Entre novamente.';
  if (/fetch|network/i.test(e?.message ?? '')) return 'Não foi possível conectar. Tente novamente.';
  return e?.message || 'Não foi possível concluir. Tente novamente.';
}

/* ============================================================
   ARQUIVO DA FICHA (PDF ou Word)
   ============================================================ */

export const BUCKET_FICHAS = 'fichas';

/** 20 MB. O mesmo número está travado no bucket, no Supabase. */
export const FICHA_MAX_BYTES = 20 * 1024 * 1024;
export const FICHA_MAX_ROTULO = '20 MB';

/**
 * Descobre o tipo pelo final do nome do arquivo.
 *
 * Por que não usar o `file.type` que o navegador informa: ele vem vazio
 * ou errado com frequência, dependendo do sistema e de como o arquivo
 * chegou ali. A extensão é o que o usuário enxerga e é estável — e o
 * tipo daqui é o que mandamos para o Supabase, que confere de novo.
 */
export function tipoPelaExtensao(nome: string): string | null {
  // exige um ponto de verdade: um arquivo chamado apenas "pdf",
  // sem extensão nenhuma, não é um PDF
  const ext = (/\.([^.]+)$/.exec(nome)?.[1] ?? '').toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'doc') return 'application/msword';
  if (ext === 'docx')
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return null;
}

/** Confere o arquivo antes de gastar upload. null = pode subir. */
export function conferirFicha(file: File): string | null {
  if (!tipoPelaExtensao(file.name)) {
    return 'Só PDF ou Word (.pdf, .doc, .docx).';
  }
  if (file.size > FICHA_MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `O arquivo tem ${mb} MB e o limite é ${FICHA_MAX_ROTULO}.`;
  }
  if (file.size === 0) return 'O arquivo está vazio.';
  return null;
}

/**
 * Do endereço público do Storage extrai o caminho do arquivo.
 * .../object/public/fichas/1789-elsharion.pdf  ->  1789-elsharion.pdf
 */
export function caminhoDoStorage(url: string | null, bucket: string): string | null {
  if (!url) return null;
  const marca = `/object/public/${bucket}/`;
  const i = url.indexOf(marca);
  if (i < 0) return null;
  const caminho = url.slice(i + marca.length).split('?')[0];
  return caminho ? decodeURIComponent(caminho) : null;
}

/**
 * Sobe a ficha DIRETO do navegador para o Supabase.
 *
 * Isto não passa pela nossa API de propósito: a Vercel corta qualquer
 * requisição com corpo acima de 4,5 MB, então um PDF de 20 MB jamais
 * chegaria do outro lado. Aqui o navegador fala direto com o Storage,
 * usando a sessão de quem está logado — as políticas do bucket valem
 * igual. Para a API sobe depois só o endereço, que é um texto curto.
 */
export async function subirFicha(file: File, base: string): Promise<string> {
  const tipo = tipoPelaExtensao(file.name);
  if (!tipo) throw new Error('Só PDF ou Word (.pdf, .doc, .docx).');

  const ext = (/\.([^.]+)$/.exec(file.name)?.[1] ?? '').toLowerCase();
  const semExt = file.name.replace(/\.[^.]+$/, '');
  const caminho = `${Date.now()}-${slugify(semExt, base)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET_FICHAS).upload(caminho, file, {
    contentType: tipo,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error(`Não consegui enviar o arquivo: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET_FICHAS).getPublicUrl(caminho);
  return data.publicUrl;
}

/** Remove uma ficha do Storage. Silencioso: é limpeza, não pode travar nada. */
export async function apagarFichaDoNavegador(url: string | null) {
  const caminho = caminhoDoStorage(url, BUCKET_FICHAS);
  if (!caminho) return;
  await supabase.storage.from(BUCKET_FICHAS).remove([caminho]);
}

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

/** Uma aba da história do personagem. */
export type Secao = { titulo: string; texto: string };

/** Limites de segurança, aplicados também no servidor. */
export const LIMITES = { abas: 20, titulo: 60, texto: 20000 };

/**
 * Lê as abas vindas do banco sem confiar no formato.
 * A coluna é JSON livre — dá para editar à mão no painel do Supabase —
 * então qualquer coisa pode chegar aqui. Nada de quebrar a página do
 * personagem por causa de um registro torto: o que não presta é ignorado.
 */
export function lerSecoes(valor: unknown): Secao[] {
  if (!Array.isArray(valor)) return [];
  const out: Secao[] = [];
  for (const item of valor) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const titulo = typeof o.titulo === 'string' ? o.titulo.trim() : '';
    const texto = typeof o.texto === 'string' ? o.texto : '';
    if (!titulo && !texto.trim()) continue;   // aba totalmente vazia, descarta
    out.push({ titulo: titulo || 'sem título', texto });
    if (out.length >= LIMITES.abas) break;
  }
  return out;
}

export type Character = {
  id: number | string;
  slug: string | null;
  name: string | null;
  epithet: string | null;      // epíteto / alcunha
  quote: string | null;        // citação marcante
  description: string | null;  // resumo curto (aparece na galeria)
  history: string | null;      // legado: texto antigo, hoje só cópia de segurança
  powers: string | null;       // legado: idem
  sections: unknown;           // abas da história — passe por lerSecoes() antes de usar
  faction: string | null;      // facção / casa
  status: string | null;       // vivo, morto, desaparecido...
  race: string | null;         // raça / origem
  affiliation: string | null;  // afiliações
  image_url: string | null;
  sheet_url: string | null;    // ficha anexada (PDF ou Word)
  sheet_name: string | null;   // nome original do arquivo, para o botão de baixar
  user_id: string | null;              // quem enviou — null nas fichas antigas, feitas pelo admin
  status_aprovacao: 'pendente' | 'aprovado' | 'reprovado';
  motivo_reprovacao: string | null;
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
