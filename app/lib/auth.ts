'use client';

import { supabase } from './db';

/**
 * Devolve o token da sessão atual, ou null se ninguém estiver logado.
 * É este token que o navegador manda para a API, e é por ele que o
 * Supabase sabe que a escrita é permitida.
 */
export async function tokenAtual(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Cabeçalho pronto para colocar no fetch. */
export async function cabecalhoAuth(): Promise<Record<string, string>> {
  const token = await tokenAtual();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function entrar(email: string, senha: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw new Error(traduz(error.message));
}

/**
 * Cria uma conta nova.
 *
 * O terceiro argumento é opcional e vai para os metadados do usuário
 * no Supabase — é por onde passam coisas como apelido, que a tela de
 * cadastro pode querer guardar já na criação.
 *
 * Devolve o que o Supabase devolveu (`user` e `session`), para quem
 * chamou poder seguir direto com o perfil. Quando a confirmação por
 * e-mail está ligada no projeto, `session` vem nula e a pessoa só
 * entra depois de clicar no link — isso é decisão do Supabase, não
 * daqui.
 */
export async function cadastrar(
  email: string,
  senha: string,
  extras?: Record<string, unknown>,
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    ...(extras ? { options: { data: extras } } : {}),
  });
  if (error) throw new Error(traduz(error.message));
  return data;
}

export async function sair() {
  await supabase.auth.signOut();
}

/** Mensagens do Supabase vêm em inglês; as mais comuns viram português. */
function traduz(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos';
  if (m.includes('email not confirmed')) return 'E-mail ainda não confirmado';
  if (m.includes('too many requests') || m.includes('rate limit'))
    return 'Tentativas demais — espere um minuto';
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'Sem conexão com o servidor';
  return msg;
}
