-- DRUKALE / APRESENTAÇÃO DO TERRITÓRIO + CORREÇÕES DO MAPA. Execute o
-- arquivo INTEIRO no SQL Editor do Supabase, depois do sql/39.
--
-- 1) CORRIGE a proposta de território do sql/39: o sql/08 tinha deixado
--    em "locais" três políticas RESTRITIVAS de "só admin". Restritiva é
--    somada com E às outras — então, mesmo com as regras novas do sql/39,
--    o jogador comum continuava barrado ao propor um território. As regras
--    do sql/39 já cobrem admin e dono, então as restritivas saem.
-- 2) Isola as imagens do mapa por pasta: até aqui qualquer conta logada
--    podia apagar imagem de qualquer local no bucket "locais". Agora o
--    jogador só mexe na própria pasta ({seu-id}/...), o admin em tudo.
-- 3) A "aba do território": uma apresentação (textos + imagens) guardada
--    como JSON no próprio local, salva por uma função que só aceita o dono
--    do território ou o admin — inclusive depois de aprovado, porque é
--    texto de ambientação e não muda o território em si.
begin;

-- ------------------------------------------------------------
-- 1) as restritivas antigas de "só admin" saem de locais
-- ------------------------------------------------------------
drop policy if exists drk_so_admin_insert on public.locais;
drop policy if exists drk_so_admin_update on public.locais;
drop policy if exists drk_so_admin_delete on public.locais;


-- ------------------------------------------------------------
-- 2) imagens do mapa: cada jogador na sua pasta
--    (mesmo conteúdo da versão do sql/27, mais o caso "locais")
-- ------------------------------------------------------------
create or replace function public.drk_pode_alterar_midia(bucket text, caminho text) returns boolean
language sql stable security invoker set search_path = '' as $$
select case
  when bucket in ('Characters','fichas') then public.drk_e_admin()
  when bucket = 'cenas' then
    (storage.foldername(caminho))[1] = (select auth.uid())::text
    and not exists(select 1 from public.cenas c where c.id::text = (storage.foldername(caminho))[2])
  when bucket = 'novidades' then (storage.foldername(caminho))[1] = (select auth.uid())::text
  when bucket = 'cena_comentarios' then (storage.foldername(caminho))[1] = (select auth.uid())::text
  when bucket = 'perfil_posts' then (storage.foldername(caminho))[1] = (select auth.uid())::text
  when bucket = 'locais' then
    public.drk_e_admin() or (storage.foldername(caminho))[1] = (select auth.uid())::text
  else true end;
$$;


-- ------------------------------------------------------------
-- 3) a apresentação
-- ------------------------------------------------------------
alter table public.locais add column if not exists apresentacao jsonb;

-- só confere o formato geral e o tamanho: o conteúdo (quantos campos,
-- limites de cada texto) é conferido na tela; aqui a trava é contra
-- alguém entupir a linha com lixo
create or replace function public.drk_apresentacao_valida(v jsonb) returns boolean
language sql immutable as $$
  select v is null or (jsonb_typeof(v) = 'object' and octet_length(v::text) <= 40000);
$$;

alter table public.locais drop constraint if exists locais_apresentacao_valida;
alter table public.locais add constraint locais_apresentacao_valida
  check (public.drk_apresentacao_valida(apresentacao));

create or replace function public.drk_salvar_apresentacao(alvo uuid, dados jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare dono uuid;
begin
  select user_id into dono from public.locais where id = alvo;
  if not found then
    raise exception 'Território não encontrado.';
  end if;
  if not (public.drk_e_admin() or (dono = auth.uid() and public.drk_conta_pode_agir())) then
    raise exception 'Só quem propôs o território (ou o game master) pode montar a apresentação.';
  end if;
  if not public.drk_apresentacao_valida(dados) then
    raise exception 'A apresentação passou do tamanho permitido.';
  end if;
  update public.locais set apresentacao = dados where id = alvo;
end $$;
revoke all on function public.drk_salvar_apresentacao(uuid, jsonb) from public;
grant execute on function public.drk_salvar_apresentacao(uuid, jsonb) to authenticated;

commit;

-- Verificação: deve rodar sem erro e não listar nenhuma política
-- "drk_so_admin_*" em locais.
select policyname, permissive, cmd from pg_policies
where schemaname = 'public' and tablename = 'locais' order by cmd;
