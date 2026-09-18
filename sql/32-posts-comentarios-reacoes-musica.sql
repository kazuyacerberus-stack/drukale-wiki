-- DRUKALE / COMENTÁRIOS, REAÇÕES E MÚSICA NAS POSTAGENS DE PERFIL.
-- Execute o arquivo INTEIRO no SQL Editor do Supabase, depois de
-- sql/28-corrige-recursao-perfil-posts.sql. Mesmo espírito de
-- sql/25-comentarios-e-reacoes.sql (cenas), agora pras postagens de
-- perfil/linha-do-tempo: comentar, reagir, e anexar foto/vídeo/GIF +
-- um link de música (YouTube/Spotify — sem upload de áudio).
begin;

-- ------------------------------------------------------------
-- 1) VALIDAÇÃO DE CONTEÚDO — reaproveita a checagem de anexo que já
--    existia dentro de drk_comentario_valido (sql/25), agora separada
--    numa função própria pra também servir posts+comentários com
--    música. drk_comentario_valido continua se comportando exatamente
--    igual pra cena_comentarios — só passou a delegar.
-- ------------------------------------------------------------

create or replace function public.drk_anexo_valido(p_anexo jsonb, p_dono uuid) returns boolean
language plpgsql immutable set search_path = '' as $$
begin
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

create or replace function public.drk_comentario_valido(p_texto text, p_anexo jsonb, p_dono uuid) returns boolean
language plpgsql immutable set search_path = '' as $$
begin
  if coalesce(btrim(p_texto), '') = '' and p_anexo is null then return false; end if;
  return public.drk_anexo_valido(p_anexo, p_dono);
end $$;

create or replace function public.drk_musica_valida(p_musica jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
begin
  if p_musica is null then return true; end if;
  if jsonb_typeof(p_musica) is distinct from 'object' then return false; end if;
  if (p_musica->>'provedor') not in ('youtube','spotify') then return false; end if;
  if jsonb_typeof(p_musica->'url') is distinct from 'string' then return false; end if;
  if length(p_musica->>'url') not between 1 and 500 then return false; end if;
  return true;
end $$;

create or replace function public.drk_post_conteudo_valido(p_texto text, p_anexo jsonb, p_musica jsonb, p_dono uuid) returns boolean
language plpgsql immutable set search_path = '' as $$
begin
  if coalesce(btrim(p_texto), '') = '' and p_anexo is null and p_musica is null then return false; end if;
  return public.drk_anexo_valido(p_anexo, p_dono) and public.drk_musica_valida(p_musica);
end $$;


-- ------------------------------------------------------------
-- 2) MÚSICA EM PERFIL_POSTS — coluna independente do anexo: uma
--    postagem pode ter os dois juntos (ex.: foto + música).
-- ------------------------------------------------------------

alter table public.perfil_posts add column if not exists musica jsonb;

alter table public.perfil_posts drop constraint if exists perfil_posts_validos;
alter table public.perfil_posts add constraint perfil_posts_validos check (public.drk_post_conteudo_valido(texto, anexo, musica, user_id));

grant insert (id,user_id,texto,anexo,musica,visibilidade) on public.perfil_posts to authenticated;


-- ------------------------------------------------------------
-- 3) VISIBILIDADE COMPARTILHADA — quem pode ver um post também pode
--    ver (e comentar/reagir n)e comentários/reações dele. Mesmo molde
--    de drk_sou_dono_do_post/drk_na_audiencia_do_post (sql/28):
--    security definer pra não reacionar a própria RLS de perfil_posts.
-- ------------------------------------------------------------

create or replace function public.drk_posso_ver_post(alvo_post uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfil_posts p
    where p.id = alvo_post
    and (
      public.drk_e_admin()
      or p.user_id = (select auth.uid())
      or (
        public.drk_conta_aprovada() and (
          p.visibilidade = 'publico'
          or (p.visibilidade = 'amigos' and exists (
            select 1 from public.amizades where solicitante = (select auth.uid()) and destinatario = p.user_id and status = 'aceita'
          ))
          or (p.visibilidade = 'personalizado' and public.drk_na_audiencia_do_post(p.id))
        )
      )
    )
  );
$$;
revoke all on function public.drk_posso_ver_post(uuid) from public;
grant execute on function public.drk_posso_ver_post(uuid) to authenticated;


-- ------------------------------------------------------------
-- 4) COMENTÁRIOS DE POST (e respostas — parent_id aponta pra outro
--    comentário), com anexo e música igual à postagem.
-- ------------------------------------------------------------

