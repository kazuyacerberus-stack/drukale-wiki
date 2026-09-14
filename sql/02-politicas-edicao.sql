-- ============================================================
-- DRUKALE // PERMISSÃO PARA EDITAR E EXCLUIR
-- Rode SÓ SE o painel acusar que o Supabase bloqueou a operação.
--
-- ATENÇÃO: isto libera edição e exclusão para QUALQUER pessoa que
-- abrir o site. Em localhost não tem problema. Antes de publicar na
-- internet, isto precisa ser trocado por regras com login.
-- ============================================================

drop policy if exists "drukale_update_aberto" on characters;
create policy "drukale_update_aberto"
  on characters for update
  using (true)
  with check (true);

drop policy if exists "drukale_delete_aberto" on characters;
create policy "drukale_delete_aberto"
  on characters for delete
  using (true);


-- Confira o que ficou valendo:
select policyname, cmd from pg_policies
where tablename = 'characters'
order by cmd, policyname;
