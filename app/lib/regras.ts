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

/**
 * Compara sem acento nem maiúscula. Troca caractere por caractere (nunca
 * muda o tamanho do texto), pra uma posição achada aqui valer também no
 * texto original — é isso que permite grifar o trecho certo.
 */
export function normalizarBusca(v: string): string {
  let saida = '';
  for (let i = 0; i < v.length; i++) {
    const c = v[i];
    const n = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    saida += n.charAt(0) || c;
  }
  return saida;
}

/** O que o jogador digitou, já separado em frases exatas ("entre aspas") e palavras soltas. */
export type Busca = { agulhas: string[]; frase: string };

export const BUSCA_VAZIA: Busca = { agulhas: [], frase: '' };

/**
 * "ação negada"      -> todas as palavras precisam aparecer (e a frase inteira, junta, sobe no ranking)
 * "ação negada" entre aspas -> só vale a frase exata
 */
export function interpretarBusca(q: string): Busca {
  const frases: string[] = [];
  const resto = q.replace(/["“”]([^"“”]+)["“”]/g, (_t, f: string) => {
    const n = normalizarBusca(f).replace(/\s+/g, ' ').trim();
    if (n) frases.push(n);
    return ' ';
  });
  const palavras = normalizarBusca(resto).split(/\s+/).filter((p) => p.length >= 2);
  const agulhas = [...new Set([...frases, ...palavras])];
  const inteira = normalizarBusca(q.replace(/["“”]/g, ' ')).replace(/\s+/g, ' ').trim();
  const frase = frases.length === 0 && palavras.length > 1 ? inteira : '';
  return { agulhas: frase ? [...new Set([frase, ...agulhas])] : agulhas, frase };
}

/** Tira a marcação (negrito, tabela, links, mídia) e deixa só o texto que a pessoa lê. */
export function textoPuro(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)|@\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*+/g, '')
    .replace(/^#{2,3} /gm, '')
    .replace(/^- /gm, '')
    .replace(/^\s*\|?[\s:|-]+\|?\s*$/gm, ' ')
    .replace(/\\\|/g, '|')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type IndiceRegra = { tituloN: string; puro: string; puroN: string };

export function indexarRegra(r: Regra): IndiceRegra {
  const puro = textoPuro(r.conteudo);
  return { tituloN: normalizarBusca(r.titulo), puro, puroN: normalizarBusca(puro) };
}

function contar(texto: string, agulha: string): number {
  let n = 0;
  for (let i = texto.indexOf(agulha); i !== -1; i = texto.indexOf(agulha, i + agulha.length)) n++;
  return n;
}

/** null se a regra não tem tudo o que foi buscado; senão nota (pra ordenar) e quantos trechos batem. */
export function pontuar(ix: IndiceRegra, b: Busca): { nota: number; trechos: number } | null {
  let nota = 0;
  let trechos = 0;
  const alvo = b.frase ? b.agulhas.filter((a) => a !== b.frase) : b.agulhas;
  for (const a of alvo) {
    const noTitulo = ix.tituloN.includes(a);
    const noTexto = contar(ix.puroN, a);
    if (!noTitulo && noTexto === 0) return null;
    nota += Math.min(noTexto, 20) + (noTitulo ? 12 : 0);
    trechos += noTexto + (noTitulo ? 1 : 0);
  }
  if (b.frase) {
    if (ix.tituloN.includes(b.frase)) nota += 30;
    const junto = contar(ix.puroN, b.frase);
    if (junto) nota += 15 + Math.min(junto, 10) * 2;
  }
  return { nota, trechos };
}

/** Pedaço do texto em volta do primeiro achado, pra mostrar no resultado da busca. */
export function trecho(ix: IndiceRegra, b: Busca, raio = 70): string {
  const candidatos = [b.frase, ...b.agulhas].filter(Boolean);
  let pos = -1;
  let tam = 0;
  for (const a of candidatos) {
    const p = ix.puroN.indexOf(a);
    if (p !== -1 && (pos === -1 || (a === b.frase) || p < pos)) { pos = p; tam = a.length; if (a === b.frase) break; }
  }
  if (pos === -1) return ix.puro.slice(0, raio * 2) + (ix.puro.length > raio * 2 ? '…' : '');
  let ini = Math.max(0, pos - raio);
  let fim = Math.min(ix.puro.length, pos + tam + raio * 1.6);
  if (ini > 0) { const e = ix.puro.indexOf(' ', ini); if (e !== -1 && e < pos) ini = e + 1; }
  if (fim < ix.puro.length) { const e = ix.puro.lastIndexOf(' ', fim); if (e > pos + tam) fim = e; }
  return `${ini > 0 ? '…' : ''}${ix.puro.slice(ini, fim)}${fim < ix.puro.length ? '…' : ''}`;
}

/** Divide o texto em pedaços "com/sem grifo", pelas agulhas achadas (já sem acento). */
export function grifar(texto: string, agulhas: string[]): { t: string; marca: boolean }[] {
  if (!agulhas.length || !texto) return [{ t: texto, marca: false }];
  const n = normalizarBusca(texto);
  const faixas: [number, number][] = [];
  for (const a of agulhas) {
    for (let i = n.indexOf(a); i !== -1; i = n.indexOf(a, i + a.length)) faixas.push([i, i + a.length]);
  }
  if (!faixas.length) return [{ t: texto, marca: false }];
  faixas.sort((x, y) => x[0] - y[0]);
  const uniao: [number, number][] = [];
  for (const f of faixas) {
    const ultima = uniao[uniao.length - 1];
    if (ultima && f[0] <= ultima[1]) ultima[1] = Math.max(ultima[1], f[1]);
    else uniao.push([f[0], f[1]]);
  }
  const partes: { t: string; marca: boolean }[] = [];
  let cursor = 0;
  for (const [a, b] of uniao) {
    if (a > cursor) partes.push({ t: texto.slice(cursor, a), marca: false });
    partes.push({ t: texto.slice(a, b), marca: true });
    cursor = b;
  }
  if (cursor < texto.length) partes.push({ t: texto.slice(cursor), marca: false });
  return partes;
}

export function mensagemRegra(erro: unknown): string {
  return traduzErroSupabase(erro, () => null, 'sql/33-regras.sql');
}
