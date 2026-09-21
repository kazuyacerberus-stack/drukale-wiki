-- DRUKALE / REGRAS DO RPG. Execute o arquivo INTEIRO no SQL Editor do
-- Supabase, depois de sql/28. Só estrutura: o texto das regras entra por
-- um arquivo separado (importar-regras.sql), que não vai pro repositório.
--
-- Quem pode o quê:
--   ler comentar       -> qualquer conta aprovada (ideias e melhorias)
--   editar/criar/apagar regra e subir imagem/vídeo -> só administrador
begin;

-- ------------------------------------------------------------
-- 1) REGRAS — uma linha por seção; "doc" agrupa na barra lateral
-- ------------------------------------------------------------

create table if not exists public.regras (
  id uuid primary key default gen_random_uuid(),
  doc text not null check (length(btrim(doc)) between 1 and 200),
  doc_ordem integer not null,
  ordem integer not null,
  titulo text not null check (length(btrim(titulo)) between 1 and 200),
  conteudo text not null default '' check (length(conteudo) <= 60000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  unique (doc_ordem, ordem)
);

alter table public.regras enable row level security;
revoke all on public.regras from anon, authenticated;
grant select, insert, update, delete on public.regras to authenticated;

drop policy if exists drk_regras_ler on public.regras;
create policy drk_regras_ler on public.regras for select to authenticated
  using (public.drk_e_admin() or public.drk_conta_aprovada());

drop policy if exists drk_regras_criar on public.regras;
create policy drk_regras_criar on public.regras for insert to authenticated
  with check (public.drk_e_admin());

drop policy if exists drk_regras_editar on public.regras;
create policy drk_regras_editar on public.regras for update to authenticated
  using (public.drk_e_admin()) with check (public.drk_e_admin());

drop policy if exists drk_regras_apagar on public.regras;
create policy drk_regras_apagar on public.regras for delete to authenticated
  using (public.drk_e_admin());


-- ------------------------------------------------------------
-- 2) COMENTÁRIOS — ideias e melhorias dos jogadores, por regra
-- ------------------------------------------------------------

create table if not exists public.regra_comentarios (
  id uuid primary key default gen_random_uuid(),
  regra_id uuid not null references public.regras(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  texto text not null check (length(btrim(texto)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists regra_comentarios_por_regra on public.regra_comentarios(regra_id, created_at);

alter table public.regra_comentarios enable row level security;
revoke all on public.regra_comentarios from anon, authenticated;
grant select on public.regra_comentarios to authenticated;
grant insert (id, regra_id, user_id, texto) on public.regra_comentarios to authenticated;
grant delete on public.regra_comentarios to authenticated;

drop policy if exists drk_regra_comentarios_ler on public.regra_comentarios;
create policy drk_regra_comentarios_ler on public.regra_comentarios for select to authenticated
  using (public.drk_e_admin() or public.drk_conta_aprovada());

drop policy if exists drk_regra_comentarios_criar on public.regra_comentarios;
create policy drk_regra_comentarios_criar on public.regra_comentarios for insert to authenticated
  with check (user_id = (select auth.uid()) and public.drk_conta_pode_agir());

drop policy if exists drk_regra_comentarios_apagar on public.regra_comentarios;
create policy drk_regra_comentarios_apagar on public.regra_comentarios for delete to authenticated
  using (user_id = (select auth.uid()) or public.drk_e_admin());


-- ------------------------------------------------------------
-- 3) STORAGE — imagens, GIFs e vídeos que o moderador põe nas regras
--    (leitura pública pela URL; só administrador envia e apaga)
-- ------------------------------------------------------------

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('regras', 'regras', true, 41943040, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict(id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists drk_regras_midia_ler on storage.objects;
create policy drk_regras_midia_ler on storage.objects for select using (bucket_id = 'regras');
drop policy if exists drk_regras_midia_enviar on storage.objects;
create policy drk_regras_midia_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'regras' and public.drk_e_admin());
drop policy if exists drk_regras_midia_apagar on storage.objects;
create policy drk_regras_midia_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'regras' and public.drk_e_admin());

commit;

-- Verificação: deve devolver 0 (ainda sem regras até rodar o importar-regras.sql).
select count(*) as regras from public.regras;
