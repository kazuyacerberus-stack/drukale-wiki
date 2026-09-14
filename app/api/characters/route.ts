import { NextRequest, NextResponse } from 'next/server';
import { clienteComToken, BUCKET, slugify, limpo, lerSecoes, LIMITES } from '../../lib/db';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Campos de texto aceitos no formulário.
 * `history` e `powers` saíram de propósito: viraram abas dentro de
 * `sections` e as colunas antigas ficam intactas como cópia de segurança.
 * Se voltassem para cá, o primeiro salvamento apagaria esse backup.
 */
const CAMPOS = [
  'name', 'epithet', 'faction', 'status', 'race',
  'affiliation', 'quote', 'description',
] as const;

/**
 * Confere quem está chamando. Devolve um cliente Supabase carimbado com
 * o token dessa pessoa — todas as operações seguintes correm como ela,
 * então as regras do banco são a palavra final sobre o que pode ou não.
 */
async function exigirSessao(request: NextRequest) {
  const cabecalho = request.headers.get('authorization') ?? '';
  const token = cabecalho.toLowerCase().startsWith('bearer ')
    ? cabecalho.slice(7).trim()
    : null;

  if (!token) return { cli: null, erro: 'Sessão não encontrada — faça login novamente.' };

  const cli = clienteComToken(token);
  const { data, error } = await cli.auth.getUser();
  if (error || !data.user) {
    return { cli: null, erro: 'Sessão expirada — faça login novamente.' };
  }
  return { cli, erro: null };
}

function naoAutorizado(msg: string) {
  return NextResponse.json({ error: msg }, { status: 401 });
}

/**
 * Do endereço público do Storage extrai o caminho do arquivo.
 * .../object/public/Characters/1789-elsharion.png  ->  1789-elsharion.png
 */
function caminhoDoStorage(url: string | null): string | null {
  if (!url) return null;
  const marca = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marca);
  if (i < 0) return null;
  const caminho = url.slice(i + marca.length).split('?')[0];
  return caminho ? decodeURIComponent(caminho) : null;
}

/** Remove um arquivo do Storage sem derrubar a operação se falhar. */
async function apagarImagem(cli: SupabaseClient, url: string | null) {
  const caminho = caminhoDoStorage(url);
  if (!caminho) return;
  const { error } = await cli.storage.from(BUCKET).remove([caminho]);
  if (error) console.error('Falha ao remover imagem antiga:', error.message);
}

/** Sobe a imagem e devolve o endereço público. */
async function subirImagem(cli: SupabaseClient, file: File, base: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const nomeArquivo = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ''), base)}.png`;

  const { error } = await cli.storage.from(BUCKET).upload(nomeArquivo, buffer, {
    contentType: file.type || 'image/png',
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error(`Erro ao fazer upload: ${error.message}`);

  const { data } = cli.storage.from(BUCKET).getPublicUrl(nomeArquivo);
  return data.publicUrl;
}

/**
 * Garante endereço único: se "elsharion" já existe, vira "elsharion-2".
 * `ignorar` é o endereço atual do próprio registro sendo editado.
 */
async function slugLivre(cli: SupabaseClient, base: string, ignorar?: string | null) {
  const { data } = await cli.from('characters').select('slug').like('slug', `${base}%`);
  const usados = new Set(
    (data ?? [])
      .map((r: { slug: string | null }) => r.slug)
      .filter((s): s is string => !!s && s !== ignorar)
  );
  if (!usados.has(base)) return base;
  for (let i = 2; i < 500; i++) {
    if (!usados.has(`${base}-${i}`)) return `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

function lerCampos(form: FormData): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  for (const campo of CAMPOS) r[campo] = limpo(form.get(campo));
  return r;
}

/**
 * Lê as abas enviadas pelo formulário e corta no tamanho máximo.
 *
 * Duas decisões deliberadas aqui:
 *  - campo ausente não é o mesmo que lista vazia. Se o formulário não
 *    mandou `sections`, não mexemos na coluna — assim uma tela antiga
 *    em cache nunca apaga as abas de ninguém.
 *  - JSON quebrado derruba o salvamento em vez de virar lista vazia.
 *    Melhor o usuário ver um erro do que perder o texto calado.
 */
function aplicarSecoes(form: FormData, registro: Record<string, unknown>) {
  const bruto = form.get('sections');
  if (typeof bruto !== 'string') return;

  let dados: unknown = [];
  if (bruto.trim()) {
    try {
      dados = JSON.parse(bruto);
    } catch {
      throw new Error('As abas chegaram corrompidas. Recarregue a página e tente de novo.');
    }
  }

  registro.sections = lerSecoes(dados).map((s) => ({
    titulo: s.titulo.slice(0, LIMITES.titulo),
    texto: s.texto.slice(0, LIMITES.texto),
  }));
}

