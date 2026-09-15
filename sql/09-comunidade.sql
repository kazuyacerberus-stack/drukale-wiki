-- DRUKALE / COMUNIDADE. Execute o arquivo INTEIRO no SQL Editor do Supabase.
-- Cria perfis (apelido + avatar), moderação (silenciar/expulsar) e o chat.
-- Não apaga nem duplica cenas, personagens, locais ou contas existentes.
begin;

-- ------------------------------------------------------------
-- 1) PERFIS (apelido + avatar de cada conta)
-- ------------------------------------------------------------

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  apelido text not null check (length(btrim(apelido)) between 2 and 32),
  avatar_url text,
  muted_until timestamptz,
  banido boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_apelido_unico on public.profiles (lower(apelido));

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
-- a tabela nunca guarda e-mail, então liberar a leitura para todo logado não vaza nada sensível
grant select on public.profiles to authenticated;
grant insert (user_id, apelido, avatar_url) on public.profiles to authenticated;
grant update (apelido, avatar_url) on public.profiles to authenticated;

drop policy if exists drk_perfil_ler on public.profiles;
create policy drk_perfil_ler on public.profiles for select to authenticated using (true);
drop policy if exists drk_perfil_criar on public.profiles;
create policy drk_perfil_criar on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists drk_perfil_editar on public.profiles;
create policy drk_perfil_editar on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- cria um perfil para toda conta que já existia antes deste arquivo (inclusive o admin)
insert into public.profiles(user_id, apelido)
select id, left(regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g'), 24) || '_' || substr(id::text, 1, 4)
from auth.users
on conflict (user_id) do nothing;


-- ------------------------------------------------------------
-- 2) MODERAÇÃO — só o administrador consegue chamar
-- ------------------------------------------------------------

create or replace function public.drk_silenciar_usuario(alvo uuid, ate timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.drk_e_admin() then
    raise exception 'Apenas o administrador pode moderar contas.';
  end if;
  update public.profiles set muted_until = ate where user_id = alvo;
end $$;
revoke all on function public.drk_silenciar_usuario(uuid, timestamptz) from public;
grant execute on function public.drk_silenciar_usuario(uuid, timestamptz) to authenticated;

create or replace function public.drk_expulsar_usuario(alvo uuid, expulso boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.drk_e_admin() then
    raise exception 'Apenas o administrador pode moderar contas.';
  end if;
  update public.profiles set banido = expulso where user_id = alvo;
end $$;
revoke all on function public.drk_expulsar_usuario(uuid, boolean) from public;
grant execute on function public.drk_expulsar_usuario(uuid, boolean) to authenticated;

-- lista todas as contas com e-mail: só o administrador enxerga alguma coisa
create or replace function public.drk_admin_listar_perfis()
returns table(user_id uuid, email text, apelido text, avatar_url text, muted_until timestamptz, banido boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.drk_e_admin() then
    raise exception 'Apenas o administrador pode ver esta lista.';
  end if;
  return query
    select p.user_id, u.email, p.apelido, p.avatar_url, p.muted_until, p.banido, p.created_at
    from public.profiles p join auth.users u on u.id = p.user_id
    order by p.created_at desc;
end $$;
revoke all on function public.drk_admin_listar_perfis() from public;
grant execute on function public.drk_admin_listar_perfis() to authenticated;


-- ------------------------------------------------------------
-- 3) CENAS — quem está silenciado ou expulso não publica mais
-- ------------------------------------------------------------

drop policy if exists drk_cenas_criar on public.cenas;
create policy drk_cenas_criar on public.cenas for insert to authenticated with check (
  user_id = (select auth.uid())
  and not exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and (p.banido or (p.muted_until is not null and p.muted_until > now()))
  )
);


-- ------------------------------------------------------------
-- 4) CHAT — só quem está logado lê e escreve
-- ------------------------------------------------------------

create table if not exists public.chat_mensagens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  texto text check (texto is null or length(btrim(texto)) between 1 and 4000),
  anexo jsonb,
  created_at timestamptz not null default now(),
  constraint chat_tem_conteudo check (texto is not null or anexo is not null)
);
create index if not exists chat_ordem on public.chat_mensagens(created_at desc, id desc);

