-- DRUKALE / TERRITÓRIOS SOB APROVAÇÃO. Execute o arquivo INTEIRO no SQL
-- Editor do Supabase. Hoje QUALQUER conta logada pode criar, editar ou
-- apagar qualquer local do mapa, na hora, sem revisão nenhuma — isto
-- fecha esse buraco e coloca "locais" no mesmo molde de ficha/evento/
-- facção: jogador propõe um território (com pelo menos 4 links de cena
-- provando que dominou/construiu/desenvolveu/firmou domínio sobre ele),
-- fica "pendente" e só aparece pra ele mesmo, até o game master aprovar
-- ou reprovar. O admin continua podendo criar/editar/aprovar direto,
-- sem precisar dos links. Nada existente é apagado: todo local que já
-- estava no mapa vira "aprovado" automaticamente.
begin;

-- ------------------------------------------------------------
-- 1) COLUNAS NOVAS
-- ------------------------------------------------------------

alter table public.locais add column if not exists user_id uuid references auth.users(id);
alter table public.locais add column if not exists status_aprovacao text not null default 'aprovado'
  check (status_aprovacao in ('pendente','aprovado','reprovado'));
alter table public.locais add column if not exists motivo_reprovacao text;
-- os links das cenas onde o jogador dominou/construiu/desenvolveu/firmou
-- domínio sobre o território — lista de textos (URLs), guardada como
-- jsonb pra não precisar de uma tabela à parte só pra isto
alter table public.locais add column if not exists links_dominio jsonb;

create index if not exists locais_status_idx on public.locais (status_aprovacao);


-- ------------------------------------------------------------
-- 2) VALIDAÇÃO DOS LINKS — pelo menos 4, nenhum vazio ou gigante
-- ------------------------------------------------------------

create or replace function public.drk_local_links_validos(v jsonb) returns boolean
language sql immutable as $$
  select v is not null
    and jsonb_typeof(v) = 'array'
    and jsonb_array_length(v) >= 4
    and not exists (
      select 1 from jsonb_array_elements_text(v) t(link)
      where length(btrim(link)) = 0 or length(link) > 500
    );
$$;


-- ------------------------------------------------------------
-- 3) QUEM PODE O QUÊ — jogador propõe (pendente + dono + links),
--    admin cria/edita/aprova direto, sem essas exigências
-- ------------------------------------------------------------

drop policy if exists "drk_local_ler_publico" on public.locais;
create policy "drk_local_ler_publico" on public.locais for select to authenticated using (
  public.drk_e_admin()
  or (status_aprovacao = 'aprovado' and public.drk_conta_aprovada())
  or user_id = (select auth.uid())
);

drop policy if exists "drk_local_criar_logado" on public.locais;
create policy "drk_local_criar_logado" on public.locais for insert to authenticated with check (
  public.drk_e_admin() or (
    user_id = (select auth.uid())
    and status_aprovacao = 'pendente'
    and public.drk_conta_pode_agir()
    and public.drk_local_links_validos(links_dominio)
  )
);

drop policy if exists "drk_local_editar_logado" on public.locais;
create policy "drk_local_editar_logado" on public.locais for update to authenticated
  using (public.drk_e_admin() or (user_id = (select auth.uid()) and status_aprovacao in ('pendente','reprovado')))
  with check (
    public.drk_e_admin() or (
      user_id = (select auth.uid())
      and status_aprovacao = 'pendente'
      and public.drk_conta_pode_agir()
      and public.drk_local_links_validos(links_dominio)
    )
  );

drop policy if exists "drk_local_apagar_logado" on public.locais;
create policy "drk_local_apagar_logado" on public.locais for delete to authenticated
  using (public.drk_e_admin() or (user_id = (select auth.uid()) and status_aprovacao in ('pendente','reprovado')));


-- ------------------------------------------------------------
-- 4) APROVAR / REPROVAR — só o administrador chama
-- ------------------------------------------------------------

create or replace function public.drk_aprovar_territorio(alvo_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.drk_e_admin() then
    raise exception 'Apenas o administrador pode aprovar territórios.';
  end if;
  update public.locais set status_aprovacao = 'aprovado', motivo_reprovacao = null where id = alvo_id;
end $$;
revoke all on function public.drk_aprovar_territorio(uuid) from public;
grant execute on function public.drk_aprovar_territorio(uuid) to authenticated;

create or replace function public.drk_reprovar_territorio(alvo_id uuid, motivo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.drk_e_admin() then
    raise exception 'Apenas o administrador pode reprovar territórios.';
  end if;
  if length(btrim(coalesce(motivo,''))) < 3 then
    raise exception 'Escreva o motivo da reprovação.';
  end if;
  update public.locais set status_aprovacao = 'reprovado', motivo_reprovacao = btrim(motivo) where id = alvo_id;
end $$;
revoke all on function public.drk_reprovar_territorio(uuid, text) from public;
grant execute on function public.drk_reprovar_territorio(uuid, text) to authenticated;


-- ------------------------------------------------------------
-- 5) PAINEL DO GAME MASTER — soma os territórios pendentes junto
-- ------------------------------------------------------------

create or replace function public.drk_painel_resumo() returns json
language plpgsql security definer set search_path = '' as $$
begin
  if not public.drk_e_admin() then
    raise exception 'Apenas o administrador pode ver o painel.';
  end if;
  return json_build_object(
    'contas_pendentes', (select count(*) from public.profiles where status_conta = 'pendente'),
    'contas_aprovadas', (select count(*) from public.profiles where status_conta = 'aprovado'),
    'fichas_pendentes', (select count(*) from public.characters where status_aprovacao = 'pendente'),
    'eventos_pendentes', (select count(*) from public.eventos where status_aprovacao = 'pendente'),
    'territorios_pendentes', (select count(*) from public.locais where status_aprovacao = 'pendente'),
    'banidos', (select count(*) from public.profiles where banido)
  );
end $$;
revoke all on function public.drk_painel_resumo() from public;
grant execute on function public.drk_painel_resumo() to authenticated;

commit;

-- Verificação: deve rodar sem erro. Mostra que todo local que já
-- existia está "aprovado" (0 pendente/reprovado).
select status_aprovacao, count(*) from public.locais group by status_aprovacao;