const BLOQUEADO =
  'O Supabase recusou a operação. Confira as políticas da tabela characters.';

/* ============================================================
   CRIAR
   ============================================================ */
export async function POST(request: NextRequest) {
  const { cli, erro } = await exigirSessao(request);
  if (!cli) return naoAutorizado(erro!);

  try {
    const form = await request.formData();
    const registro = lerCampos(form);

    const nome = typeof registro.name === 'string' ? registro.name : '';
    if (!nome) {
      return NextResponse.json({ error: 'O nome é obrigatório' }, { status: 400 });
    }

    aplicarSecoes(form, registro);

    const slug = await slugLivre(cli, slugify(nome));
    registro.slug = slug;

    let imageUrl: string | null = null;
    const file = form.get('file');
    if (file instanceof File && file.size > 0) {
      imageUrl = await subirImagem(cli, file, slug);
      registro.image_url = imageUrl;
    }

    const { data: criados, error } = await cli
      .from('characters')
      .insert([registro])
      .select();

    if (error) {
      console.error('DB error:', error);
      return NextResponse.json({ error: `Erro ao gravar: ${error.message}` }, { status: 500 });
    }
    if (!criados || criados.length === 0) {
      return NextResponse.json({ error: BLOQUEADO }, { status: 403 });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Personagem gravado com sucesso!',
        slug,
        imageUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: mensagem(error) }, { status: 500 });
  }
}

/* ============================================================
   ATUALIZAR
   ============================================================ */
export async function PUT(request: NextRequest) {
  const { cli, erro } = await exigirSessao(request);
  if (!cli) return naoAutorizado(erro!);

  try {
    const form = await request.formData();
    const id = limpo(form.get('id'));
    if (!id) return NextResponse.json({ error: 'Registro não identificado' }, { status: 400 });

    const registro = lerCampos(form);
    const nome = typeof registro.name === 'string' ? registro.name : '';
    if (!nome) {
      return NextResponse.json({ error: 'O nome é obrigatório' }, { status: 400 });
    }

    aplicarSecoes(form, registro);

    const { data: atual, error: erroBusca } = await cli
      .from('characters')
      .select('*')
      .eq('id', id)
      .single();

    if (erroBusca || !atual) {
      return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });
    }

    const slugAtual: string | null = atual.slug ?? null;
    const slug =
      form.get('trocarSlug') === '1'
        ? await slugLivre(cli, slugify(nome), slugAtual)
        : slugAtual;
    registro.slug = slug;

    const file = form.get('file');
    const trocouImagem = file instanceof File && file.size > 0;
    const removeu = form.get('removerImagem') === '1';

    let imageUrl: string | null = atual.image_url ?? null;
    if (trocouImagem) {
      imageUrl = await subirImagem(cli, file, slug ?? 'personagem');
      registro.image_url = imageUrl;
    } else if (removeu) {
      imageUrl = null;
      registro.image_url = null;
    }

    // o .select() devolve as linhas afetadas: vazio significa que as
    // políticas bloquearam a escrita (o Supabase não reporta isso como erro)
    const { data: alterados, error } = await cli
      .from('characters')
      .update(registro)
      .eq('id', id)
      .select();

    if (error) {
      console.error('DB error:', error);
      return NextResponse.json({ error: `Erro ao atualizar: ${error.message}` }, { status: 500 });
    }
    if (!alterados || alterados.length === 0) {
      return NextResponse.json({ error: BLOQUEADO }, { status: 403 });
    }

    // só apaga a antiga depois que o banco confirmou
    if (trocouImagem || removeu) await apagarImagem(cli, atual.image_url ?? null);

    return NextResponse.json(
      {
        success: true,
        message: 'Registro atualizado!',
        slug,
        imageUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: mensagem(error) }, { status: 500 });
  }
}

/* ============================================================
   EXCLUIR
   ============================================================ */
export async function DELETE(request: NextRequest) {
  const { cli, erro } = await exigirSessao(request);
  if (!cli) return naoAutorizado(erro!);

  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Registro não identificado' }, { status: 400 });

    const { data: atual } = await cli
      .from('characters')
      .select('image_url')
      .eq('id', id)
      .single();

    const { data: apagados, error } = await cli
      .from('characters')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error('DB error:', error);
      return NextResponse.json({ error: `Erro ao excluir: ${error.message}` }, { status: 500 });
    }
    if (!apagados || apagados.length === 0) {
      return NextResponse.json({ error: BLOQUEADO }, { status: 403 });
    }

    await apagarImagem(cli, atual?.image_url ?? null);

    return NextResponse.json({ success: true, message: 'Registro removido.' }, { status: 200 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: mensagem(error) }, { status: 500 });
  }
}

function mensagem(error: unknown) {
  return `Erro interno do servidor: ${
    error instanceof Error ? error.message : 'Unknown error'
  }`;
}
