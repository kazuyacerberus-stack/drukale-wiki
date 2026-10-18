-- ============================================================
-- TERRA SAVE // PROPOR FACÇÃO SEM CONTA
--
-- Execute o arquivo INTEIRO no SQL Editor do Supabase, depois do
-- sql/42-site-aberto.sql.
--
-- O que muda: qualquer visitante, mesmo sem conta, pode propor uma
-- facção. Ela entra SEMPRE como "pendente" e só aparece no site depois
-- que o GM aprovar (pela página da facção, botão "✓ aprovar").
--
-- Como fica seguro:
--   * o visitante NÃO grava direto na tabela. Ele só chama a função
--     drk_propor_faccao, que força status "pendente", sem dono, e
--     confere tamanho de cada campo;
--   * o visitante não consegue editar, aprovar nem apagar nada;
--   * fila máxima de 30 propostas sem conta aguardando o GM — evita
--     que alguém entupa o banco enviando sem parar;
--   * o símbolo enviado sem conta só pode ir para a pasta
--     "propostas/" do compartimento de facções (imagens até 8 MB).
--
-- Quem tem conta continua propondo pelo caminho de antes (vira líder
-- da facção quando aprovada). Proposta sem conta, aprovada, fica sem
-- líder: só o GM aceita membros nela.
-- ============================================================

begin;

-- 1) quem propôs, quando não tem conta (nome ou apelido no grupo).
--    É PÚBLICO: aparece na página da facção como autor da proposta.
alter table public.faccoes add column if not exists proposto_por text
  check (proposto_por is null or length(btrim(proposto_por)) between 2 and 60);


-- 2) a única porta de entrada para quem não tem conta
create or replace function public.drk_propor_faccao(
  p_nome text,
  p_slug text,
  p_cor text,
  p_resumo text,
  p_historia text,
  p_territorio text,
  p_simbolo text,
  p_proposto_por text
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  base text;
  livre text;
  n integer := 1;
begin
  if length(btrim(coalesce(p_nome, ''))) not between 1 and 80 then
    raise exception 'Dê um nome à facção (até 80 caracteres).';
  end if;
  if length(btrim(coalesce(p_proposto_por, ''))) not between 2 and 60 then
    raise exception 'Informe seu nome ou apelido (2 a 60 caracteres).';
  end if;
  if length(coalesce(p_resumo, '')) > 300
     or length(coalesce(p_historia, '')) > 20000
     or length(coalesce(p_territorio, '')) > 2000 then
    raise exception 'Algum campo passou do tamanho máximo.';
  end if;
  if p_cor is not null and p_cor !~ '^#[0-9a-fA-F]{6}$' then
    raise exception 'Cor inválida.';
  end if;
  if p_simbolo is not null and p_simbolo !~ '/storage/v1/object/public/faccoes/propostas/[^/?#]+$' then
    raise exception 'Símbolo inválido.';
  end if;

  if (select count(*) from public.faccoes
      where user_id is null and status_aprovacao = 'pendente' and proposto_por is not null) >= 30 then
    raise exception 'A fila de propostas está cheia. Tente de novo depois que o GM analisar as atuais.';
  end if;

  -- endereço único, mesmo contra facções pendentes que o visitante não enxerga
  base := lower(coalesce(nullif(btrim(p_slug), ''), 'faccao'));
  if base !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(base) > 60 then
    base := 'faccao';
  end if;
  livre := base;
  while exists (select 1 from public.faccoes where slug = livre) loop
    n := n + 1;
    livre := base || '-' || n;
  end loop;

  insert into public.faccoes
    (slug, nome, cor, resumo, historia, territorio, simbolo,
     user_id, status_aprovacao, motivo_reprovacao, proposto_por)
  values
    (livre, btrim(p_nome), coalesce(p_cor, '#8affc0'),
     nullif(btrim(coalesce(p_resumo, '')), ''),
     nullif(btrim(coalesce(p_historia, '')), ''),
     nullif(btrim(coalesce(p_territorio, '')), ''),
     p_simbolo,
     null, 'pendente', null, btrim(p_proposto_por));

  return livre;
end $$;

revoke all on function public.drk_propor_faccao(text, text, text, text, text, text, text, text) from public;
grant execute on function public.drk_propor_faccao(text, text, text, text, text, text, text, text) to anon;


-- 3) símbolo da proposta: visitante só envia para "propostas/"
drop policy if exists drk_faccoes_img_proposta on storage.objects;
create policy drk_faccoes_img_proposta on storage.objects
  for insert to anon
  with check (bucket_id = 'faccoes' and (storage.foldername(name))[1] = 'propostas');

commit;


-- CONFERÊNCIA: as duas linhas devem vir true
select
  to_regprocedure('public.drk_propor_faccao(text,text,text,text,text,text,text,text)') is not null as funcao_criada,
  has_function_privilege('anon', 'public.drk_propor_faccao(text,text,text,text,text,text,text,text)', 'execute') as visitante_pode_propor;
