import { traduzErroSupabase } from './db';
import type { AnexoComentario } from './comentarios';
import type { Musica } from './musica';

export type PostComentario = {
  id: string;
  post_id: string;
  parent_id: string | null;
  user_id: string;
  texto: string | null;
  anexo: AnexoComentario | null;
  musica: Musica | null;
  created_at: string;
};

export type PostComentarioComRespostas = PostComentario & { respostas: PostComentarioComRespostas[] };

/** Monta a árvore comentário → respostas a partir da lista plana vinda do banco. */
export function montarArvorePostComentarios(lista: PostComentario[]): PostComentarioComRespostas[] {
  const porId = new Map<string, PostComentarioComRespostas>(lista.map((c) => [c.id, { ...c, respostas: [] }]));
  const raizes: PostComentarioComRespostas[] = [];
  for (const c of lista) {
    const no = porId.get(c.id)!;
    if (c.parent_id && porId.has(c.parent_id)) porId.get(c.parent_id)!.respostas.push(no);
    else raizes.push(no);
  }
  return raizes;
}

export function mensagemPostComentario(erro: unknown): string {
  return traduzErroSupabase(erro, () => null, 'sql/32-posts-comentarios-reacoes-musica.sql');
}
