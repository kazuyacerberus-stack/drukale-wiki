-- ============================================================
-- DRUKALE // A SERPENTE E A IMAGEM DO AMBIENTE
--
-- Duas coisas de uma vez:
--   1) o sétimo tipo de local: a serpente que nada no oceano
--   2) uma foto do ambiente para cada local
--
-- Rode isto uma única vez no Supabase: SQL Editor > New query > Run
-- É seguro rodar de novo: nada é apagado e nada é duplicado.
-- ============================================================

-- 1) A serpente entra na lista de tipos permitidos -----------
-- A trava antiga conhecia seis tipos e recusaria 'serpente'.
alter table public.locais drop constraint if exists locais_tipo_valido;
alter table public.locais add constraint locais_tipo_valido
  check (tipo in ('capital','cidade','base','quartel','ruina','orbital','serpente'));


-- 2) Onde fica o endereço da foto ----------------------------
alter table public.locais
  add column if not exists imagem text;


-- 3) O balde das fotos ---------------------------------------
-- Criado já com as travas no próprio Supabase: 8 MB e só imagem.
-- Mesmo que alguém burle a tela, o servidor recusa — a trava de
-- verdade é esta aqui.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'locais',
  'locais',
  true,
  8388608,   -- 8 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public             = true,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- 4) Quem pode o quê -----------------------------------------
-- Mesma regra do resto da wiki: qualquer um vê, só quem está
-- logado envia ou apaga.

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'drk_local_img_%'
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

create policy "drk_local_img_ler_publico"
  on storage.objects for select
  using (bucket_id = 'locais');

create policy "drk_local_img_enviar_logado"
  on storage.objects for insert
  to authenticated with check (bucket_id = 'locais');

create policy "drk_local_img_apagar_logado"
  on storage.objects for delete
  to authenticated using (bucket_id = 'locais');

create policy "drk_local_img_trocar_logado"
  on storage.objects for update
  to authenticated using (bucket_id = 'locais');


-- 5) Confira o resultado --------------------------------------
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'locais'
order by ordinal_position;

select id, public, round(file_size_limit / 1024.0 / 1024.0) as limite_mb
from storage.buckets
where id = 'locais';

select policyname, cmd
from pg_policies
where policyname like 'drk_local_img_%'
order by cmd;
