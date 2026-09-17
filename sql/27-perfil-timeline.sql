-- DRUKALE / PERFIL-TIMELINE. Execute o arquivo INTEIRO no SQL Editor do
-- Supabase, depois de sql/26-amizades.sql. Posts no próprio perfil, com
-- controle de quem vê: público (qualquer conta aprovada), amigos, só eu,
-- ou uma lista específica de pessoas.
begin;

create table if not exists public.perfil_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  texto text,
  anexo jsonb,
  visibilidade text not null default 'amigos' check (visibilidade in ('publico','amigos','privado','personalizado')),
  created_at timestamptz not null default now()
);
create index if not exists perfil_posts_por_dono on public.perfil_posts(user_id, created_at desc);

create table if not exists public.perfil_post_audiencia (
  post_id uuid not null references public.perfil_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  primary key (post_id, user_id)
);

-- mesma validação de anexo já usada nos comentários de cena (sql/25) —
-- texto ou anexo, upload próprio isolado por pasta ou gif/figurinha por url
alter table public.perfil_posts drop constraint if exists perfil_posts_validos;
alter table public.perfil_posts add constraint perfil_posts_validos check (public.drk_comentario_valido(texto, anexo, user_id));

alter table public.perfil_posts enable row level security;
revoke all on public.perfil_posts from anon, authenticated;
grant select on public.perfil_posts to authenticated;
grant insert (id,user_id,texto,anexo,visibilidade) on public.perfil_posts to authenticated;
grant delete on public.perfil_posts to authenticated;

drop policy if exists drk_perfil_posts_ler on public.perfil_posts;
create policy drk_perfil_posts_ler on public.perfil_posts for select to authenticated using (
  public.drk_e_admin() or user_id = (select auth.uid()) or (
    public.drk_conta_aprovada() and (
      visibilidade = 'publico'
      or (visibilidade = 'amigos' and exists (
        select 1 from public.amizades where solicitante = (select auth.uid()) and destinatario = perfil_posts.user_id and status = 'aceita'
      ))
      or (visibilidade = 'personalizado' and exists (
        select 1 from public.perfil_post_audiencia where post_id = perfil_posts.id and user_id = (select auth.uid())
      ))
    )
  )
);

drop policy if exists drk_perfil_posts_criar on public.perfil_posts;
create policy drk_perfil_posts_criar on public.perfil_posts for insert to authenticated with check (
  user_id = (select auth.uid()) and public.drk_conta_pode_agir()
);

drop policy if exists drk_perfil_posts_apagar on public.perfil_posts;
create policy drk_perfil_posts_apagar on public.perfil_posts for delete to authenticated
  using (user_id = (select auth.uid()) or public.drk_e_admin());

alter table public.perfil_post_audiencia enable row level security;
revoke all on public.perfil_post_audiencia from anon, authenticated;
grant select on public.perfil_post_audiencia to authenticated;
grant insert (post_id,user_id) on public.perfil_post_audiencia to authenticated;

drop policy if exists drk_audiencia_ler on public.perfil_post_audiencia;
create policy drk_audiencia_ler on public.perfil_post_audiencia for select to authenticated using (
  public.drk_e_admin() or user_id = (select auth.uid())
  or exists (select 1 from public.perfil_posts p where p.id = perfil_post_audiencia.post_id and p.user_id = (select auth.uid()))
);

drop policy if exists drk_audiencia_criar on public.perfil_post_audiencia;
create policy drk_audiencia_criar on public.perfil_post_audiencia for insert to authenticated with check (
  exists (select 1 from public.perfil_posts p where p.id = perfil_post_audiencia.post_id and p.user_id = (select auth.uid()))
);


-- ------------------------------------------------------------
-- Storage — anexo de post de perfil, isolado por pasta da conta
-- ------------------------------------------------------------

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('perfil_posts','perfil_posts',true,41943040,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict(id) do update set public=true, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists drk_perfil_posts_upload on storage.objects;
create policy drk_perfil_posts_upload on storage.objects for insert to authenticated with check (bucket_id='perfil_posts' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists drk_perfil_posts_storage_ler on storage.objects;
create policy drk_perfil_posts_storage_ler on storage.objects for select to authenticated using (bucket_id='perfil_posts' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists drk_perfil_posts_storage_apagar on storage.objects;
create policy drk_perfil_posts_storage_apagar on storage.objects for delete to authenticated using (bucket_id='perfil_posts' and (storage.foldername(name))[1] = (select auth.uid())::text);

create or replace function public.drk_pode_alterar_midia(bucket text, caminho text) returns boolean
language sql stable security invoker set search_path = '' as $$
select case
  when bucket in ('Characters','fichas') then public.drk_e_admin()
  when bucket = 'cenas' then
    (storage.foldername(caminho))[1] = (select auth.uid())::text
    and not exists(select 1 from public.cenas c where c.id::text = (storage.foldername(caminho))[2])
  when bucket = 'novidades' then (storage.foldername(caminho))[1] = (select auth.uid())::text
  when bucket = 'cena_comentarios' then (storage.foldername(caminho))[1] = (select auth.uid())::text
  when bucket = 'perfil_posts' then (storage.foldername(caminho))[1] = (select auth.uid())::text
  else true end;
$$;


-- ------------------------------------------------------------
-- Atividade: cenas escritas + cenas onde a pessoa comentou
-- ------------------------------------------------------------

create or replace function public.drk_atividade_perfil(alvo uuid)
returns table (cena_id uuid, titulo text, created_at timestamptz, papel text)
language sql stable security invoker set search_path = '' as $$
  select c.id, c.titulo, c.created_at, 'autor'::text
  from public.cenas c where c.user_id = alvo
  union
  select distinct c.id, c.titulo, c.created_at, 'comentou'::text
  from public.cenas c
  join public.cena_comentarios cc on cc.cena_id = c.id
  where cc.user_id = alvo and c.user_id <> alvo
  order by created_at desc
  limit 60;
$$;
revoke all on function public.drk_atividade_perfil(uuid) from public;
grant execute on function public.drk_atividade_perfil(uuid) to authenticated;

commit;
