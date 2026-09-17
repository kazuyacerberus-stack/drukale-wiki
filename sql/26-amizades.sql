-- DRUKALE / AMIZADES. Execute o arquivo INTEIRO no SQL Editor do Supabase.
-- Pedir/aceitar/recusar/desfazer amizade entre contas aprovadas. Tudo por
-- RPC (nunca insert/update/delete direto na tabela) pra não deixar pedido
-- duplicado ou cruzado escapar: aceitar grava a amizade nos DOIS sentidos
-- (A→B e B→A, ambas 'aceita'), então checar "somos amigos?" em qualquer
-- lugar do site é só uma consulta num sentido só.
begin;

create table if not exists public.amizades (
  solicitante uuid not null references auth.users(id),
  destinatario uuid not null references auth.users(id),
  status text not null default 'pendente' check (status in ('pendente','aceita')),
  created_at timestamptz not null default now(),
  primary key (solicitante, destinatario),
  constraint amizades_nao_consigo_mesmo check (solicitante <> destinatario)
);
create index if not exists amizades_por_destinatario on public.amizades(destinatario, status);

alter table public.amizades enable row level security;
revoke all on public.amizades from anon, authenticated;
grant select on public.amizades to authenticated;

drop policy if exists drk_amizades_ler on public.amizades;
create policy drk_amizades_ler on public.amizades for select to authenticated
  using (solicitante = (select auth.uid()) or destinatario = (select auth.uid()) or public.drk_e_admin());


-- ------------------------------------------------------------
-- RPCs — única porta de entrada pra mexer em amizades
-- ------------------------------------------------------------

create or replace function public.drk_conta_pode_agir() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.drk_conta_aprovada() and not exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and (p.banido or (p.muted_until is not null and p.muted_until > now()))
  );
$$;
revoke all on function public.drk_conta_pode_agir() from public;
grant execute on function public.drk_conta_pode_agir() to authenticated;

create or replace function public.drk_pedir_amizade(alvo uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare eu uuid := auth.uid();
begin
  if not public.drk_conta_pode_agir() then
    raise exception 'Sua conta não pode fazer isso agora.';
  end if;
  if alvo = eu then
    raise exception 'Não dá pra adicionar a si mesmo.';
  end if;

  -- se o alvo já me pediu antes, isso é uma aceitação, não um pedido novo
  if exists (select 1 from public.amizades where solicitante = alvo and destinatario = eu and status = 'pendente') then
    update public.amizades set status = 'aceita' where solicitante = alvo and destinatario = eu;
    insert into public.amizades (solicitante, destinatario, status) values (eu, alvo, 'aceita')
      on conflict (solicitante, destinatario) do update set status = 'aceita';
    return;
  end if;

  insert into public.amizades (solicitante, destinatario, status) values (eu, alvo, 'pendente')
    on conflict (solicitante, destinatario) do nothing;
end $$;
revoke all on function public.drk_pedir_amizade(uuid) from public;
grant execute on function public.drk_pedir_amizade(uuid) to authenticated;

create or replace function public.drk_aceitar_amizade(de uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare eu uuid := auth.uid();
begin
  if not exists (select 1 from public.amizades where solicitante = de and destinatario = eu and status = 'pendente') then
    raise exception 'Não há pedido pendente dessa conta.';
  end if;
  update public.amizades set status = 'aceita' where solicitante = de and destinatario = eu;
  insert into public.amizades (solicitante, destinatario, status) values (eu, de, 'aceita')
    on conflict (solicitante, destinatario) do update set status = 'aceita';
end $$;
revoke all on function public.drk_aceitar_amizade(uuid) from public;
grant execute on function public.drk_aceitar_amizade(uuid) to authenticated;

create or replace function public.drk_recusar_amizade(de uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.amizades where solicitante = de and destinatario = auth.uid() and status = 'pendente';
end $$;
revoke all on function public.drk_recusar_amizade(uuid) from public;
grant execute on function public.drk_recusar_amizade(uuid) to authenticated;

create or replace function public.drk_desfazer_amizade(de uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare eu uuid := auth.uid();
begin
  delete from public.amizades where (solicitante = eu and destinatario = de) or (solicitante = de and destinatario = eu);
end $$;
revoke all on function public.drk_desfazer_amizade(uuid) from public;
grant execute on function public.drk_desfazer_amizade(uuid) to authenticated;

commit;
