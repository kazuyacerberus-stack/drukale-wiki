-- DRUKALE / FECHA UMA LACUNA NA APROVAÇÃO DE CONTA. Execute no SQL Editor
-- do Supabase, depois de sql/22-conta-aprovacao-e-acesso.sql.
--
-- Achado ao revisar o fechamento do site: sql/22 acrescentou a checagem
-- de "conta aprovada" no INSERT de characters/eventos, mas esqueceu de
-- fazer o mesmo no UPDATE/DELETE. Na prática isso não abre a ficha na
-- tela (a LEITURA já está travada por conta_aprovada()) — mas alguém
-- cuja conta foi aprovada, enviou uma ficha pendente/reprovada, e depois
-- teve a CONTA reprovada pelo administrador, ainda conseguiria editar ou
-- apagar essa ficha chamando a API do Supabase direto (fora da tela).
-- Fecha essa lacuna.
begin;

drop policy if exists drk_so_admin_update on public.characters;
create policy drk_so_admin_update on public.characters as restrictive for update to public
  using (public.drk_e_admin() or (user_id = (select auth.uid()) and status_aprovacao in ('pendente','reprovado') and public.drk_conta_aprovada()))
  with check (public.drk_e_admin() or (user_id = (select auth.uid()) and status_aprovacao = 'pendente' and public.drk_conta_aprovada()));

drop policy if exists drk_so_admin_delete on public.characters;
create policy drk_so_admin_delete on public.characters as restrictive for delete to public
  using (public.drk_e_admin() or (user_id = (select auth.uid()) and status_aprovacao in ('pendente','reprovado') and public.drk_conta_aprovada()));

drop policy if exists drk_eventos_editar on public.eventos;
create policy drk_eventos_editar on public.eventos for update to authenticated
  using (public.drk_e_admin() or (user_id = (select auth.uid()) and status_aprovacao in ('pendente','reprovado') and public.drk_conta_aprovada()))
  with check (public.drk_e_admin() or (user_id = (select auth.uid()) and status_aprovacao = 'pendente' and public.drk_conta_aprovada()));

drop policy if exists drk_eventos_apagar on public.eventos;
create policy drk_eventos_apagar on public.eventos for delete to authenticated
  using (public.drk_e_admin() or (user_id = (select auth.uid()) and status_aprovacao in ('pendente','reprovado') and public.drk_conta_aprovada()));

commit;
