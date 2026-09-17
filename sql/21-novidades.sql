-- DRUKALE / EVENTOS (NOVIDADES DO GRUPO). Execute o arquivo INTEIRO no SQL
-- Editor do Supabase. Cria um mural de posts curtos — "isto aconteceu no
-- grupo" — publicados livremente por qualquer conta autenticada, sem
-- aprovação prévia do administrador (mesmo espírito de cenas e chat: quem
-- já tem conta pode postar, sem moderação prévia).
--
-- CUIDADO DE NOME: a tabela "eventos" já existe e pertence à Linha do
-- Tempo (lore histórica do império, sql/11-eventos.sql) — não é tocada
-- aqui. Este recurso novo é uma tabela e um bucket separados, chamados
-- "novidades" no banco, mas aparecem no menu do site como "Eventos"
-- (foi o nome pedido para a aba). Não confundir as duas coisas.
begin;

create table if not exists public.novidades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  titulo text not null check (length(btrim(titulo)) between 1 and 160),
  texto text not null check (length(btrim(texto)) between 1 and 20000),
  anexo jsonb,
  created_at timestamptz not null default now()
);
create index if not exists novidades_ordem on public.novidades(created_at desc, id desc);

create or replace function public.drk_anexo_novidade_valido(valor jsonb, dono uuid) returns boolean
language plpgsql immutable set search_path = '' as $$
begin
  if valor is null then return true; end if;
  if jsonb_typeof(valor) is distinct from 'object'
    or jsonb_typeof(valor->'caminho') is distinct from 'string'
    or jsonb_typeof(valor->'nome') is distinct from 'string'
    or jsonb_typeof(valor->'tipo') is distinct from 'string' then return false; end if;
  if length(valor->>'nome') not between 1 and 240
    or (valor->>'tipo') not in ('image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm')
    or (valor->>'caminho') !~ ('^' || dono::text || '/[0-9a-zA-Z_.-]+\.(jpg|png|webp|gif|mp4|webm)$') then return false; end if;
  return true;
end $$;
alter table public.novidades drop constraint if exists novidades_anexo_valido;
alter table public.novidades add constraint novidades_anexo_valido check (public.drk_anexo_novidade_valido(anexo, user_id));

alter table public.novidades enable row level security;
revoke all on public.novidades from anon, authenticated;
grant select on public.novidades to authenticated;
grant insert (id,user_id,titulo,texto,anexo) on public.novidades to authenticated;
grant delete on public.novidades to authenticated;

-- a leitura já nasce "to authenticated": diferente de cenas/eventos (que
-- nasceram públicas e serão fechadas depois), este recurso é novo e o
-- fechamento do site inteiro já está decidido — não faz sentido abrir
-- para "anon" agora e fechar de novo em seguida.
drop policy if exists drk_novidades_ler on public.novidades;
create policy drk_novidades_ler on public.novidades for select to authenticated using (true);
drop policy if exists drk_novidades_criar on public.novidades;
create policy drk_novidades_criar on public.novidades for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists drk_novidades_apagar on public.novidades;
create policy drk_novidades_apagar on public.novidades for delete to authenticated using (user_id = (select auth.uid()) or public.drk_e_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('novidades','novidades',true,41943040,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict(id) do update set public=true, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists drk_novidades_upload on storage.objects;
create policy drk_novidades_upload on storage.objects for insert to authenticated with check (bucket_id='novidades' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists drk_novidades_storage_ler on storage.objects;
create policy drk_novidades_storage_ler on storage.objects for select to authenticated using (bucket_id='novidades' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists drk_novidades_storage_apagar on storage.objects;
create policy drk_novidades_storage_apagar on storage.objects for delete to authenticated using (bucket_id='novidades' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- isola este bucket também na trava geral de storage já existente
-- (sql/08-cenas.sql), do mesmo jeito que "cenas" já é isolado ali.
create or replace function public.drk_pode_alterar_midia(bucket text, caminho text) returns boolean
language sql stable security invoker set search_path = '' as $$
select case
  when bucket in ('Characters','fichas') then public.drk_e_admin()
  when bucket = 'cenas' then
    (storage.foldername(caminho))[1] = (select auth.uid())::text
    and not exists(select 1 from public.cenas c where c.id::text = (storage.foldername(caminho))[2])
  when bucket = 'novidades' then (storage.foldername(caminho))[1] = (select auth.uid())::text
  else true end;
$$;

commit;

-- Verificação: deve mostrar o bucket novidades com 40 MB.
select id, public, file_size_limit from storage.buckets where id='novidades';
