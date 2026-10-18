-- ============================================================
-- TERRA SAVE // REGRAS SÓ DO GM + ALTERAÇÕES COM APROVAÇÃO
--
-- Execute o arquivo INTEIRO no SQL Editor do Supabase, DEPOIS do
-- sql/44-portas-abertas.sql (usa a função drk_e_gm criada nele).
--
-- O que muda:
--   1) REGRAS: só o GM cria, edita e apaga regras (e as imagens delas).
--      Todos continuam lendo, comentando e perguntando.
--   2) PERSONAGEM: qualquer um ainda CRIA na hora. Mas EDITAR uma ficha
--      que já existe vira uma PROPOSTA: a ficha publicada fica como
--      está até o GM aprovar a mudança no painel (/admin).
--   3) RESERVA DE IMAGEM: trocar a imagem de uma reserva também vira
--      proposta para o GM aprovar.
--   4) Apagar personagem passa a ser só do GM (apagar é a forma mais
--      radical de alterar — sem isto, a aprovação seria contornável).
--      Liberar uma reserva: só quem reservou, ou o GM.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) REGRAS: só o GM escreve
-- ------------------------------------------------------------
drop policy if exists drk_regras_criar on public.regras;
create policy drk_regras_criar on public.regras for insert to authenticated
  with check (public.drk_e_gm());

drop policy if exists drk_regras_editar on public.regras;
create policy drk_regras_editar on public.regras for update to authenticated
  using (public.drk_e_gm()) with check (public.drk_e_gm());

drop policy if exists drk_regras_apagar on public.regras;
create policy drk_regras_apagar on public.regras for delete to authenticated
  using (public.drk_e_gm());

drop policy if exists drk_regras_midia_enviar on storage.objects;
create policy drk_regras_midia_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'regras' and public.drk_e_gm());

drop policy if exists drk_regras_midia_apagar on storage.objects;
create policy drk_regras_midia_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'regras' and public.drk_e_gm());

-- responder pergunta de regra também é papel do GM
drop policy if exists drk_regra_perguntas_responder_so_gm on public.regra_perguntas;
create policy drk_regra_perguntas_responder_so_gm on public.regra_perguntas
  as restrictive for update to authenticated
  using (public.drk_e_gm()) with check (public.drk_e_gm());


-- ------------------------------------------------------------
-- 2) FILA DE ALTERAÇÕES PARA O GM
-- ------------------------------------------------------------
create table if not exists public.alteracoes_pendentes (
  id uuid primary key default gen_random_uuid(),
  tabela text not null check (tabela in ('characters', 'reservas_imagens')),
  alvo_id uuid not null,
  dados jsonb not null check (jsonb_typeof(dados) = 'object' and octet_length(dados::text) <= 400000),
  user_id uuid references auth.users(id) default auth.uid(),
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'recusada')),
  motivo text check (motivo is null or length(motivo) <= 1000),
  created_at timestamptz not null default now(),
  decidido_em timestamptz
);
create index if not exists alteracoes_pendentes_fila on public.alteracoes_pendentes(status, created_at);

alter table public.alteracoes_pendentes enable row level security;
revoke all on public.alteracoes_pendentes from anon, authenticated;
grant select, insert, delete on public.alteracoes_pendentes to authenticated;

-- cada um vê as próprias propostas; o GM vê todas
drop policy if exists drk_alteracoes_ler on public.alteracoes_pendentes;
create policy drk_alteracoes_ler on public.alteracoes_pendentes for select to authenticated
  using (public.drk_e_gm() or user_id = (select auth.uid()));

drop policy if exists drk_alteracoes_propor on public.alteracoes_pendentes;
create policy drk_alteracoes_propor on public.alteracoes_pendentes for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pendente' and motivo is null
              and decidido_em is null and public.drk_conta_pode_agir());

drop policy if exists drk_alteracoes_apagar on public.alteracoes_pendentes;
create policy drk_alteracoes_apagar on public.alteracoes_pendentes for delete to authenticated
  using (public.drk_e_gm() or (user_id = (select auth.uid()) and status = 'pendente'));

-- reserva: só o dono propõe trocar a imagem dela
create or replace function public.drk_alteracao_conferir() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.tabela = 'reservas_imagens' and not exists (
    select 1 from public.reservas_imagens r where r.id = new.alvo_id and r.user_id = new.user_id
  ) and not public.drk_e_gm() then
    raise exception 'Só quem reservou pode pedir a troca da imagem.';
  end if;
  if new.tabela = 'characters' and not exists (select 1 from public.characters c where c.id = new.alvo_id) then
    raise exception 'Personagem não encontrado.';
  end if;
  -- nova proposta da mesma pessoa para o mesmo item substitui a anterior
  delete from public.alteracoes_pendentes
    where tabela = new.tabela and alvo_id = new.alvo_id
      and user_id = new.user_id and status = 'pendente';
  return new;
