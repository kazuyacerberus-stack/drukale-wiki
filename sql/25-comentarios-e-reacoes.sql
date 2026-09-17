-- DRUKALE / COMENTÁRIOS E REAÇÕES NAS CENAS. Execute o arquivo INTEIRO no
-- SQL Editor do Supabase. Sem moderação prévia — mesmo espírito de cenas e
-- chat: quem tem conta aprovada comenta/reage livremente, banido ou
-- silenciado não consegue.
begin;

-- ------------------------------------------------------------
-- 1) COMENTÁRIOS (e respostas — parent_id aponta pra outro comentário)
-- ------------------------------------------------------------

create table if not exists public.cena_comentarios (
  id uuid primary key default gen_random_uuid(),
  cena_id uuid not null references public.cenas(id) on delete cascade,
  parent_id uuid references public.cena_comentarios(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  texto text check (length(btrim(coalesce(texto,''))) <= 4000),
  anexo jsonb,
  created_at timestamptz not null default now()
);
create index if not exists cena_comentarios_por_cena on public.cena_comentarios(cena_id, created_at);
create index if not exists cena_comentarios_por_pai on public.cena_comentarios(parent_id);

create or replace function public.drk_comentario_valido(p_texto text, p_anexo jsonb, p_dono uuid) returns boolean
language plpgsql immutable set search_path = '' as $$
begin
  if coalesce(btrim(p_texto), '') = '' and p_anexo is null then return false; end if;
  if p_anexo is null then return true; end if;
  if jsonb_typeof(p_anexo) is distinct from 'object' then return false; end if;
  if jsonb_typeof(p_anexo->'tipo') is distinct from 'string' or jsonb_typeof(p_anexo->'nome') is distinct from 'string' then return false; end if;
  if length(p_anexo->>'nome') not between 1 and 240 then return false; end if;
  -- gif/figurinha: url externa (Giphy), sem caminho no nosso Storage
  if (p_anexo->>'tipo') in ('gif','figurinha') then
    return jsonb_typeof(p_anexo->'url') = 'string' and length(p_anexo->>'url') between 1 and 2000;
  end if;
  -- upload próprio: precisa bater com a pasta da conta que gravou
  if (p_anexo->>'tipo') not in ('image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm') then return false; end if;
  return jsonb_typeof(p_anexo->'caminho') = 'string'
    and (p_anexo->>'caminho') ~ ('^' || p_dono::text || '/[0-9a-zA-Z_.-]+\.(jpg|png|webp|gif|mp4|webm)$');
end $$;
alter table public.cena_comentarios drop constraint if exists cena_comentarios_validos;
alter table public.cena_comentarios add constraint cena_comentarios_validos check (public.drk_comentario_valido(texto, anexo, user_id));

alter table public.cena_comentarios enable row level security;
revoke all on public.cena_comentarios from anon, authenticated;
grant select on public.cena_comentarios to authenticated;
grant insert (id,cena_id,parent_id,user_id,texto,anexo) on public.cena_comentarios to authenticated;
grant delete on public.cena_comentarios to authenticated;

drop policy if exists drk_comentarios_ler on public.cena_comentarios;
create policy drk_comentarios_ler on public.cena_comentarios for select to authenticated
  using (public.drk_e_admin() or public.drk_conta_aprovada());

drop policy if exists drk_comentarios_criar on public.cena_comentarios;
create policy drk_comentarios_criar on public.cena_comentarios for insert to authenticated with check (
  user_id = (select auth.uid())
  and public.drk_conta_aprovada()
  and not exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and (p.banido or (p.muted_until is not null and p.muted_until > now()))
  )
);

drop policy if exists drk_comentarios_apagar on public.cena_comentarios;
create policy drk_comentarios_apagar on public.cena_comentarios for delete to authenticated
  using (user_id = (select auth.uid()) or public.drk_e_admin());


-- ------------------------------------------------------------
-- 2) REAÇÕES (uma por pessoa por cena — trocar sobrescreve, upsert)
-- ------------------------------------------------------------

create table if not exists public.cena_reacoes (
  cena_id uuid not null references public.cenas(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  tipo text not null check (tipo in ('curtir','amei','bombastico','nao_gostei')),
  created_at timestamptz not null default now(),
  primary key (cena_id, user_id)
);

alter table public.cena_reacoes enable row level security;
revoke all on public.cena_reacoes from anon, authenticated;
grant select on public.cena_reacoes to authenticated;
grant insert (cena_id,user_id,tipo), update (tipo), delete on public.cena_reacoes to authenticated;

drop policy if exists drk_reacoes_ler on public.cena_reacoes;
create policy drk_reacoes_ler on public.cena_reacoes for select to authenticated
  using (public.drk_e_admin() or public.drk_conta_aprovada());

drop policy if exists drk_reacoes_criar on public.cena_reacoes;
create policy drk_reacoes_criar on public.cena_reacoes for insert to authenticated with check (
  user_id = (select auth.uid())
  and public.drk_conta_aprovada()
  and not exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and (p.banido or (p.muted_until is not null and p.muted_until > now()))
  )
);