create table if not exists public.perfil_post_comentarios (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.perfil_posts(id) on delete cascade,
  parent_id uuid references public.perfil_post_comentarios(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  texto text check (length(btrim(coalesce(texto,''))) <= 4000),
  anexo jsonb,
  musica jsonb,
  created_at timestamptz not null default now()
);
create index if not exists perfil_post_comentarios_por_post on public.perfil_post_comentarios(post_id, created_at);
create index if not exists perfil_post_comentarios_por_pai on public.perfil_post_comentarios(parent_id);

alter table public.perfil_post_comentarios drop constraint if exists perfil_post_comentarios_validos;
alter table public.perfil_post_comentarios add constraint perfil_post_comentarios_validos check (public.drk_post_conteudo_valido(texto, anexo, musica, user_id));

alter table public.perfil_post_comentarios enable row level security;
revoke all on public.perfil_post_comentarios from anon, authenticated;
grant select on public.perfil_post_comentarios to authenticated;
grant insert (id,post_id,parent_id,user_id,texto,anexo,musica) on public.perfil_post_comentarios to authenticated;
grant delete on public.perfil_post_comentarios to authenticated;

drop policy if exists drk_post_comentarios_ler on public.perfil_post_comentarios;
create policy drk_post_comentarios_ler on public.perfil_post_comentarios for select to authenticated
  using (public.drk_e_admin() or public.drk_posso_ver_post(post_id));

drop policy if exists drk_post_comentarios_criar on public.perfil_post_comentarios;
create policy drk_post_comentarios_criar on public.perfil_post_comentarios for insert to authenticated with check (
  user_id = (select auth.uid()) and public.drk_conta_pode_agir() and public.drk_posso_ver_post(post_id)
);

drop policy if exists drk_post_comentarios_apagar on public.perfil_post_comentarios;
create policy drk_post_comentarios_apagar on public.perfil_post_comentarios for delete to authenticated
  using (user_id = (select auth.uid()) or public.drk_e_admin());


-- ------------------------------------------------------------
-- 5) REAÇÕES DE POST — uma por pessoa por post, mesmo conjunto de
--    Cenas (sql/25): trocar sobrescreve (upsert direto do cliente).
-- ------------------------------------------------------------

create table if not exists public.perfil_post_reacoes (
  post_id uuid not null references public.perfil_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  tipo text not null check (tipo in ('curtir','amei','bombastico','nao_gostei')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.perfil_post_reacoes enable row level security;
revoke all on public.perfil_post_reacoes from anon, authenticated;
grant select on public.perfil_post_reacoes to authenticated;
grant insert (post_id,user_id,tipo), update (tipo), delete on public.perfil_post_reacoes to authenticated;

drop policy if exists drk_post_reacoes_ler on public.perfil_post_reacoes;
create policy drk_post_reacoes_ler on public.perfil_post_reacoes for select to authenticated
  using (public.drk_e_admin() or public.drk_posso_ver_post(post_id));

drop policy if exists drk_post_reacoes_criar on public.perfil_post_reacoes;
create policy drk_post_reacoes_criar on public.perfil_post_reacoes for insert to authenticated with check (
  user_id = (select auth.uid()) and public.drk_conta_pode_agir() and public.drk_posso_ver_post(post_id)
);

drop policy if exists drk_post_reacoes_trocar on public.perfil_post_reacoes;
create policy drk_post_reacoes_trocar on public.perfil_post_reacoes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.drk_conta_pode_agir());

drop policy if exists drk_post_reacoes_apagar on public.perfil_post_reacoes;
create policy drk_post_reacoes_apagar on public.perfil_post_reacoes for delete to authenticated
  using (user_id = (select auth.uid()));


-- ------------------------------------------------------------
-- 6) BUSCA COM AGREGADOS — mesmo molde de drk_buscar_cenas (sql/25):
--    total de comentários, contagem por reação e qual reação é minha.
-- ------------------------------------------------------------

create or replace function public.drk_buscar_posts_perfil(alvo uuid)
returns table (
  id uuid, user_id uuid, texto text, anexo jsonb, musica jsonb, visibilidade text, created_at timestamptz,
  total_comentarios bigint, reacoes jsonb, minha_reacao text
)
language sql stable security invoker set search_path = '' as $$
  select
    p.id, p.user_id, p.texto, p.anexo, p.musica, p.visibilidade, p.created_at,
    (select count(*) from public.perfil_post_comentarios pc where pc.post_id = p.id) as total_comentarios,
    (select coalesce(jsonb_object_agg(r.tipo, r.n), '{}'::jsonb) from
      (select tipo, count(*) n from public.perfil_post_reacoes where post_id = p.id group by tipo) r) as reacoes,
    (select tipo from public.perfil_post_reacoes where post_id = p.id and user_id = (select auth.uid())) as minha_reacao
  from public.perfil_posts p
  where p.user_id = alvo
  order by p.created_at desc;
$$;
revoke all on function public.drk_buscar_posts_perfil(uuid) from public;
grant execute on function public.drk_buscar_posts_perfil(uuid) to authenticated;

create or replace function public.drk_buscar_feed_publico(p_offset integer default 0)
returns table (
  id uuid, user_id uuid, texto text, anexo jsonb, musica jsonb, visibilidade text, created_at timestamptz,
  total_comentarios bigint, reacoes jsonb, minha_reacao text
)
language sql stable security invoker set search_path = '' as $$
  select
    p.id, p.user_id, p.texto, p.anexo, p.musica, p.visibilidade, p.created_at,
    (select count(*) from public.perfil_post_comentarios pc where pc.post_id = p.id) as total_comentarios,
    (select coalesce(jsonb_object_agg(r.tipo, r.n), '{}'::jsonb) from
      (select tipo, count(*) n from public.perfil_post_reacoes where post_id = p.id group by tipo) r) as reacoes,
    (select tipo from public.perfil_post_reacoes where post_id = p.id and user_id = (select auth.uid())) as minha_reacao
  from public.perfil_posts p
  where p.visibilidade = 'publico'
  order by p.created_at desc, p.id desc
  limit 21 offset greatest(coalesce(p_offset,0),0);
$$;
revoke all on function public.drk_buscar_feed_publico(integer) from public;
grant execute on function public.drk_buscar_feed_publico(integer) to authenticated;

commit;

-- Verificação: deve rodar sem erro e mostrar as colunas novas.
select * from public.drk_buscar_feed_publico() limit 1;