end $$;

drop trigger if exists drk_alteracao_conferir on public.alteracoes_pendentes;
create trigger drk_alteracao_conferir before insert on public.alteracoes_pendentes
  for each row execute function public.drk_alteracao_conferir();


-- ------------------------------------------------------------
-- 3) GM APROVA (aplica) OU RECUSA
--    Só colunas conhecidas são aplicadas — o resto da proposta é ignorado.
--    Devolve a versão ANTIGA, para o painel apagar arquivos que sobraram.
-- ------------------------------------------------------------
create or replace function public.drk_aprovar_alteracao(alvo uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  a public.alteracoes_pendentes;
  antigo jsonb;
  permitidas text[];
  sets text[] := '{}';
  k text;
begin
  if not public.drk_e_gm() then
    raise exception 'Apenas o GM pode aprovar alterações.';
  end if;
  select * into a from public.alteracoes_pendentes where id = alvo and status = 'pendente' for update;
  if not found then
    raise exception 'Essa alteração não está mais pendente.';
  end if;

  if a.tabela = 'characters' then
    permitidas := array['name','epithet','faction','status','race','affiliation','quote','description',
                        'slug','image_url','sections','sheet_url','sheet_name'];
    select to_jsonb(c) into antigo from public.characters c where c.id = a.alvo_id;
  else
    permitidas := array['caminho','imagem_hash'];
    select to_jsonb(r) into antigo from public.reservas_imagens r where r.id = a.alvo_id;
  end if;
  if antigo is null then
    raise exception 'O item dessa alteração não existe mais.';
  end if;

  for k in select jsonb_object_keys(a.dados) loop
    if k = any(permitidas) then
      sets := sets || format('%I = r.%I', k, k);
    end if;
  end loop;

  if array_length(sets, 1) > 0 then
    execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I, $1) r where t.id = $2',
                   a.tabela, array_to_string(sets, ', '), a.tabela)
      using a.dados, a.alvo_id;
  end if;

  update public.alteracoes_pendentes set status = 'aprovada', decidido_em = now() where id = alvo;
  return antigo;
end $$;
revoke all on function public.drk_aprovar_alteracao(uuid) from public;
grant execute on function public.drk_aprovar_alteracao(uuid) to authenticated;

create or replace function public.drk_recusar_alteracao(alvo uuid, motivo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.drk_e_gm() then
    raise exception 'Apenas o GM pode recusar alterações.';
  end if;
  update public.alteracoes_pendentes
    set status = 'recusada', motivo = nullif(btrim(coalesce(drk_recusar_alteracao.motivo, '')), ''), decidido_em = now()
    where id = alvo and status = 'pendente';
end $$;
revoke all on function public.drk_recusar_alteracao(uuid, text) from public;
grant execute on function public.drk_recusar_alteracao(uuid, text) to authenticated;


-- ------------------------------------------------------------
-- 4) ninguém além do GM altera ou apaga ficha direto; reserva só o
--    dono libera (ou o GM)
-- ------------------------------------------------------------
drop policy if exists drk_characters_editar_so_gm on public.characters;
create policy drk_characters_editar_so_gm on public.characters
  as restrictive for update to authenticated
  using (public.drk_e_gm()) with check (public.drk_e_gm());

drop policy if exists drk_characters_apagar_so_gm on public.characters;
create policy drk_characters_apagar_so_gm on public.characters
  as restrictive for delete to authenticated
  using (public.drk_e_gm());

drop policy if exists drk_reservas_liberar on public.reservas_imagens;
create policy drk_reservas_liberar on public.reservas_imagens for delete to authenticated
  using (user_id = (select auth.uid()) or public.drk_e_gm());

commit;


-- CONFERÊNCIA: as três colunas devem vir true
select
  to_regclass('public.alteracoes_pendentes') is not null as fila_criada,
  to_regprocedure('public.drk_aprovar_alteracao(uuid)') is not null as aprovar_criado,
  exists (select 1 from pg_policies where tablename = 'regras' and policyname = 'drk_regras_editar'
          and qual like '%drk_e_gm%') as regras_so_gm;
