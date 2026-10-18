-- ============================================================
-- TERRA SAVE // MAPA: TODOS VEEM, SÓ O GM CADASTRA
--
-- Execute o arquivo INTEIRO no SQL Editor do Supabase, depois do
-- sql/44-portas-abertas.sql (usa a função drk_e_gm criada nele).
--
-- Todos continuam vendo o mapa e os locais. Criar, editar e apagar
-- locais (e as imagens e a apresentação de cada território) passa a
-- ser só do GM. Políticas "restritivas" valem por cima de todas as
-- outras: mesmo com as portas abertas, ninguém além do GM passa.
-- ============================================================

begin;

drop policy if exists drk_locais_criar_so_gm on public.locais;
create policy drk_locais_criar_so_gm on public.locais
  as restrictive for insert to anon, authenticated
  with check (public.drk_e_gm());

drop policy if exists drk_locais_editar_so_gm on public.locais;
create policy drk_locais_editar_so_gm on public.locais
  as restrictive for update to anon, authenticated
  using (public.drk_e_gm()) with check (public.drk_e_gm());

drop policy if exists drk_locais_apagar_so_gm on public.locais;
create policy drk_locais_apagar_so_gm on public.locais
  as restrictive for delete to anon, authenticated
  using (public.drk_e_gm());

-- imagens dos locais: só o GM envia, troca ou apaga
drop policy if exists drk_locais_img_enviar_so_gm on storage.objects;
create policy drk_locais_img_enviar_so_gm on storage.objects
  as restrictive for insert to anon, authenticated
  with check (bucket_id <> 'locais' or public.drk_e_gm());

drop policy if exists drk_locais_img_trocar_so_gm on storage.objects;
create policy drk_locais_img_trocar_so_gm on storage.objects
  as restrictive for update to anon, authenticated
  using (bucket_id <> 'locais' or public.drk_e_gm());

drop policy if exists drk_locais_img_apagar_so_gm on storage.objects;
create policy drk_locais_img_apagar_so_gm on storage.objects
  as restrictive for delete to anon, authenticated
  using (bucket_id <> 'locais' or public.drk_e_gm());

-- apresentação (aba) do território: só o GM monta
create or replace function public.drk_salvar_apresentacao(alvo uuid, dados jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.locais where id = alvo) then
    raise exception 'Território não encontrado.';
  end if;
  if not public.drk_e_gm() then
    raise exception 'Só o GM pode montar a apresentação dos locais do mapa.';
  end if;
  if not public.drk_apresentacao_valida(dados) then
    raise exception 'A apresentação passou do tamanho permitido.';
  end if;
  update public.locais set apresentacao = dados where id = alvo;
end $$;

commit;


-- CONFERÊNCIA: deve vir 3 (criar, editar e apagar só do GM)
select count(*) as travas_do_mapa
from pg_policies
where tablename = 'locais' and permissive = 'RESTRICTIVE' and policyname like 'drk_locais_%_so_gm';
