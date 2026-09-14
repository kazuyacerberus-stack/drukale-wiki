-- ============================================================
-- DRUKALE // ARQUIVO DA FICHA (PDF ou Word)
-- Rode isto uma única vez no Supabase: SQL Editor > New query > Run
-- É seguro rodar de novo: nada é apagado e nada é duplicado.
-- ============================================================

-- 1) Onde o endereço do arquivo fica guardado ----------------
-- sheet_url  = endereço público do arquivo no Storage
-- sheet_name = nome original, do jeito que você salvou no computador,
--              para o botão de baixar mostrar algo legível
alter table characters
  add column if not exists sheet_url  text,
  add column if not exists sheet_name text;


-- 2) O balde onde os arquivos ficam --------------------------
-- Criado já com as travas no próprio Supabase: 20 MB e só os três
-- tipos permitidos. Mesmo que alguém burle a tela do painel, o
-- servidor recusa — a trava de verdade é esta aqui.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fichas',
  'fichas',
  true,
  20971520,   -- 20 MB
  array[
    'application/pdf',
    'application/msword',                                                       -- .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'   -- .docx
  ]
)
on conflict (id) do update set
  public            = true,
  file_size_limit   = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- 3) Quem pode o quê -----------------------------------------
-- Mesma regra do resto da wiki: qualquer um lê, só quem está
-- logado envia ou apaga.

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'drk_ficha_%'
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

create policy "drk_ficha_ler_publico"
  on storage.objects for select
  using (bucket_id = 'fichas');

create policy "drk_ficha_enviar_logado"
  on storage.objects for insert
  to authenticated with check (bucket_id = 'fichas');

create policy "drk_ficha_apagar_logado"
  on storage.objects for delete
  to authenticated using (bucket_id = 'fichas');

create policy "drk_ficha_trocar_logado"
  on storage.objects for update
  to authenticated using (bucket_id = 'fichas');


-- 4) Confira o resultado -------------------------------------
select id, public,
       file_size_limit,
       round(file_size_limit / 1024.0 / 1024.0) as limite_mb,
       allowed_mime_types
from storage.buckets
where id = 'fichas';

select policyname, cmd, roles
from pg_policies
where schemaname = 'storage' and policyname like 'drk_ficha_%'
order by cmd;