drop policy if exists drk_reacoes_trocar on public.cena_reacoes;
create policy drk_reacoes_trocar on public.cena_reacoes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.drk_conta_aprovada());

drop policy if exists drk_reacoes_apagar on public.cena_reacoes;
create policy drk_reacoes_apagar on public.cena_reacoes for delete to authenticated
  using (user_id = (select auth.uid()));


-- ------------------------------------------------------------
-- 3) STORAGE — anexo de comentário, isolado por pasta da conta
-- ------------------------------------------------------------

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('cena_comentarios','cena_comentarios',true,41943040,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict(id) do update set public=true, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists drk_comentarios_upload on storage.objects;
create policy drk_comentarios_upload on storage.objects for insert to authenticated with check (bucket_id='cena_comentarios' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists drk_comentarios_storage_ler on storage.objects;
create policy drk_comentarios_storage_ler on storage.objects for select to authenticated using (bucket_id='cena_comentarios' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists drk_comentarios_storage_apagar on storage.objects;
create policy drk_comentarios_storage_apagar on storage.objects for delete to authenticated using (bucket_id='cena_comentarios' and (storage.foldername(name))[1] = (select auth.uid())::text);

create or replace function public.drk_pode_alterar_midia(bucket text, caminho text) returns boolean
language sql stable security invoker set search_path = '' as $$
select case
  when bucket in ('Characters','fichas') then public.drk_e_admin()
  when bucket = 'cenas' then
    (storage.foldername(caminho))[1] = (select auth.uid())::text
    and not exists(select 1 from public.cenas c where c.id::text = (storage.foldername(caminho))[2])
  when bucket = 'novidades' then (storage.foldername(caminho))[1] = (select auth.uid())::text
  when bucket = 'cena_comentarios' then (storage.foldername(caminho))[1] = (select auth.uid())::text
  else true end;
$$;


-- ------------------------------------------------------------
-- 4) drk_buscar_cenas — agora também traz contagem de comentários,
--    contagem de cada reação e qual reação o próprio usuário deu.
--    Muda de "returns setof cenas" pra "returns table(...)": precisa
--    apagar a função antes (create or replace não troca tipo de retorno).
-- ------------------------------------------------------------

drop function if exists public.drk_buscar_cenas(text,text,text,integer);

create function public.drk_buscar_cenas(p_pessoa text default '', p_local text default '', p_tipo text default '', p_offset integer default 0)
returns table (
  id uuid, user_id uuid, tipo text, titulo text, local text, texto text,
  autor text, personagem text, anexos jsonb, created_at timestamptz,
  total_comentarios bigint, reacoes jsonb, minha_reacao text
)
language sql stable security invoker set search_path = '' as $$
  select
    c.id, c.user_id, c.tipo, c.titulo, c.local, c.texto, c.autor, c.personagem, c.anexos, c.created_at,
    (select count(*) from public.cena_comentarios cc where cc.cena_id = c.id) as total_comentarios,
    (select coalesce(jsonb_object_agg(r.tipo, r.n), '{}'::jsonb) from
      (select tipo, count(*) n from public.cena_reacoes where cena_id = c.id group by tipo) r) as reacoes,
    (select tipo from public.cena_reacoes where cena_id = c.id and user_id = (select auth.uid())) as minha_reacao
  from public.cenas c
  where (coalesce(btrim(p_pessoa),'') = '' or position(public.drk_normalizar_cena(p_pessoa) in public.drk_normalizar_cena(c.autor)) > 0 or position(public.drk_normalizar_cena(p_pessoa) in public.drk_normalizar_cena(c.personagem)) > 0)
    and (coalesce(p_local,'') = '' or public.drk_normalizar_cena(c.local) = public.drk_normalizar_cena(p_local))
    and (coalesce(p_tipo,'') = '' or c.tipo = p_tipo)
  order by c.created_at desc, c.id desc
  limit 21 offset greatest(coalesce(p_offset,0),0);
$$;
revoke all on function public.drk_buscar_cenas(text,text,text,integer) from public;
grant execute on function public.drk_buscar_cenas(text,text,text,integer) to authenticated;

commit;

-- Verificação: deve rodar sem erro e mostrar as colunas novas.
select * from public.drk_buscar_cenas() limit 1;
