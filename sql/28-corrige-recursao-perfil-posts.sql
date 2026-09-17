-- DRUKALE / CORRIGE RECURSÃO EM PERFIL_POSTS. Execute no SQL Editor do
-- Supabase, depois de sql/27-perfil-timeline.sql.
--
-- Bug: a política de leitura de "perfil_posts" consulta
-- "perfil_post_audiencia" (pra saber se a visibilidade "personalizado"
-- inclui quem está olhando), e a política de "perfil_post_audiencia"
-- consulta "perfil_posts" de volta (pra saber se quem está olhando é o
-- dono do post) — cada consulta reaciona a política da outra tabela, que
-- reaciona a dela de novo, e o Postgres detecta o ciclo e recusa com
-- "infinite recursion detected in policy". Resolvo isolando cada checagem
-- numa função "security definer" (mesmo molde de drk_e_admin() e
-- drk_conta_aprovada()) — por rodar como o dono da função, a consulta
-- interna não aciona a RLS da tabela de novo, quebrando o ciclo.
begin;

create or replace function public.drk_sou_dono_do_post(alvo_post uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfil_posts p where p.id = alvo_post and p.user_id = (select auth.uid()));
$$;
revoke all on function public.drk_sou_dono_do_post(uuid) from public;
grant execute on function public.drk_sou_dono_do_post(uuid) to authenticated;

create or replace function public.drk_na_audiencia_do_post(alvo_post uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfil_post_audiencia a where a.post_id = alvo_post and a.user_id = (select auth.uid()));
$$;
revoke all on function public.drk_na_audiencia_do_post(uuid) from public;
grant execute on function public.drk_na_audiencia_do_post(uuid) to authenticated;

drop policy if exists drk_perfil_posts_ler on public.perfil_posts;
create policy drk_perfil_posts_ler on public.perfil_posts for select to authenticated using (
  public.drk_e_admin() or user_id = (select auth.uid()) or (
    public.drk_conta_aprovada() and (
      visibilidade = 'publico'
      or (visibilidade = 'amigos' and exists (
        select 1 from public.amizades where solicitante = (select auth.uid()) and destinatario = perfil_posts.user_id and status = 'aceita'
      ))
      or (visibilidade = 'personalizado' and public.drk_na_audiencia_do_post(perfil_posts.id))
    )
  )
);

drop policy if exists drk_audiencia_ler on public.perfil_post_audiencia;
create policy drk_audiencia_ler on public.perfil_post_audiencia for select to authenticated using (
  public.drk_e_admin() or user_id = (select auth.uid()) or public.drk_sou_dono_do_post(perfil_post_audiencia.post_id)
);

drop policy if exists drk_audiencia_criar on public.perfil_post_audiencia;
create policy drk_audiencia_criar on public.perfil_post_audiencia for insert to authenticated with check (
  public.drk_sou_dono_do_post(perfil_post_audiencia.post_id)
);

commit;
