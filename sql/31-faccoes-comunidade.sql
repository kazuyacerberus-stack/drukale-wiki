-- DRUKALE / FACÇÕES POR JOGADOR + FILIAÇÃO. Execute o arquivo INTEIRO no
-- SQL Editor do Supabase. Facção deixa de ser exclusiva do admin: qualquer
-- conta aprovada pode propor uma, que fica pendente até o game master
-- aprovar (mesmo molde de ficha/crônica). Depois de aprovada, quem criou
-- vira o "líder": convida gente direto, ou aceita pedidos de quem
-- solicitou entrar. No máximo uma facção aceita por pessoa por vez.
begin;

-- ------------------------------------------------------------
-- 1) APROVAÇÃO DE FACÇÃO — mesmo padrão de characters/eventos
-- ------------------------------------------------------------

alter table public.faccoes add column if not exists user_id uuid references auth.users(id);
alter table public.faccoes add column if not exists status_aprovacao text not null default 'aprovado'
  check (status_aprovacao in ('pendente','aprovado','reprovado'));
alter table public.faccoes add column if not exists motivo_reprovacao text;

drop policy if exists drk_faccoes_criar on public.faccoes;
create policy drk_faccoes_criar on public.faccoes for insert to authenticated with check (
  public.drk_e_admin() or (
    user_id = (select auth.uid()) and status_aprovacao = 'pendente' and public.drk_conta_pode_agir()
  )
);

drop policy if exists drk_faccoes_editar on public.faccoes;
create policy drk_faccoes_editar on public.faccoes for update to authenticated
  using (public.drk_e_admin() or (user_id = (select auth.uid()) and status_aprovacao in ('pendente','reprovado')))
  with check (public.drk_e_admin() or (user_id = (select auth.uid()) and status_aprovacao = 'pendente' and public.drk_conta_pode_agir()));

drop policy if exists drk_faccoes_apagar on public.faccoes;
create policy drk_faccoes_apagar on public.faccoes for delete to authenticated
  using (public.drk_e_admin() or (user_id = (select auth.uid()) and status_aprovacao in ('pendente','reprovado')));

create or replace function public.drk_aprovar_faccao(alvo_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.drk_e_admin() then
    raise exception 'Apenas o administrador pode aprovar facções.';
  end if;
  update public.faccoes set status_aprovacao = 'aprovado', motivo_reprovacao = null where id = alvo_id;
end $$;
revoke all on function public.drk_aprovar_faccao(uuid) from public;
grant execute on function public.drk_aprovar_faccao(uuid) to authenticated;

create or replace function public.drk_reprovar_faccao(alvo_id uuid, motivo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.drk_e_admin() then
    raise exception 'Apenas o administrador pode reprovar facções.';
  end if;
  if length(btrim(coalesce(motivo,''))) < 3 then
    raise exception 'Escreva o motivo da reprovação.';
  end if;
  update public.faccoes set status_aprovacao = 'reprovado', motivo_reprovacao = btrim(motivo) where id = alvo_id;
end $$;
revoke all on function public.drk_reprovar_faccao(uuid, text) from public;
grant execute on function public.drk_reprovar_faccao(uuid, text) to authenticated;


-- ------------------------------------------------------------
-- 2) FILIAÇÃO — no máximo uma facção "aceita" por pessoa
-- ------------------------------------------------------------

create table if not exists public.faccao_membros (
  faccao_id uuid not null references public.faccoes(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  status text not null check (status in ('pendente','aceito')),
  created_at timestamptz not null default now(),
  primary key (faccao_id, user_id)
);
create unique index if not exists faccao_membros_uma_aceita on public.faccao_membros(user_id) where status = 'aceito';

alter table public.faccao_membros enable row level security;
revoke all on public.faccao_membros from anon, authenticated;
grant select on public.faccao_membros to authenticated;

drop policy if exists drk_faccao_membros_ler on public.faccao_membros;
create policy drk_faccao_membros_ler on public.faccao_membros for select to authenticated using (
  public.drk_e_admin()
  or user_id = (select auth.uid())
  or exists (select 1 from public.faccoes f where f.id = faccao_membros.faccao_id and f.user_id = (select auth.uid()))
  or (status = 'aceito' and public.drk_conta_aprovada())
);

-- sem insert/update/delete direto — só pelas RPCs abaixo

create or replace function public.drk_solicitar_faccao(alvo_faccao uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.drk_conta_pode_agir() then
    raise exception 'Sua conta não pode fazer isso agora.';
  end if;
  insert into public.faccao_membros (faccao_id, user_id, status)
    values (alvo_faccao, auth.uid(), 'pendente')
    on conflict (faccao_id, user_id) do nothing;
end $$;
revoke all on function public.drk_solicitar_faccao(uuid) from public;
grant execute on function public.drk_solicitar_faccao(uuid) to authenticated;

create or replace function public.drk_convidar_para_faccao(alvo_faccao uuid, alvo_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (public.drk_e_admin() or exists (select 1 from public.faccoes f where f.id = alvo_faccao and f.user_id = auth.uid())) then
    raise exception 'Só o líder da facção pode convidar.';
  end if;
  delete from public.faccao_membros where user_id = alvo_user and status = 'aceito';
  insert into public.faccao_membros (faccao_id, user_id, status)
    values (alvo_faccao, alvo_user, 'aceito')
    on conflict (faccao_id, user_id) do update set status = 'aceito';
end $$;
revoke all on function public.drk_convidar_para_faccao(uuid, uuid) from public;
grant execute on function public.drk_convidar_para_faccao(uuid, uuid) to authenticated;

create or replace function public.drk_aceitar_membro(alvo_faccao uuid, alvo_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (public.drk_e_admin() or exists (select 1 from public.faccoes f where f.id = alvo_faccao and f.user_id = auth.uid())) then
    raise exception 'Só o líder da facção pode aceitar pedidos.';
  end if;
  if not exists (select 1 from public.faccao_membros where faccao_id = alvo_faccao and user_id = alvo_user and status = 'pendente') then
    raise exception 'Não há pedido pendente dessa conta.';
  end if;
  delete from public.faccao_membros where user_id = alvo_user and status = 'aceito';
  update public.faccao_membros set status = 'aceito' where faccao_id = alvo_faccao and user_id = alvo_user;
end $$;
revoke all on function public.drk_aceitar_membro(uuid, uuid) from public;
grant execute on function public.drk_aceitar_membro(uuid, uuid) to authenticated;

create or replace function public.drk_recusar_membro(alvo_faccao uuid, alvo_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (public.drk_e_admin() or exists (select 1 from public.faccoes f where f.id = alvo_faccao and f.user_id = auth.uid())) then
    raise exception 'Só o líder da facção pode recusar pedidos.';
  end if;
  delete from public.faccao_membros where faccao_id = alvo_faccao and user_id = alvo_user and status = 'pendente';
end $$;
revoke all on function public.drk_recusar_membro(uuid, uuid) from public;
grant execute on function public.drk_recusar_membro(uuid, uuid) to authenticated;

create or replace function public.drk_sair_faccao(alvo_faccao uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.faccao_membros where faccao_id = alvo_faccao and user_id = auth.uid();
end $$;
revoke all on function public.drk_sair_faccao(uuid) from public;
grant execute on function public.drk_sair_faccao(uuid) to authenticated;

commit;
