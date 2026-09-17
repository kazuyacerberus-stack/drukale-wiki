-- DRUKALE / LINHA DO TEMPO — ANEXO. Execute o arquivo INTEIRO no SQL
-- Editor do Supabase. Acrescenta uma foto, vídeo ou GIF opcional a cada
-- evento. Não apaga nem duplica nada existente.
begin;

alter table public.eventos add column if not exists anexo jsonb;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('eventos','eventos',true,41943040,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict(id) do update set public=true, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

-- leitura pública (igual "locais" e "glossario"): a linha do tempo é
-- uma página pública, sem exigir login
drop policy if exists drk_eventos_img_ler on storage.objects;
create policy drk_eventos_img_ler on storage.objects for select using (bucket_id = 'eventos');
drop policy if exists drk_eventos_img_enviar on storage.objects;
create policy drk_eventos_img_enviar on storage.objects for insert to authenticated with check (bucket_id = 'eventos');
drop policy if exists drk_eventos_img_trocar on storage.objects;
create policy drk_eventos_img_trocar on storage.objects for update to authenticated using (bucket_id = 'eventos');
drop policy if exists drk_eventos_img_apagar on storage.objects;
create policy drk_eventos_img_apagar on storage.objects for delete to authenticated using (bucket_id = 'eventos');

-- estende o isolamento por bucket (definido em sql/08-cenas.sql): só
-- admin mexe no anexo de evento, igual já vale para Characters, fichas,
-- facções e glossário.
--
-- ATENÇÃO: esta mesma função é redefinida em sql/09, sql/10 e sql/15.
-- Reaplique sempre o arquivo de maior número por último, ou os buckets
-- que vieram depois dele perdem a proteção só-admin.
create or replace function public.drk_pode_alterar_midia(bucket text, caminho text) returns boolean
language sql stable security invoker set search_path = '' as $$
select case
  when bucket in ('Characters','fichas','faccoes','glossario','eventos') then public.drk_e_admin()
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

-- Verificação: deve rodar sem erro e mostrar o bucket "eventos" com 40 MB.
select id, public, file_size_limit from storage.buckets where id = 'eventos';
