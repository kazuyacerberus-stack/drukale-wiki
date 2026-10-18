-- ============================================================
-- TERRA SAVE // PORTAS ABERTAS
--
-- Execute o arquivo INTEIRO no SQL Editor do Supabase, depois do
-- sql/42 e do sql/43. ANTES, ligue em Authentication → Sign In /
-- Providers a opção "Allow anonymous sign-ins" (ver PUBLICAR.md ou a
-- conversa com o Claude) — sem ela, quem não tem conta continua só lendo.
--
-- O que muda:
--   * todo visitante ganha, sozinho e sem perceber, uma conta invisível
--     ("anônima") no navegador dele. Isso dá a ele as MESMAS permissões
--     que o administrador tinha: criar, editar e apagar qualquer coisa
--     (fichas, cenas, facções, mapa, regras, eventos, crônicas...);
--   * tudo entra já APROVADO — não existe mais fila de análise;
--   * toda conta passa a ser "aprovada" (acaba o "aguardando aprovação").
--
-- O que continua só do GM (a conta cadastrada em drukale_admins):
--   * ver o e-mail dos jogadores (dado pessoal deles);
--   * expulsar e silenciar — para você ainda conseguir parar alguém
--     que estiver apagando ou sujando o site. Quem for expulso ou
--     silenciado perde as permissões abertas.
--
-- O que continua privado: posts de perfil "amigos"/"personalizado" e a
-- lista de amizades de cada um.
--
-- CÓPIA DE SEGURANÇA: o passo 0 copia todas as tabelas do site para o
-- esquema "backup_portas_abertas" (fora do alcance do site). Se alguém
-- apagar tudo, os dados de HOJE podem ser recuperados de lá.
--
-- Para DESFAZER: rode de novo, nesta ordem, os arquivos
-- sql/08, 22, 23 e 39 (eles recriam as regras antigas) e apague o
-- gatilho com:  drop trigger ... (veja o fim deste arquivo).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 0) CÓPIA DE SEGURANÇA de todas as tabelas do site
-- ------------------------------------------------------------
create schema if not exists backup_portas_abertas;
revoke all on schema backup_portas_abertas from anon, authenticated;

do $$
declare t record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('drop table if exists backup_portas_abertas.%I', t.tablename);
    execute format('create table backup_portas_abertas.%I as table public.%I', t.tablename, t.tablename);
  end loop;
end $$;


-- ------------------------------------------------------------
-- 1) O GM DE VERDADE ganha uma função própria (o que era drk_e_admin)
-- ------------------------------------------------------------
create or replace function public.drk_e_gm() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.drukale_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.drk_e_gm() from public;
grant execute on function public.drk_e_gm() to anon, authenticated;


-- ------------------------------------------------------------
-- 2) O que precisa continuar só do GM passa a usar drk_e_gm
--    (feito ANTES de abrir o drk_e_admin, para não haver brecha)
-- ------------------------------------------------------------

-- 2a) expulsar, silenciar e quem pode ver post privado
do $$
declare
  f record;
  def text;
begin
  for f in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('drk_expulsar_usuario', 'drk_silenciar_usuario', 'drk_posso_ver_post')
  loop
    def := pg_get_functiondef(f.oid);
    execute replace(def, 'drk_e_admin(', 'drk_e_gm(');
  end loop;
end $$;

-- 2b) lista de contas: todos veem a lista (o painel abre para todos),
--     mas o E-MAIL só aparece para o GM
drop function if exists public.drk_admin_listar_perfis() cascade;
create function public.drk_admin_listar_perfis()
returns table(user_id uuid, email text, apelido text, avatar_url text, muted_until timestamptz, banido boolean, status_conta text, motivo_reprovacao text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query
    select
      p.user_id::uuid,
      (case when public.drk_e_gm() then u.email::text else null end),
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

-- 2c) leitura de posts privados, audiência e amizades: refaz as regras
--     de LEITURA trocando drk_e_admin por drk_e_gm
do $$
declare
  pol record;
  papeis text;
begin
  for pol in
    select * from pg_policies
    where schemaname = 'public'
      and tablename in ('perfil_posts', 'perfil_post_audiencia', 'amizades')
      and cmd = 'SELECT'
      and qual like '%drk_e_admin(%'
  loop
    select string_agg(quote_ident(r), ', ') into papeis from unnest(pol.roles) as r;
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
    execute format('create policy %I on public.%I as %s for select to %s using (%s)',
      pol.policyname, pol.tablename, pol.permissive, papeis,
      replace(pol.qual, 'drk_e_admin(', 'drk_e_gm('));
  end loop;
end $$;


-- ------------------------------------------------------------
-- 3) ABRE AS PORTAS: qualquer pessoa com sessão (inclusive a conta
--    invisível do visitante) passa em toda checagem de "administrador",
--    a menos que o GM a tenha expulsado ou silenciado
-- ------------------------------------------------------------
create or replace function public.drk_e_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select
    exists (select 1 from public.drukale_admins where user_id = (select auth.uid()))
    or (
      (select auth.uid()) is not null
      and not exists (
        select 1 from public.profiles p
        where p.user_id = (select auth.uid())
          and (p.banido or (p.muted_until is not null and p.muted_until > now()))
      )
    );
$$;

-- toda conta conta como aprovada
create or replace function public.drk_conta_aprovada() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null;
$$;

alter table public.profiles alter column status_conta set default 'aprovado';
update public.profiles
  set status_conta = 'aprovado', motivo_reprovacao = null
  where status_conta <> 'aprovado';


-- ------------------------------------------------------------
-- 4) SEM FILA DE ANÁLISE: tudo que entra já entra aprovado,
--    e o que estava esperando é aprovado agora
-- ------------------------------------------------------------
create or replace function public.drk_auto_aprovar() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.status_aprovacao := 'aprovado';
  new.motivo_reprovacao := null;
  return new;
end $$;

do $$
declare tabela text;
begin
  foreach tabela in array array['characters', 'eventos', 'faccoes', 'locais'] loop
    execute format('drop trigger if exists drk_auto_aprovar on public.%I', tabela);
    execute format('create trigger drk_auto_aprovar before insert on public.%I
                    for each row execute function public.drk_auto_aprovar()', tabela);
    execute format('update public.%I set status_aprovacao = ''aprovado'', motivo_reprovacao = null
                    where status_aprovacao = ''pendente''', tabela);
  end loop;
end $$;

commit;


-- ------------------------------------------------------------
-- CONFERÊNCIA
-- ------------------------------------------------------------
select
  (select count(*) from information_schema.tables where table_schema = 'backup_portas_abertas') as tabelas_copiadas,
  to_regprocedure('public.drk_e_gm()') is not null as gm_separado,
  (select count(*) from public.profiles where status_conta <> 'aprovado') as contas_nao_aprovadas_deve_ser_0;

-- PARA DESFAZER SÓ A APROVAÇÃO AUTOMÁTICA (voltar a ter fila):
--   drop trigger drk_auto_aprovar on public.characters;
--   drop trigger drk_auto_aprovar on public.eventos;
--   drop trigger drk_auto_aprovar on public.faccoes;
--   drop trigger drk_auto_aprovar on public.locais;
