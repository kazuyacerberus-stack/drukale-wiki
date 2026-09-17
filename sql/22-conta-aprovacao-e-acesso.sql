-- DRUKALE / APROVAÇÃO DE CONTA + FECHAR O SITE. Execute o arquivo INTEIRO
-- no SQL Editor do Supabase, DEPOIS de sql/21-novidades.sql.
--
-- Isto MUDA o comportamento público do site: antes, qualquer visitante
-- conseguia LER a wiki sem conta (só postar exigia login). A partir daqui,
-- só quem tem conta aprovada pelo administrador consegue ver qualquer
-- coisa além da página inicial. Cadastro deixa de liberar acesso na hora:
-- toda conta nova nasce "pendente" e só funciona depois que o
-- administrador aprovar pelo painel (/admin).
--
-- Ninguém que já tinha conta antes desta migração perde acesso — o
-- "update" logo abaixo aprova automaticamente todo mundo que já existia.
begin;

-- ------------------------------------------------------------
-- 1) STATUS DA CONTA
-- ------------------------------------------------------------

alter table public.profiles add column if not exists status_conta text not null default 'pendente'
  check (status_conta in ('pendente','aprovado','reprovado'));
alter table public.profiles add column if not exists motivo_reprovacao text;

-- contas que já existiam continuam acessando tudo normalmente
update public.profiles set status_conta = 'aprovado' where status_conta = 'pendente';

create or replace function public.drk_conta_aprovada() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.profiles
    where user_id = (select auth.uid()) and status_conta = 'aprovado'
  );
$$;
revoke all on function public.drk_conta_aprovada() from public;
grant execute on function public.drk_conta_aprovada() to authenticated;


-- ------------------------------------------------------------
-- 2) FECHAR A LEITURA — só quem tem conta aprovada (ou é admin) lê
-- ------------------------------------------------------------

-- characters (nunca teve "revoke all" — depende só da política de RLS)
drop policy if exists "drk_ler_publico" on public.characters;
create policy "drk_ler_publico" on public.characters for select to authenticated
  using (public.drk_e_admin() or public.drk_conta_aprovada());
revoke select on public.characters from anon;

-- locais (mapa do mundo)
drop policy if exists "drk_local_ler_publico" on public.locais;
create policy "drk_local_ler_publico" on public.locais for select to authenticated
  using (public.drk_e_admin() or public.drk_conta_aprovada());
revoke select on public.locais from anon;

-- cenas
drop policy if exists drk_cenas_ler on public.cenas;
create policy drk_cenas_ler on public.cenas for select to authenticated
  using (public.drk_e_admin() or public.drk_conta_aprovada());
revoke select on public.cenas from anon;

-- faccoes
drop policy if exists drk_faccoes_ler on public.faccoes;
create policy drk_faccoes_ler on public.faccoes for select to authenticated
  using (public.drk_e_admin() or public.drk_conta_aprovada());
revoke select on public.faccoes from anon;

-- eventos (linha do tempo)
drop policy if exists drk_eventos_ler on public.eventos;
create policy drk_eventos_ler on public.eventos for select to authenticated
  using (public.drk_e_admin() or public.drk_conta_aprovada());
revoke select on public.eventos from anon;

-- glossario
drop policy if exists drk_glossario_ler on public.glossario;
create policy drk_glossario_ler on public.glossario for select to authenticated
  using (public.drk_e_admin() or public.drk_conta_aprovada());
revoke select on public.glossario from anon;

-- novidades (mural "eventos" novo, sql/21) — já nasceu "to authenticated",
-- só falta adicionar a checagem de aprovação
drop policy if exists drk_novidades_ler on public.novidades;
create policy drk_novidades_ler on public.novidades for select to authenticated
  using (public.drk_e_admin() or public.drk_conta_aprovada());


-- ------------------------------------------------------------
-- 3) FECHAR OS BUCKETS DE IMAGEM PÚBLICOS
-- ------------------------------------------------------------

drop policy if exists "drk_img_ler_publico" on storage.objects;
create policy "drk_img_ler_publico" on storage.objects for select to authenticated
  using (bucket_id = 'Characters' and (public.drk_e_admin() or public.drk_conta_aprovada()));

drop policy if exists "drk_faccoes_img_ler" on storage.objects;
create policy "drk_faccoes_img_ler" on storage.objects for select to authenticated
  using (bucket_id = 'faccoes' and (public.drk_e_admin() or public.drk_conta_aprovada()));

drop policy if exists "drk_glossario_img_ler" on storage.objects;
create policy "drk_glossario_img_ler" on storage.objects for select to authenticated
  using (bucket_id = 'glossario' and (public.drk_e_admin() or public.drk_conta_aprovada()));

drop policy if exists "drk_eventos_img_ler" on storage.objects;
create policy "drk_eventos_img_ler" on storage.objects for select to authenticated
  using (bucket_id = 'eventos' and (public.drk_e_admin() or public.drk_conta_aprovada()));


-- ------------------------------------------------------------
-- 4) FECHAR A ESCRITA — conta pendente/reprovada não posta em lugar
--    nenhum, mesmo logada (senão ela escreveria sem conseguir ler)
-- ------------------------------------------------------------

