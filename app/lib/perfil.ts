import { supabase, traduzErroSupabase } from './db';

export type Perfil = {
  user_id: string;
  apelido: string;
  avatar_url: string | null;
  capa_url: string | null;
  bio: string | null;
  muted_until: string | null;
  banido: boolean;
  status_conta: 'pendente' | 'aprovado' | 'reprovado';
  motivo_reprovacao: string | null;
  created_at: string;
};

export const BUCKET_AVATARS = 'avatars';
export const MAX_BYTES_AVATAR = 5 * 1024 * 1024;
export const MAX_BYTES_CAPA = 8 * 1024 * 1024;
export const MIMES_AVATAR = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const LIMITE_BIO = 300;

export function validarAvatar(f: Pick<File, 'size' | 'type'>): string | null {
  if (!MIMES_AVATAR.includes(f.type)) return 'Use JPG, PNG, WebP ou GIF.';
  if (f.size === 0) return 'O arquivo está vazio.';
  if (f.size > MAX_BYTES_AVATAR) return 'A imagem pode ter até 5 MB.';
  return null;
}

export function validarCapa(f: Pick<File, 'size' | 'type'>): string | null {
  if (!MIMES_AVATAR.includes(f.type)) return 'Use JPG, PNG, WebP ou GIF.';
  if (f.size === 0) return 'O arquivo está vazio.';
  if (f.size > MAX_BYTES_CAPA) return 'A capa pode ter até 8 MB.';
  return null;
}

export function estaMudo(p: Pick<Perfil, 'muted_until'> | null): boolean {
  return Boolean(p?.muted_until && new Date(p.muted_until).getTime() > Date.now());
}

/**
 * Busca o perfil da conta logada. Se ainda não existir — conta antiga de
 * antes deste recurso, ou confirmação de e-mail que só terminou agora —
 * cria um com o apelido escolhido no cadastro (guardado nos metadados da
 * conta, já que o perfil só pode ser gravado depois que a sessão existe)
 * ou, na falta dele, um provisório a partir do e-mail. Idempotente: se
 * duas abas tentarem criar ao mesmo tempo, a segunda só relê o que a
 * primeira gravou.
 */
export async function garantirPerfil(): Promise<Perfil | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data: existente } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
  if (existente) return existente as Perfil;

  const doCadastro = typeof user.user_metadata?.apelido === 'string' ? user.user_metadata.apelido.trim() : '';
  const provisorio = doCadastro.length >= 2 && doCadastro.length <= 32
    ? doCadastro
    : (user.email ?? 'membro').split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 24) || 'membro';

  const { data: criado, error } = await supabase
    .from('profiles')
    .insert({ user_id: user.id, apelido: provisorio })
    .select()
    .single();
  if (!error) return criado as Perfil;

  // outra aba/requisição já criou primeiro: não é falha, só relê
  const { data: relido } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
  if (relido) return relido as Perfil;

  // não foi corrida entre abas — foi o APELIDO que colidiu com o de outra
  // conta (duas pessoas com prefixo de e-mail igual, ex.: joao@gmail.com e
  // joao@empresa.com). Sem isto, esta conta ficaria pra sempre sem perfil.
  const { data: criado2 } = await supabase
    .from('profiles')
    .insert({ user_id: user.id, apelido: `${provisorio.slice(0, 27)}_${user.id.slice(0, 4)}` })
    .select()
    .single();
  return (criado2 as Perfil) ?? null;
}

/** Sobe o avatar ou a capa para a pasta da própria conta, sempre no mesmo nome (substitui o antigo). */
async function subirImagemPerfil(file: File, uid: string, base: 'avatar' | 'capa'): Promise<string> {
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const caminho = `${uid}/${base}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET_AVATARS).upload(caminho, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: true,
  });
  if (error) throw new Error(`Não consegui enviar a imagem: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET_AVATARS).getPublicUrl(caminho);
  // marca de tempo na URL só para o navegador não mostrar a imagem antiga em cache
  return `${data.publicUrl}?t=${Date.now()}`;
}

const subirAvatar = (file: File, uid: string) => subirImagemPerfil(file, uid, 'avatar');
const subirCapa = (file: File, uid: string) => subirImagemPerfil(file, uid, 'capa');

/** Cria o perfil logo após o cadastro, já com o apelido escolhido na hora. */
export async function criarPerfilInicial(apelido: string, avatarFile?: File | null): Promise<Perfil> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sessão não encontrada.');

  const { data, error } = await supabase.from('profiles').insert({ user_id: auth.user.id, apelido: apelido.trim() }).select().single();
  if (error) throw new Error(mensagemPerfil(error));
  if (!avatarFile) return data as Perfil;

  return salvarPerfil(apelido, avatarFile);
}

export async function salvarPerfil(apelido: string, avatarFile?: File | null, capaFile?: File | null, bio?: string): Promise<Perfil> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Entre novamente para salvar o perfil.');

  const registro: { apelido: string; avatar_url?: string; capa_url?: string; bio?: string | null } = { apelido: apelido.trim() };
  if (avatarFile) registro.avatar_url = await subirAvatar(avatarFile, auth.user.id);
  if (capaFile) registro.capa_url = await subirCapa(capaFile, auth.user.id);
  if (bio !== undefined) registro.bio = bio.trim().slice(0, LIMITE_BIO) || null;

  const { data, error } = await supabase.from('profiles').update(registro).eq('user_id', auth.user.id).select().single();
  if (error) throw new Error(mensagemPerfil(error));
  return data as Perfil;
}

export function mensagemPerfil(erro: unknown): string {
  return traduzErroSupabase(erro, (codigo) => {
    if (codigo === '23505') return 'Esse apelido já está em uso — escolha outro.';
    return null;
  }, 'sql/09-comunidade.sql');
}
