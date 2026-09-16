-- DRUKALE / CENAS - PARTE 1 de 4: quem e o administrador
create table if not exists public.drukale_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.drukale_admins enable row level security;
revoke all on public.drukale_admins from anon, authenticated;
grant select on public.drukale_admins to authenticated;
drop policy if exists drk_admin_ler_proprio on public.drukale_admins;
create policy drk_admin_ler_proprio on public.drukale_admins for select to authenticated using (user_id = auth.uid());

insert into public.drukale_admins (user_id)
select id from auth.users where lower(email) = lower('COLE_SEU_EMAIL_DE_ADMIN_AQUI')
on conflict do nothing;

create or replace function public.drk_e_admin() returns boolean
language sql stable security definer set search_path = ''
as 'select exists(select 1 from public.drukale_admins where user_id = (select auth.uid()));';
revoke all on function public.drk_e_admin() from public;
grant execute on function public.drk_e_admin() to anon, authenticated;

select user_id as administrador from public.drukale_admins;
-- DRUKALE / CENAS - PARTE 2 de 4: so o admin mexe em personagens e locais
alter table public.characters enable row level security;
drop policy if exists drk_so_admin_insert on public.characters;
create policy drk_so_admin_insert on public.characters as restrictive for insert to public with check (public.drk_e_admin());

alter table public.characters enable row level security;
drop policy if exists drk_so_admin_update on public.characters;
create policy drk_so_admin_update on public.characters as restrictive for update to public using (public.drk_e_admin()) with check (public.drk_e_admin());

alter table public.characters enable row level security;
drop policy if exists drk_so_admin_delete on public.characters;
create policy drk_so_admin_delete on public.characters as restrictive for delete to public using (public.drk_e_admin());

alter table public.locais enable row level security;
drop policy if exists drk_so_admin_insert on public.locais;
create policy drk_so_admin_insert on public.locais as restrictive for insert to public with check (public.drk_e_admin());

alter table public.locais enable row level security;
drop policy if exists drk_so_admin_update on public.locais;
create policy drk_so_admin_update on public.locais as restrictive for update to public using (public.drk_e_admin()) with check (public.drk_e_admin());

alter table public.locais enable row level security;
drop policy if exists drk_so_admin_delete on public.locais;
create policy drk_so_admin_delete on public.locais as restrictive for delete to public using (public.drk_e_admin());

select tablename, policyname from pg_policies where policyname like 'drk_so_admin%' order by tablename, policyname;
-- DRUKALE / CENAS - PARTE 3 de 4: a tabela das cenas e o balde
create table if not exists public.cenas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  tipo text not null check (tipo in ('Cena aberta','Cena fechada','Cena de desenvolvimento')),
  titulo text not null check (length(btrim(titulo)) between 1 and 160),
  local text not null check (length(btrim(local)) between 1 and 120),
  texto text not null check (length(btrim(texto)) between 1 and 50000),
  autor text not null check (length(btrim(autor)) between 1 and 100),
  personagem text not null check (length(btrim(personagem)) between 1 and 100),
  anexos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists cenas_ordem on public.cenas(created_at desc, id desc);

create or replace function public.drk_anexos_validos(valor jsonb, dono uuid, cena_id uuid) returns boolean
language plpgsql immutable set search_path = ''
as 'declare a jsonb;
begin
  if jsonb_typeof(valor) is distinct from ''array'' then return false; end if;
  if jsonb_array_length(valor) > 4 then return false; end if;
  for a in select jsonb_array_elements(valor) loop
    if jsonb_typeof(a) is distinct from ''object''
      or jsonb_typeof(a->''caminho'') is distinct from ''string''
      or jsonb_typeof(a->''nome'') is distinct from ''string''
      or jsonb_typeof(a->''tipo'') is distinct from ''string'' then return false; end if;
    if length(a->>''nome'') not between 1 and 240
      or (a->>''tipo'') not in (''image/jpeg'',''image/png'',''image/webp'',''image/gif'',''video/mp4'',''video/webm'')
      or (a->>''caminho'') !~ (''^'' || dono::text || ''/'' || cena_id::text || ''/[0-9a-f-]+\.(jpg|png|webp|gif|mp4|webm)\Z'') then return false; end if;
  end loop;
  return true;
end';

