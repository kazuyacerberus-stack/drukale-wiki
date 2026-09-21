-- DRUKALE / PERGUNTAS SOBRE AS REGRAS. Execute o arquivo INTEIRO no SQL
-- Editor do Supabase, depois de sql/33-regras.sql.
--
-- Quem pode o quê:
--   perguntar         -> qualquer conta aprovada (que não esteja banida/silenciada)
--   ler perguntas e respostas -> qualquer conta aprovada
--   responder         -> só administrador (a resposta fica visível pra todos)
--   apagar            -> quem perguntou, ou administrador
begin;

create table if not exists public.regra_perguntas (
  id uuid primary key default gen_random_uuid(),
  regra_id uuid not null references public.regras(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  pergunta text not null check (length(btrim(pergunta)) between 3 and 1000),
  resposta text check (resposta is null or length(btrim(resposta)) between 1 and 4000),
  respondida_por uuid references auth.users(id),
  respondida_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists regra_perguntas_por_regra on public.regra_perguntas(regra_id, created_at);
create index if not exists regra_perguntas_sem_resposta on public.regra_perguntas(regra_id) where resposta is null;

alter table public.regra_perguntas enable row level security;
revoke all on public.regra_perguntas from anon, authenticated;
grant select on public.regra_perguntas to authenticated;
-- quem pergunta só escolhe o texto; a resposta é coluna à parte, só do administrador
grant insert (id, regra_id, user_id, pergunta) on public.regra_perguntas to authenticated;
grant update (resposta, respondida_por, respondida_em) on public.regra_perguntas to authenticated;
grant delete on public.regra_perguntas to authenticated;

drop policy if exists drk_regra_perguntas_ler on public.regra_perguntas;
create policy drk_regra_perguntas_ler on public.regra_perguntas for select to authenticated
  using (public.drk_e_admin() or public.drk_conta_aprovada());

drop policy if exists drk_regra_perguntas_criar on public.regra_perguntas;
create policy drk_regra_perguntas_criar on public.regra_perguntas for insert to authenticated
  with check (user_id = (select auth.uid()) and public.drk_conta_pode_agir());

drop policy if exists drk_regra_perguntas_responder on public.regra_perguntas;
create policy drk_regra_perguntas_responder on public.regra_perguntas for update to authenticated
  using (public.drk_e_admin()) with check (public.drk_e_admin());

drop policy if exists drk_regra_perguntas_apagar on public.regra_perguntas;
create policy drk_regra_perguntas_apagar on public.regra_perguntas for delete to authenticated
  using (user_id = (select auth.uid()) or public.drk_e_admin());

commit;

-- Verificação: deve devolver 0.
select count(*) as perguntas from public.regra_perguntas;