drop policy if exists drk_so_admin_insert on public.characters;
create policy drk_so_admin_insert on public.characters as restrictive for insert to public
  with check (
    public.drk_e_admin() or (
      user_id = (select auth.uid()) and status_aprovacao = 'pendente'
      and public.drk_conta_aprovada()
      and not exists (
        select 1 from public.profiles p
        where p.user_id = (select auth.uid())
          and (p.banido or (p.muted_until is not null and p.muted_until > now()))
      )
    )
  );

drop policy if exists drk_eventos_criar on public.eventos;
create policy drk_eventos_criar on public.eventos for insert to authenticated
  with check (
    public.drk_e_admin() or (
      user_id = (select auth.uid()) and status_aprovacao = 'pendente'
      and public.drk_conta_aprovada()
      and not exists (
        select 1 from public.profiles p
        where p.user_id = (select auth.uid())
          and (p.banido or (p.muted_until is not null and p.muted_until > now()))
      )
    )
  );

drop policy if exists drk_cenas_criar on public.cenas;
create policy drk_cenas_criar on public.cenas for insert to authenticated
  with check (user_id = (select auth.uid()) and public.drk_conta_aprovada());

drop policy if exists drk_novidades_criar on public.novidades;
create policy drk_novidades_criar on public.novidades for insert to authenticated
  with check (user_id = (select auth.uid()) and public.drk_conta_aprovada());

drop policy if exists drk_chat_escrever on public.chat_mensagens;
create policy drk_chat_escrever on public.chat_mensagens for insert to authenticated with check (
  user_id = (select auth.uid())
  and public.drk_conta_aprovada()
  and not exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and (p.banido or (p.muted_until is not null and p.muted_until > now()))
  )
);


-- ------------------------------------------------------------
-- 4b) LISTAR PERFIS (admin) — agora também traz o status da conta
-- ------------------------------------------------------------

-- "create or replace" não pode mudar o tipo de retorno de uma função que
-- já existe (a de baixo ganhou duas colunas novas) — por isso o drop antes.
drop function if exists public.drk_admin_listar_perfis();
create function public.drk_admin_listar_perfis()
returns table(user_id uuid, email text, apelido text, avatar_url text, muted_until timestamptz, banido boolean, status_conta text, motivo_reprovacao text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.drk_e_admin() then
    raise exception 'Apenas o administrador pode ver esta lista.';
  end if;
  return query
    select p.user_id, u.email, p.apelido, p.avatar_url, p.muted_until, p.banido, p.status_conta, p.motivo_reprovacao, p.created_at
    from public.profiles p join auth.users u on u.id = p.user_id
    order by p.created_at desc;
end $$;
revoke all on function public.drk_admin_listar_perfis() from public;
grant execute on function public.drk_admin_listar_perfis() to authenticated;


-- ------------------------------------------------------------
-- 5) APROVAR / REPROVAR CONTA — só o administrador chama
-- ------------------------------------------------------------

create or replace function public.drk_aprovar_conta(alvo uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.drk_e_admin() then
    raise exception 'Apenas o administrador pode aprovar contas.';
  end if;
  update public.profiles set status_conta = 'aprovado', motivo_reprovacao = null where user_id = alvo;
end $$;
revoke all on function public.drk_aprovar_conta(uuid) from public;
grant execute on function public.drk_aprovar_conta(uuid) to authenticated;

create or replace function public.drk_reprovar_conta(alvo uuid, motivo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.drk_e_admin() then
    raise exception 'Apenas o administrador pode reprovar contas.';
  end if;
  if length(btrim(coalesce(motivo,''))) < 3 then
    raise exception 'Escreva o motivo da reprovação.';
  end if;
  update public.profiles set status_conta = 'reprovado', motivo_reprovacao = btrim(motivo) where user_id = alvo;
end $$;
revoke all on function public.drk_reprovar_conta(uuid, text) from public;
grant execute on function public.drk_reprovar_conta(uuid, text) to authenticated;


-- ------------------------------------------------------------
-- 6) PAINEL DO GAME MASTER — números de visão geral
-- ------------------------------------------------------------

create or replace function public.drk_painel_resumo() returns json
language plpgsql security definer set search_path = '' as $$
begin
  if not public.drk_e_admin() then
    raise exception 'Apenas o administrador pode ver o painel.';
  end if;
  return json_build_object(
    'contas_pendentes', (select count(*) from public.profiles where status_conta = 'pendente'),
    'contas_aprovadas', (select count(*) from public.profiles where status_conta = 'aprovado'),
    'fichas_pendentes', (select count(*) from public.characters where status_aprovacao = 'pendente'),
    'eventos_pendentes', (select count(*) from public.eventos where status_aprovacao = 'pendente'),
    'banidos', (select count(*) from public.profiles where banido)
  );
end $$;
revoke all on function public.drk_painel_resumo() from public;
grant execute on function public.drk_painel_resumo() to authenticated;

commit;

-- Verificação: deve rodar sem erro. A primeira consulta mostra quantas
-- contas ficaram "pendente" (deve ser 0 — todo mundo que já existia foi
-- aprovado automaticamente) vs "aprovado".
select status_conta, count(*) from public.profiles group by status_conta;