alter table public.cenas drop constraint if exists cenas_anexos_validos;
alter table public.cenas add constraint cenas_anexos_validos check (public.drk_anexos_validos(anexos, user_id, id));
alter table public.cenas enable row level security;
revoke all on public.cenas from anon, authenticated;
grant select on public.cenas to anon, authenticated;
grant insert (id,user_id,tipo,titulo,local,texto,autor,personagem,anexos) on public.cenas to authenticated;
drop policy if exists drk_cenas_ler on public.cenas;
create policy drk_cenas_ler on public.cenas for select to anon, authenticated using (true);
drop policy if exists drk_cenas_criar on public.cenas;
create policy drk_cenas_criar on public.cenas for insert to authenticated with check (user_id = (select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('cenas','cenas',true,41943040,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict(id) do update set public=true, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists drk_cenas_upload on storage.objects;
create policy drk_cenas_upload on storage.objects for insert to authenticated with check (bucket_id='cenas' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists drk_cenas_storage_ler on storage.objects;
create policy drk_cenas_storage_ler on storage.objects for select to authenticated using (bucket_id='cenas' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists drk_cenas_storage_update on storage.objects;
create policy drk_cenas_storage_update on storage.objects for update to authenticated using (bucket_id='cenas' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id='cenas' and (storage.foldername(name))[1] = (select auth.uid())::text);

select id, public, file_size_limit from storage.buckets where id='cenas';
-- DRUKALE / CENAS - PARTE 4 de 4: isolamento do Storage e a busca
create or replace function public.drk_pode_alterar_midia(bucket text, caminho text) returns boolean
language sql stable security invoker set search_path = ''
as 'select case
  when bucket in (''Characters'',''fichas'') then public.drk_e_admin()
  when bucket = ''cenas'' then
    (storage.foldername(caminho))[1] = (select auth.uid())::text
    and not exists(select 1 from public.cenas c where c.id::text = (storage.foldername(caminho))[2])
  else true end;';

drop policy if exists drk_storage_isolar_insert on storage.objects;
create policy drk_storage_isolar_insert on storage.objects as restrictive for insert to public with check (public.drk_pode_alterar_midia(bucket_id,name));
drop policy if exists drk_storage_isolar_update on storage.objects;
create policy drk_storage_isolar_update on storage.objects as restrictive for update to public using (public.drk_pode_alterar_midia(bucket_id,name)) with check (public.drk_pode_alterar_midia(bucket_id,name));
drop policy if exists drk_storage_isolar_delete on storage.objects;
create policy drk_storage_isolar_delete on storage.objects as restrictive for delete to public using (public.drk_pode_alterar_midia(bucket_id,name));

create or replace function public.drk_normalizar_cena(v text) returns text
language sql immutable strict set search_path = ''
as 'select regexp_replace(translate(lower(btrim(v)), ''áàâãäéèêëíìîïóòôõöúùûüç'', ''aaaaaeeeeiiiiooooouuuuc''), ''\s+'', '' '', ''g'');';

create or replace function public.drk_buscar_cenas(p_pessoa text default '', p_local text default '', p_tipo text default '', p_offset integer default 0)
returns setof public.cenas language sql stable security invoker set search_path = ''
as 'select c.* from public.cenas c
  where (coalesce(btrim(p_pessoa),'''') = '''' or position(public.drk_normalizar_cena(p_pessoa) in public.drk_normalizar_cena(c.autor)) > 0 or position(public.drk_normalizar_cena(p_pessoa) in public.drk_normalizar_cena(c.personagem)) > 0)
    and (coalesce(p_local,'''') = '''' or public.drk_normalizar_cena(c.local) = public.drk_normalizar_cena(p_local))
    and (coalesce(p_tipo,'''') = '''' or c.tipo = p_tipo)
  order by c.created_at desc, c.id desc
  limit 21 offset greatest(coalesce(p_offset,0),0);';

create or replace function public.drk_filtros_cenas()
returns jsonb language sql stable security invoker set search_path = ''
as 'select coalesce(jsonb_agg(t), ''[]''::jsonb) from (
    select distinct ''local''::text as categoria, local as valor from public.cenas
    union select distinct ''pessoa''::text, autor from public.cenas
    union select distinct ''pessoa''::text, personagem from public.cenas
  ) t;';

revoke all on function public.drk_buscar_cenas(text,text,text,integer) from public;
revoke all on function public.drk_filtros_cenas() from public;
grant execute on function public.drk_buscar_cenas(text,text,text,integer) to anon, authenticated;
grant execute on function public.drk_filtros_cenas() to anon, authenticated;

select count(*) as cenas_no_arquivo from public.drk_buscar_cenas();
