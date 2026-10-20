-- ============================================================
-- TERRA SAVE // DOCUMENTO (PDF OU WORD) NOS LOCAIS DO MAPA
--
-- Execute o arquivo INTEIRO no SQL Editor do Supabase, depois do
-- sql/46-mapa-so-gm.sql (usa a função drk_e_gm do sql/44).
--
-- Cada local do mapa ganha um documento opcional (PDF, DOC ou DOCX,
-- até 20 MB). Todos podem abrir e ler; só o GM envia, troca ou apaga
-- — igual ao resto do mapa.
-- ============================================================

begin;

-- 1) onde o documento fica guardado no local
alter table public.locais add column if not exists documento_url text
  check (documento_url is null or length(documento_url) <= 1000);
alter table public.locais add column if not exists documento_nome text
  check (documento_nome is null or length(documento_nome) <= 240);

-- 2) compartimento próprio para os documentos (o de imagens só aceita imagem)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'locais_docs',
  'locais_docs',
  true,
  20971520,   -- 20 MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public             = true,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 3) todos leem; só o GM escreve
drop policy if exists drk_locais_docs_ler on storage.objects;
create policy drk_locais_docs_ler on storage.objects for select
  using (bucket_id = 'locais_docs');

drop policy if exists drk_locais_docs_enviar on storage.objects;
create policy drk_locais_docs_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'locais_docs' and public.drk_e_gm());

drop policy if exists drk_locais_docs_trocar on storage.objects;
create policy drk_locais_docs_trocar on storage.objects for update to authenticated
  using (bucket_id = 'locais_docs' and public.drk_e_gm());

drop policy if exists drk_locais_docs_apagar on storage.objects;
create policy drk_locais_docs_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'locais_docs' and public.drk_e_gm());

commit;


-- CONFERÊNCIA: as duas colunas devem vir true
select
  exists (select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'locais' and column_name = 'documento_url') as coluna_criada,
  exists (select 1 from storage.buckets where id = 'locais_docs') as compartimento_criado;
