-- DRUKALE / APROVAÇÃO DE CONTEÚDO. Execute o arquivo INTEIRO no SQL
-- Editor do Supabase. Deixa qualquer conta registrada enviar ficha de
-- personagem e evento para a linha do tempo — mas como pendente, até o
-- administrador aprovar ou reprovar (com um motivo). Não apaga nem
-- muda nada do que já está publicado: todo registro existente vira
-- "aprovado" por padrão. A tabela "locais" (mapa do mundo) continua
-- 100% exclusiva do administrador — não é tocada aqui.
begin;

-- ------------------------------------------------------------
-- 1) COLUNAS NOVAS
-- ------------------------------------------------------------

alter table public.characters add column if not exists user_id uuid references auth.users(id);
alter table public.characters add column if not exists status_aprovacao text not null default 'aprovado'
  check (status_aprovacao in ('pendente','aprovado','reprovado'));
alter table public.characters add column if not exists motivo_reprovacao text;

alter table public.eventos add column if not exists user_id uuid references auth.users(id);
alter table public.eventos add column if not exists status_aprovacao text not null default 'aprovado'
  check (status_aprovacao in ('pendente','aprovado','reprovado'));
alter table public.eventos add column if not exists motivo_reprovacao text;


-- ------------------------------------------------------------
-- 2) CHARACTERS — só troca a política restritiva desta tabela;
--    "locais" usa o mesmo nome de política mas é outra tabela, fica
--    intocada.
-- ------------------------------------------------------------

drop policy if exists drk_so_admin_insert on public.characters;
create policy drk_so_admin_insert on public.characters as restrictive for insert to public
  with check (
    public.drk_e_admin() or (
      user_id = (select auth.uid()) and status_aprovacao = 'pendente'
      and not exists (
        select 1 from public.profiles p
        where p.user_id = (select auth.uid())
          and (p.banido or (p.muted_until is not null and p.muted_until > now()))
      )
    )
  );

drop policy if exists drk_so_admin_update on public.characters;
create policy drk_so_admin_update on public.characters as restrictive for update to public
  using (public.drk_e_admin() or (user_id = (select auth.uid()) and status_aprovacao in ('pendente','reprovado')))
  with check (public.drk_e_admin() or (user_id = (select auth.uid()) and status_aprovacao = 'pendente'));

drop policy if exists drk_so_admin_delete on public.characters;
create policy drk_so_admin_delete on public.characters as restrictive for delete to public
  using (public.drk_e_admin() or (user_id = (select auth.uid()) and status_aprovacao in ('pendente','reprovado')));


-- ------------------------------------------------------------
-- 3) EVENTOS — políticas de escrita eram permissivas simples,
--    sem camada restritiva por cima; reescreve direto.
-- ------------------------------------------------------------

drop policy if exists drk_eventos_criar on public.eventos;
create policy drk_eventos_criar on public.eventos for insert to authenticated
  with check (
    public.drk_e_admin() or (
      user_id = (select auth.uid()) and status_aprovacao = 'pendente'
      and not exists (
        select 1 from public.profiles p
        where p.user_id = (select auth.uid())
          and (p.banido or (p.muted_until is not null and p.muted_until > now()))
      )
    )
  );

drop policy if exists drk_eventos_editar on public.eventos;
create policy drk_eventos_editar on public.eventos for update to authenticated
  using (public.drk_e_admin() or (user_id = (select auth.uid()) and status_aprovacao in ('pendente','reprovado')))
  with check (public.drk_e_admin() or (user_id = (select auth.uid()) and status_aprovacao = 'pendente'));

drop policy if exists drk_eventos_apagar on public.eventos;
create policy drk_eventos_apagar on public.eventos for delete to authenticated
  using (public.drk_e_admin() or (user_id = (select auth.uid()) and status_aprovacao in ('pendente','reprovado')));


-- ------------------------------------------------------------
-- 4) APROVAR / REPROVAR — só o administrador chama
-- ------------------------------------------------------------

create or replace function public.drk_aprovar_personagem(alvo_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.drk_e_admin() then
    raise exception 'Apenas o administrador pode aprovar fichas.';
  end if;
  update public.characters set status_aprovacao = 'aprovado', motivo_reprovacao = null where id::text = alvo_id::text;
end $$;
revoke all on function public.drk_aprovar_personagem(uuid) from public;
grant execute on function public.drk_aprovar_personagem(uuid) to authenticated;

create or replace function public.drk_reprovar_personagem(alvo_id uuid, motivo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.drk_e_admin() then
    raise exception 'Apenas o administrador pode reprovar fichas.';
  end if;
  if length(btrim(coalesce(motivo,''))) < 3 then
    raise exception 'Escreva o motivo da reprovação.';
  end if;
  update public.characters set status_aprovacao = 'reprovado', motivo_reprovacao = btrim(motivo) where id::text = alvo_id::text;
end $$;
revoke all on function public.drk_reprovar_personagem(uuid, text) from public;
grant execute on function public.drk_reprovar_personagem(uuid, text) to authenticated;

create or replace function public.drk_aprovar_evento(alvo_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.drk_e_admin() then
    raise exception 'Apenas o administrador pode aprovar eventos.';
  end if;
  update public.eventos set status_aprovacao = 'aprovado', motivo_reprovacao = null where id = alvo_id;
end $$;
revoke all on function public.drk_aprovar_evento(uuid) from public;
grant execute on function public.drk_aprovar_evento(uuid) to authenticated;

create or replace function public.drk_reprovar_evento(alvo_id uuid, motivo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.drk_e_admin() then
    raise exception 'Apenas o administrador pode reprovar eventos.';
  end if;
  if length(btrim(coalesce(motivo,''))) < 3 then
    raise exception 'Escreva o motivo da reprovação.';
  end if;
  update public.eventos set status_aprovacao = 'reprovado', motivo_reprovacao = btrim(motivo) where id = alvo_id;
end $$;
revoke all on function public.drk_reprovar_evento(uuid, text) from public;
grant execute on function public.drk_reprovar_evento(uuid, text) to authenticated;

commit;

-- Verificação: deve rodar sem erro. Mostra as colunas novas e confirma
-- que todo o conteúdo existente já está como "aprovado".
select status_aprovacao, count(*) from public.characters group by status_aprovacao;
select status_aprovacao, count(*) from public.eventos group by status_aprovacao;
