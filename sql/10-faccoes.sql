-- DRUKALE / FACÇÕES. Execute o arquivo INTEIRO no SQL Editor do Supabase.
-- Cria a tabela de facções (página própria por casa/facção) e o bucket
-- de imagem do símbolo. Não apaga nem duplica nada existente.
begin;

create table if not exists public.faccoes (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  nome text not null check (length(btrim(nome)) between 1 and 80),
  cor text not null default '#8affc0',
  simbolo text,
  resumo text,
  historia text,
  territorio text,
  created_at timestamptz not null default now()
);
create unique index if not exists faccoes_slug_key on public.faccoes (slug);

alter table public.faccoes enable row level security;
revoke all on public.faccoes from anon, authenticated;
grant select on public.faccoes to anon, authenticated;
grant insert, update, delete on public.faccoes to authenticated;

drop policy if exists drk_faccoes_ler on public.faccoes;
create policy drk_faccoes_ler on public.faccoes for select to anon, authenticated using (true);
drop policy if exists drk_faccoes_criar on public.faccoes;
create policy drk_faccoes_criar on public.faccoes for insert to authenticated with check (public.drk_e_admin());
drop policy if exists drk_faccoes_editar on public.faccoes;
create policy drk_faccoes_editar on public.faccoes for update to authenticated using (public.drk_e_admin()) with check (public.drk_e_admin());
drop policy if exists drk_faccoes_apagar on public.faccoes;
create policy drk_faccoes_apagar on public.faccoes for delete to authenticated using (public.drk_e_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('faccoes','faccoes',true,8388608,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do update set public=true, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists drk_faccoes_img_ler on storage.objects;
create policy drk_faccoes_img_ler on storage.objects for select using (bucket_id = 'faccoes');
drop policy if exists drk_faccoes_img_enviar on storage.objects;
create policy drk_faccoes_img_enviar on storage.objects for insert to authenticated with check (bucket_id = 'faccoes');
drop policy if exists drk_faccoes_img_trocar on storage.objects;
create policy drk_faccoes_img_trocar on storage.objects for update to authenticated using (bucket_id = 'faccoes');
drop policy if exists drk_faccoes_img_apagar on storage.objects;
create policy drk_faccoes_img_apagar on storage.objects for delete to authenticated using (bucket_id = 'faccoes');

-- estende o isolamento por bucket (definido em sql/08-cenas.sql): só admin
-- mexe nas imagens de facções, igual já vale para Characters e fichas.
--
-- ATENÇÃO: esta mesma função é redefinida em sql/09 e sql/15. Se este
-- arquivo for reaplicado sozinho DEPOIS de um desses já ter rodado, ele
-- apaga a proteção dos buckets que eles acrescentaram. Reaplique sempre
-- o arquivo de maior número por último.
create or replace function public.drk_pode_alterar_midia(bucket text, caminho text) returns boolean
language sql stable security invoker set search_path = '' as $$
select case
  when bucket in ('Characters','fichas','faccoes') then public.drk_e_admin()
  when bucket = 'cenas' then
    (storage.foldername(caminho))[1] = (select auth.uid())::text
    and not exists(select 1 from public.cenas c where c.id::text = (storage.foldername(caminho))[2])
  when bucket = 'avatars' then (storage.foldername(caminho))[1] = (select auth.uid())::text
  when bucket = 'chat' then
    (storage.foldername(caminho))[1] = (select auth.uid())::text
    and not exists(select 1 from public.chat_mensagens m where m.anexo->>'caminho' = caminho)
  else true end;
$$;

commit;

-- Verificação: a tabela deve existir vazia (ou com o que você já cadastrou) e o bucket deve aparecer com 8 MB.
select id, slug, nome from public.faccoes order by created_at;
select id, public, file_size_limit from storage.buckets where id = 'faccoes';