create or replace function public.drk_anexo_chat_valido(valor jsonb, dono uuid) returns boolean
language plpgsql immutable set search_path = '' as $$
begin
  if valor is null then return true; end if;
  if jsonb_typeof(valor) is distinct from 'object' then return false; end if;
  if jsonb_typeof(valor->'tipo') is distinct from 'string'
    or jsonb_typeof(valor->'nome') is distinct from 'string'
    or (valor->>'tipo') not in ('imagem','video','figurinha','gif') then return false; end if;
  if length(valor->>'nome') not between 1 and 240 then return false; end if;
  if (valor->>'tipo') in ('gif','figurinha') then
    return jsonb_typeof(valor->'url') = 'string' and (valor->>'url') ~ '^https://[a-z0-9.-]+\.giphy\.com/';
  else
    return jsonb_typeof(valor->'caminho') = 'string'
      and (valor->>'caminho') ~ ('^' || dono::text || '/[0-9a-f-]+\.(jpg|jpeg|png|webp|gif|mp4|webm)$');
  end if;
end $$;
alter table public.chat_mensagens drop constraint if exists chat_anexo_valido;
alter table public.chat_mensagens add constraint chat_anexo_valido check (public.drk_anexo_chat_valido(anexo, user_id));

alter table public.chat_mensagens enable row level security;
revoke all on public.chat_mensagens from anon, authenticated;
grant select on public.chat_mensagens to authenticated;
grant insert (id, user_id, texto, anexo) on public.chat_mensagens to authenticated;

drop policy if exists drk_chat_ler on public.chat_mensagens;
create policy drk_chat_ler on public.chat_mensagens for select to authenticated using (
  public.drk_e_admin()
  or not exists (select 1 from public.profiles p where p.user_id = chat_mensagens.user_id and p.banido)
);
drop policy if exists drk_chat_escrever on public.chat_mensagens;
create policy drk_chat_escrever on public.chat_mensagens for insert to authenticated with check (
  user_id = (select auth.uid())
  and not exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and (p.banido or (p.muted_until is not null and p.muted_until > now()))
  )
);

-- entrega em tempo real: se já estiver ligado, ignora o erro de duplicidade
do $$ begin
  alter publication supabase_realtime add table public.chat_mensagens;
exception when duplicate_object then null;
end $$;


-- ------------------------------------------------------------
-- 5) STORAGE — buckets "avatars" e "chat"
-- ------------------------------------------------------------

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do update set public=true, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('chat','chat',true,41943040,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict(id) do update set public=true, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists drk_avatar_upload on storage.objects;
create policy drk_avatar_upload on storage.objects for insert to authenticated with check (bucket_id='avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists drk_avatar_update on storage.objects;
create policy drk_avatar_update on storage.objects for update to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id='avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists drk_avatar_ler on storage.objects;
create policy drk_avatar_ler on storage.objects for select to authenticated using (bucket_id='avatars');
drop policy if exists drk_avatar_apagar on storage.objects;
create policy drk_avatar_apagar on storage.objects for delete to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists drk_chat_upload on storage.objects;
create policy drk_chat_upload on storage.objects for insert to authenticated with check (bucket_id='chat' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists drk_chat_storage_ler on storage.objects;
create policy drk_chat_storage_ler on storage.objects for select to authenticated using (bucket_id='chat');

-- estende o isolamento por pasta (definido em sql/08-cenas.sql) para os buckets novos
create or replace function public.drk_pode_alterar_midia(bucket text, caminho text) returns boolean
language sql stable security invoker set search_path = '' as $$
select case
  when bucket in ('Characters','fichas') then public.drk_e_admin()
  when bucket = 'cenas' then
    (storage.foldername(caminho))[1] = (select auth.uid())::text
    and not exists(select 1 from public.cenas c where c.id::text = (storage.foldername(caminho))[2])
  when bucket = 'avatars' then (storage.foldername(caminho))[1] = (select auth.uid())::text
  when bucket = 'chat' then
    (storage.foldername(caminho))[1] = (select auth.uid())::text
    and not exists(select 1 from public.chat_mensagens m where m.anexo->>'caminho' = caminho)
  else true end;
$$;

commit;

-- Verificação: deve mostrar um perfil por conta existente, e os buckets avatars/chat.
select user_id, apelido, banido from public.profiles order by created_at;
select id, public, file_size_limit from storage.buckets where id in ('avatars','chat');
