/**
 * A APRESENTAÇÃO DO TERRITÓRIO — a "aba" que abre por cima do mapa.
 *
 * Fica guardada inteira como um JSON no próprio local (coluna
 * "apresentacao"). Cada imagem tem um formato fixo: é o recorte feito na
 * hora do envio que garante que ela encaixe na moldura do painel, em vez
 * de sair esticada ou com a parte importante cortada.
 */
import { supabase } from './db';

// o mesmo bucket das imagens de ambiente do mapa (lib/mundo) — repetido
// aqui para as duas bibliotecas não importarem uma à outra
const BUCKET_LOCAIS = 'locais';

export type ImagemApres = { url: string; caminho: string } | null;
export type Secao = { titulo: string; texto: string; imagem: ImagemApres };
export type Especie = { nome: string; imagem: ImagemApres };

export type Apresentacao = {
  subtitulo: string;
  introducao: string;
  citacao: string;
  capa: ImagemApres;
  destaque: { titulo: string; texto: string };
  secoes: Secao[];      // sempre 3
  fauna: Especie[];     // até 4
  flora: Especie[];     // até 4
  localizacao: string;
  fechamento: string;
};

export const LIMITES_APRES = {
  subtitulo: 60,
  introducao: 420,
  citacao: 180,
  destaqueTitulo: 60,
  destaqueTexto: 700,
  secaoTitulo: 40,
  secaoTexto: 240,
  especieNome: 40,
  localizacao: 220,
  fechamento: 260,
  especies: 4,
};

/**
 * O formato de cada moldura: proporção (largura / altura) e o tamanho
 * final em pixels. Maior que isto não aparece melhor na tela — só pesa.
 */
export const FORMATOS = {
  capa: { proporcao: 16 / 7, largura: 1920, altura: 840, rotulo: 'panorâmica 16:7' },
  secao: { proporcao: 4 / 5, largura: 960, altura: 1200, rotulo: 'retrato 4:5' },
  especie: { proporcao: 4 / 3, largura: 640, altura: 480, rotulo: 'paisagem 4:3' },
} as const;
export type Formato = keyof typeof FORMATOS;

export const ARQUIVO_MAX_BYTES = 20 * 1024 * 1024;
export const ARQUIVO_TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const apresentacaoVazia = (): Apresentacao => ({
  subtitulo: '',
  introducao: '',
  citacao: '',
  capa: null,
  destaque: { titulo: '', texto: '' },
  secoes: [0, 1, 2].map(() => ({ titulo: '', texto: '', imagem: null })),
  fauna: [],
  flora: [],
  localizacao: '',
  fechamento: '',
});

const txt = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const img = (v: unknown): ImagemApres => {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  return typeof o.url === 'string' && typeof o.caminho === 'string' ? { url: o.url, caminho: o.caminho } : null;
};
const especies = (v: unknown): Especie[] =>
  (Array.isArray(v) ? v : []).slice(0, LIMITES_APRES.especies).map((e) => {
    const o = (e ?? {}) as Record<string, unknown>;
    return { nome: txt(o.nome, LIMITES_APRES.especieNome), imagem: img(o.imagem) };
  });

/** Lê o que veio do banco sem confiar no formato. */
export function lerApresentacao(v: unknown): Apresentacao | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const d = (o.destaque ?? {}) as Record<string, unknown>;
  const secoesBrutas = Array.isArray(o.secoes) ? o.secoes : [];
  return {
    subtitulo: txt(o.subtitulo, LIMITES_APRES.subtitulo),
    introducao: txt(o.introducao, LIMITES_APRES.introducao),
    citacao: txt(o.citacao, LIMITES_APRES.citacao),
    capa: img(o.capa),
    destaque: { titulo: txt(d.titulo, LIMITES_APRES.destaqueTitulo), texto: txt(d.texto, LIMITES_APRES.destaqueTexto) },
    secoes: [0, 1, 2].map((i) => {
      const s = (secoesBrutas[i] ?? {}) as Record<string, unknown>;
      return { titulo: txt(s.titulo, LIMITES_APRES.secaoTitulo), texto: txt(s.texto, LIMITES_APRES.secaoTexto), imagem: img(s.imagem) };
    }),
    fauna: especies(o.fauna),
    flora: especies(o.flora),
    localizacao: txt(o.localizacao, LIMITES_APRES.localizacao),
    fechamento: txt(o.fechamento, LIMITES_APRES.fechamento),
  };
}

