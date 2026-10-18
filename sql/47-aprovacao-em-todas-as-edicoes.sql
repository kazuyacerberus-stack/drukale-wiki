-- ============================================================
-- TERRA SAVE // TODA EDIÇÃO DE VISITANTE ESPERA O GM
--
-- Execute o arquivo INTEIRO no SQL Editor do Supabase, DEPOIS do
-- sql/44 e do sql/45.
--
-- O sql/45 pôs aprovação na edição de PERSONAGEM e na troca de imagem
-- de RESERVA. Este estende a mesma regra a FACÇÕES e CRÔNICAS/EVENTOS:
-- quem não é o GM continua CRIANDO na hora, mas EDITAR algo que já
-- existe vira proposta, e a versão publicada só muda quando o GM
-- aprovar no painel (/admin). Apagar facção ou crônica: só o GM.
-- O glossário antigo também fica só do GM.
--
-- No fim há um DIAGNÓSTICO: ele mostra se os arquivos 44, 45 e 47
-- estão aplicados e se a sua conta é reconhecida como GM.
-- ============================================================

begin;

-- 1) a fila aceita facções e eventos
alter table public.alteracoes_pendentes drop constraint if exists alteracoes_pendentes_tabela_check;
alter table public.alteracoes_pendentes add constraint alteracoes_pendentes_tabela_check
  check (tabela in ('characters', 'reservas_imagens', 'faccoes', 'eventos'));

-- 2) conferência na entrada da proposta
create or replace function public.drk_alteracao_conferir() returns trigger
language plpgsql security definer set search_path = '' as $$
declare existe boolean;
begin
  if new.tabela = 'reservas_imagens' then
    if not exists (select 1 from public.reservas_imagens r where r.id = new.alvo_id and r.user_id = new.user_id)
       and not public.drk_e_gm() then
      raise exception 'Só quem reservou pode pedir a troca da imagem.';
    end if;
  else
    execute format('select exists (select 1 from public.%I where id = $1)', new.tabela)
      into existe using new.alvo_id;
    if not existe then
      raise exception 'O item que você tentou editar não existe mais.';
    end if;
  end if;
  -- nova proposta da mesma pessoa para o mesmo item substitui a anterior
  delete from public.alteracoes_pendentes
    where tabela = new.tabela and alvo_id = new.alvo_id
      and user_id = new.user_id and status = 'pendente';
  return new;
end $$;

-- 3) aprovar: colunas que cada tipo pode mudar
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

  permitidas := case a.tabela
    when 'characters' then array['name','epithet','faction','status','race','affiliation','quote','description',
                                 'slug','image_url','sections','sheet_url','sheet_name']
    when 'reservas_imagens' then array['caminho','imagem_hash']
    when 'faccoes' then array['nome','cor','simbolo','resumo','historia','territorio','slug']
    when 'eventos' then array['titulo','data','resumo','descricao','anexo']
  end;

  execute format('select to_jsonb(t) from public.%I t where t.id = $1', a.tabela) into antigo using a.alvo_id;
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

-- 4) editar ou apagar direto: só o GM
do $$
declare tabela text;
begin
  foreach tabela in array array['faccoes', 'eventos', 'glossario'] loop
    if to_regclass('public.' || tabela) is null then continue; end if;
    execute format('drop policy if exists drk_%s_editar_so_gm on public.%I', tabela, tabela);
    execute format('create policy drk_%s_editar_so_gm on public.%I as restrictive for update to anon, authenticated
                    using (public.drk_e_gm()) with check (public.drk_e_gm())', tabela, tabela);
    execute format('drop policy if exists drk_%s_apagar_so_gm on public.%I', tabela, tabela);
    execute format('create policy drk_%s_apagar_so_gm on public.%I as restrictive for delete to anon, authenticated
                    using (public.drk_e_gm())', tabela, tabela);
  end loop;
end $$;

commit;


-- ------------------------------------------------------------
-- DIAGNÓSTICO — rode logado no Supabase; leia a linha que voltar:
--   portas_abertas_44     → true se o 44 foi aplicado
--   fila_de_aprovacao_45  → true se o 45 foi aplicado
--   ficha_so_gm_edita     → true se a ficha está travada para não-GM
--   faccao_so_gm_edita    → true se este arquivo (47) foi aplicado
--   contas_gm             → quantas contas são GM (deve ser 1 ou mais)
--   propostas_na_fila     → quantas alterações esperam você no /admin
-- ------------------------------------------------------------
select
  to_regprocedure('public.drk_e_gm()') is not null as portas_abertas_44,
  to_regclass('public.alteracoes_pendentes') is not null as fila_de_aprovacao_45,
  exists (select 1 from pg_policies where tablename = 'characters' and policyname = 'drk_characters_editar_so_gm') as ficha_so_gm_edita,
  exists (select 1 from pg_policies where tablename = 'faccoes' and policyname = 'drk_faccoes_editar_so_gm') as faccao_so_gm_edita,
  (select count(*) from public.drukale_admins) as contas_gm,
  (select count(*) from public.alteracoes_pendentes where status = 'pendente') as propostas_na_fila;
