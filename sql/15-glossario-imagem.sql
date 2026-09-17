-- DRUKALE / GLOSSÁRIO — IMAGEM. Execute o arquivo INTEIRO no SQL Editor do Supabase.
-- Acrescenta uma imagem opcional a cada termo do glossário. Não apaga nem
-- duplica nada existente.
begin;

alter table public.glossario add column if not exists imagem text;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('glossario','glossario',true,8388608,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do update set public=true, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

-- mesma forma já usada para o bucket "locais" (sql/07): leitura pública,
-- sem exigir login, porque o glossário também é uma página pública
drop policy if exists drk_glossario_img_ler on storage.objects;
create policy drk_glossario_img_ler on storage.objects for select using (bucket_id = 'glossario');
drop policy if exists drk_glossario_img_enviar on storage.objects;
create policy drk_glossario_img_enviar on storage.objects for insert to authenticated with check (bucket_id = 'glossario');
drop policy if exists drk_glossario_img_trocar on storage.objects;
create policy drk_glossario_img_trocar on storage.objects for update to authenticated using (bucket_id = 'glossario');
drop policy if exists drk_glossario_img_apagar on storage.objects;
create policy drk_glossario_img_apagar on storage.objects for delete to authenticated using (bucket_id = 'glossario');

-- estende o isolamento por bucket (definido em sql/08-cenas.sql): só admin
-- mexe nas imagens do glossário, igual já vale para Characters, fichas e
-- facções (a política acima libera INSERT/UPDATE/DELETE para qualquer
-- logado, mas esta função RESTRICTIVE — combinada por AND — é quem
-- realmente barra quem não é admin).
--
-- ATENÇÃO: esta mesma função é redefinida em sql/09 e sql/10. Se um
-- desses arquivos for reaplicado sozinho DEPOIS deste, ele apaga a
-- proteção do bucket 'glossario' (destrava para qualquer conta logada).
-- Reaplique este arquivo por último se precisar rodar um arquivo mais
-- antigo de novo num banco que já tem tudo instalado.
create or replace function public.drk_pode_alterar_midia(bucket text, caminho text) returns boolean
language sql stable security invoker set search_path = '' as $$
select case
  when bucket in ('Characters','fichas','faccoes','glossario') then public.drk_e_admin()
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

-- Verificação: deve rodar sem erro e mostrar o bucket "glossario" com 8 MB.
select id, public, file_size_limit from storage.buckets where id = 'glossario';