/** O que falta para o painel ficar completo — a lista que o editor mostra. */
export function completude(a: Apresentacao) {
  const cheio = (s: string) => s.trim().length > 0;
  const itens = [
    { rotulo: 'subtítulo', ok: cheio(a.subtitulo) },
    { rotulo: 'introdução', ok: cheio(a.introducao) },
    { rotulo: 'citação de abertura', ok: cheio(a.citacao) },
    { rotulo: 'imagem de capa', ok: !!a.capa },
    { rotulo: 'bloco de destaque', ok: cheio(a.destaque.titulo) && cheio(a.destaque.texto) },
    ...a.secoes.map((s, i) => ({
      rotulo: `seção ${i + 1} (título, texto e imagem)`,
      ok: cheio(s.titulo) && cheio(s.texto) && !!s.imagem,
    })),
    { rotulo: 'fauna: ao menos 2 com imagem', ok: a.fauna.filter((e) => e.imagem).length >= 2 },
    { rotulo: 'flora: ao menos 2 com imagem', ok: a.flora.filter((e) => e.imagem).length >= 2 },
    { rotulo: 'texto de localização', ok: cheio(a.localizacao) },
    { rotulo: 'frase de fechamento', ok: cheio(a.fechamento) },
  ];
  const feitos = itens.filter((i) => i.ok).length;
  return { itens, feitos, total: itens.length, pct: Math.round((feitos / itens.length) * 100) };
}

/** Todos os caminhos de imagem que a apresentação usa. */
export function caminhosUsados(a: Apresentacao | null): Set<string> {
  const s = new Set<string>();
  if (!a) return s;
  const add = (i: ImagemApres) => { if (i) s.add(i.caminho); };
  add(a.capa);
  a.secoes.forEach((x) => add(x.imagem));
  a.fauna.forEach((x) => add(x.imagem));
  a.flora.forEach((x) => add(x.imagem));
  return s;
}

/**
 * Sobe uma imagem já recortada para a pasta do jogador no bucket do mapa.
 * A pasta com o id da conta é o que o banco exige para deixar gravar.
 */
export async function subirImagemApres(blob: Blob, userId: string): Promise<ImagemApres> {
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const caminho = `${userId}/apresentacao/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET_LOCAIS).upload(caminho, blob, {
    contentType: blob.type, cacheControl: '31536000', upsert: false,
  });
  if (error) throw new Error(`Não consegui enviar a imagem: ${error.message}`);
  return { url: supabase.storage.from(BUCKET_LOCAIS).getPublicUrl(caminho).data.publicUrl, caminho };
}

/** Faxina: apaga do Storage imagens que ficaram sem uso. Silenciosa. */
export async function apagarImagensApres(caminhos: string[]) {
  if (caminhos.length) await supabase.storage.from(BUCKET_LOCAIS).remove(caminhos);
}

export function mensagemApres(erro: unknown): string {
  const e = erro as { message?: string; code?: string };
  if (e?.code === 'PGRST202' || /drk_salvar_apresentacao/.test(e?.message ?? '')) {
    return 'A apresentação ainda precisa ser configurada no Supabase: rode o arquivo sql/40-territorio-apresentacao.sql.';
  }
  if (e?.code === '42501') return 'Sua conta não tem permissão para editar esta apresentação.';
  if (/fetch|network/i.test(e?.message ?? '')) return 'Não foi possível conectar. Tente novamente.';
  return e?.message || 'Não foi possível salvar. Tente novamente.';
}
