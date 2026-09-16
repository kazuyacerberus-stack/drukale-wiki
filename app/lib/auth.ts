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
 * Cria a conta. Devolve `true` se já veio com sessão ativa (login
 * automático), ou `false` se o Supabase exige confirmar o e-mail antes.
 */
export async function cadastrar(email: string, senha: string): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({ email, password: senha });
  if (error) throw new Error(traduz(error.message));
  return Boolean(data.session);
}

export async function sair() {
  await supabase.auth.signOut();
}

/** Mensagens do Supabase vêm em inglês; as mais comuns viram português. */
function traduz(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos';
  if (m.includes('email not confirmed')) return 'E-mail ainda não confirmado';
  if (m.includes('user already registered') || m.includes('already registered'))
    return 'Já existe uma conta com este e-mail';
  if (m.includes('password') && (m.includes('short') || m.includes('at least')))
    return 'A senha é curta demais';
  if (m.includes('too many requests') || m.includes('rate limit'))
    return 'Tentativas demais — espere um minuto';
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'Sem conexão com o servidor';
  return msg;
}
