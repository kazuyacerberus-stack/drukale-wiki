-- ============================================================
-- DRUKALE // TRANCAR O BANCO ANTES DE PUBLICAR
--
-- Depois disto: qualquer pessoa pode LER a wiki, mas só quem estiver
-- logado consegue criar, editar ou apagar.
--
-- Rode no Supabase: SQL Editor > New query > Run
-- ============================================================

-- ------------------------------------------------------------
-- 1) TABELA characters
-- ------------------------------------------------------------

-- remove todas as políticas antigas (as abertas que você criou antes)
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'characters'
  loop
    execute format('drop policy %I on public.characters', p.policyname);
  end loop;
end $$;

alter table public.characters enable row level security;

-- leitura liberada: a wiki é pública
create policy "drk_ler_publico"
  on public.characters for select
  using (true);

-- escrita só para quem tem sessão válida
create policy "drk_criar_logado"
  on public.characters for insert
  to authenticated with check (true);

create policy "drk_editar_logado"
  on public.characters for update
  to authenticated using (true) with check (true);

create policy "drk_apagar_logado"
  on public.characters for delete
  to authenticated using (true);


-- ------------------------------------------------------------
-- 2) STORAGE (bucket Characters)
-- ------------------------------------------------------------

-- remove as políticas antigas que mencionam este bucket
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual::text, '') || coalesce(with_check::text, '')) like '%Characters%'
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

-- imagens visíveis para todo mundo
create policy "drk_img_ler_publico"
  on storage.objects for select
  using (bucket_id = 'Characters');

-- enviar e apagar imagem só logado
create policy "drk_img_enviar_logado"
  on storage.objects for insert
  to authenticated with check (bucket_id = 'Characters');

create policy "drk_img_apagar_logado"
  on storage.objects for delete
  to authenticated using (bucket_id = 'Characters');

create policy "drk_img_trocar_logado"
  on storage.objects for update
  to authenticated using (bucket_id = 'Characters');


-- ------------------------------------------------------------
-- 3) Confira o resultado
-- ------------------------------------------------------------
select tablename, policyname, cmd, roles
from pg_policies
where (schemaname = 'public' and tablename = 'characters')
   or (schemaname = 'storage' and policyname like 'drk_%')
order by tablename, cmd;
