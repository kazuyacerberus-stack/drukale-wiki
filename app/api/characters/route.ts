import { NextRequest, NextResponse } from 'next/server';
import {
  clienteComToken, BUCKET, BUCKET_FICHAS, slugify, limpo,
  lerSecoes, LIMITES, caminhoDoStorage,
} from '../../lib/db';
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

  if (!token) return { cli: null, userId: null, erro: 'Sessão não encontrada — faça login novamente.' };

  const cli = clienteComToken(token);
  const { data, error } = await cli.auth.getUser();
  if (error || !data.user) {
    return { cli: null, userId: null, erro: 'Sessão expirada — faça login novamente.' };
  }
  return { cli, userId: data.user.id, erro: null };
}

/**
 * Quem não é administrador só consegue gravar como pendente e em nome
 * de si mesmo — a política restritiva do banco garante isso de
 * qualquer jeito, mas decidir aqui também evita uma ida a mais ao
 * Postgres só para descobrir que foi recusado.
 */
async function aplicarAprovacao(cli: SupabaseClient, userId: string, registro: Record<string, unknown>): Promise<boolean> {
  const { data: admin } = await cli.rpc('drk_e_admin');
  if (admin === true) return false;
  registro.user_id = userId;
  registro.status_aprovacao = 'pendente';
  registro.motivo_reprovacao = null;
  return true;
}

function naoAutorizado(msg: string) {
  return NextResponse.json({ error: msg }, { status: 401 });
}

/**
 * Remove um arquivo do Storage sem derrubar a operação se falhar.
 * É faxina: se não der, o registro já foi salvo e o que sobra é um
 * arquivo órfão ocupando espaço — nunca motivo para o usuário ver erro.
 */
async function apagarArquivo(cli: SupabaseClient, bucket: string, url: string | null) {
  const caminho = caminhoDoStorage(url, bucket);
  if (!caminho) return;
  const { error } = await cli.storage.from(bucket).remove([caminho]);
  if (error) console.error(`Falha ao remover arquivo antigo de ${bucket}:`, error.message);
}

const apagarImagem = (cli: SupabaseClient, url: string | null) =>
  apagarArquivo(cli, BUCKET, url);

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

/**
 * Guarda o endereço da ficha anexada.
 *
 * O arquivo em si já subiu direto do navegador para o Storage — aqui
 * chega só o endereço dele. Campo vazio significa "tirei o anexo";
 * campo ausente significa "não mexi nisso", e aí a coluna fica como está.
 */
function aplicarFicha(form: FormData, registro: Record<string, unknown>) {
  const url = form.get('sheet_url');
  if (typeof url !== 'string') return;

  const endereco = limpo(url);
  registro.sheet_url = endereco;
  registro.sheet_name = endereco ? limpo(form.get('sheet_name')) : null;
}

const BLOQUEADO =
  'O Supabase recusou a operação. Confira as políticas da tabela characters.';

/* ============================================================
   CRIAR
   ============================================================ */
export async function POST(request: NextRequest) {
  const { cli, userId, erro } = await exigirSessao(request);
  if (!cli) return naoAutorizado(erro!);

  try {
    const form = await request.formData();
    const registro = lerCampos(form);

    const nome = typeof registro.name === 'string' ? registro.name : '';
    if (!nome) {
      return NextResponse.json({ error: 'O nome é obrigatório' }, { status: 400 });
    }

    const pendente = await aplicarAprovacao(cli, userId!, registro);
    aplicarSecoes(form, registro);
    aplicarFicha(form, registro);

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
        message: pendente ? 'Ficha enviada para análise do administrador!' : 'Personagem gravado com sucesso!',
        slug,
        imageUrl,
        pendente,
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
  const { cli, userId, erro } = await exigirSessao(request);
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

    // quem não é admin só edita a própria ficha, e ela volta para a fila
    // de análise — corrigir e reenviar apaga a reprovação anterior
    const pendente = await aplicarAprovacao(cli, userId!, registro);

    aplicarSecoes(form, registro);
    aplicarFicha(form, registro);

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

    // só apaga as antigas depois que o banco confirmou
    if (trocouImagem || removeu) await apagarImagem(cli, atual.image_url ?? null);

    // ficha trocada ou removida: o arquivo velho não serve mais a ninguém
    const fichaAntiga: string | null = atual.sheet_url ?? null;
    if ('sheet_url' in registro && fichaAntiga && fichaAntiga !== registro.sheet_url) {
      await apagarArquivo(cli, BUCKET_FICHAS, fichaAntiga);
    }

    return NextResponse.json(
      {
        success: true,
        message: pendente ? 'Ficha atualizada e reenviada para análise!' : 'Registro atualizado!',
        slug,
        imageUrl,
        pendente,
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
      .select('image_url, sheet_url')
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

    // o personagem se foi: retrato e ficha anexada vão junto
    await apagarImagem(cli, atual?.image_url ?? null);
    await apagarArquivo(cli, BUCKET_FICHAS, atual?.sheet_url ?? null);

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
