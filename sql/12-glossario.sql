-- DRUKALE / GLOSSÁRIO. Execute o arquivo INTEIRO no SQL Editor do Supabase.
-- Cria a tabela de termos do glossário (raças, magia, tecnologia,
-- organizações, lugares...). Não apaga nem duplica nada existente.
begin;

create table if not exists public.glossario (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  termo text not null check (length(btrim(termo)) between 1 and 80),
  categoria text not null default 'Outro',
  resumo text,
  definicao text,
  created_at timestamptz not null default now()
);
create unique index if not exists glossario_slug_key on public.glossario (slug);

alter table public.glossario enable row level security;
revoke all on public.glossario from anon, authenticated;
grant select on public.glossario to anon, authenticated;
grant insert, update, delete on public.glossario to authenticated;

drop policy if exists drk_glossario_ler on public.glossario;
create policy drk_glossario_ler on public.glossario for select to anon, authenticated using (true);
drop policy if exists drk_glossario_criar on public.glossario;
create policy drk_glossario_criar on public.glossario for insert to authenticated with check (public.drk_e_admin());
drop policy if exists drk_glossario_editar on public.glossario;
create policy drk_glossario_editar on public.glossario for update to authenticated using (public.drk_e_admin()) with check (public.drk_e_admin());
drop policy if exists drk_glossario_apagar on public.glossario;
create policy drk_glossario_apagar on public.glossario for delete to authenticated using (public.drk_e_admin());

commit;

-- Verificação: deve rodar sem erro e mostrar a tabela (vazia, se ainda não cadastrou nada).
select id, slug, termo, categoria from public.glossario order by termo;
