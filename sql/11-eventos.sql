-- DRUKALE / LINHA DO TEMPO. Execute o arquivo INTEIRO no SQL Editor do Supabase.
-- Cria a tabela de eventos (a linha do tempo do império). Não apaga nem
-- duplica nada existente.
begin;

create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(btrim(titulo)) between 1 and 120),
  data text,
  resumo text,
  descricao text,
  ordem numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists eventos_ordem on public.eventos(ordem, created_at);

alter table public.eventos enable row level security;
revoke all on public.eventos from anon, authenticated;
grant select on public.eventos to anon, authenticated;
grant insert, update, delete on public.eventos to authenticated;

drop policy if exists drk_eventos_ler on public.eventos;
create policy drk_eventos_ler on public.eventos for select to anon, authenticated using (true);
drop policy if exists drk_eventos_criar on public.eventos;
create policy drk_eventos_criar on public.eventos for insert to authenticated with check (public.drk_e_admin());
drop policy if exists drk_eventos_editar on public.eventos;
create policy drk_eventos_editar on public.eventos for update to authenticated using (public.drk_e_admin()) with check (public.drk_e_admin());
drop policy if exists drk_eventos_apagar on public.eventos;
create policy drk_eventos_apagar on public.eventos for delete to authenticated using (public.drk_e_admin());

commit;

-- Verificação: deve rodar sem erro e mostrar a tabela (vazia, se ainda não cadastrou nada).
select id, titulo, data, ordem from public.eventos order by ordem;
