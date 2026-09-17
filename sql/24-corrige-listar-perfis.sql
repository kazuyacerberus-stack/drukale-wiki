-- DRUKALE / CORRIGE "drk_admin_listar_perfis". Execute no SQL Editor do
-- Supabase, depois de sql/22 e sql/23.
--
-- O painel deu "FALHA :: structure of query does not match function
-- result type" ao carregar a lista de contas. Isso é um erro do Postgres
-- disparado *dentro* da função: a query do "return query" não bate
-- exatamente com os tipos declarados no "returns table(...)" — mesmo a
-- função tendo sido criada sem erro (esse tipo de checagem só acontece
-- quando a função roda de verdade). Provavelmente algum tipo (como o
-- e-mail, que vem de auth.users e não é uma tabela nossa) não é
-- exatamente o que eu esperava. Em vez de adivinhar, este arquivo refaz
-- a função convertendo cada coluna explicitamente para o tipo declarado
-- (::uuid, ::text, etc.) — isso elimina qualquer ambiguidade de tipo.
begin;

drop function if exists public.drk_admin_listar_perfis() cascade;

create function public.drk_admin_listar_perfis()
returns table(user_id uuid, email text, apelido text, avatar_url text, muted_until timestamptz, banido boolean, status_conta text, motivo_reprovacao text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.drk_e_admin() then
    raise exception 'Apenas o administrador pode ver esta lista.';
  end if;
  return query
    select
      p.user_id::uuid,
      u.email::text,
      p.apelido::text,
      p.avatar_url::text,
      p.muted_until::timestamptz,
      p.banido::boolean,
      p.status_conta::text,
      p.motivo_reprovacao::text,
      p.created_at::timestamptz
    from public.profiles p
    join auth.users u on u.id = p.user_id
    order by p.created_at desc;
end $$;
revoke all on function public.drk_admin_listar_perfis() from public;
grant execute on function public.drk_admin_listar_perfis() to authenticated;

commit;
