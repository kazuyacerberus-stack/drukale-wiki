-- DRUKALE / RESERVA DE IMAGENS. Execute o arquivo INTEIRO no SQL Editor do
-- Supabase, depois de sql/34-regra-perguntas.sql.
--
-- O jogador reserva uma imagem para o personagem dele. Cada imagem tem uso
-- único: o mesmo personagem de um mesmo universo só pode ser reservado uma
-- vez, e o mesmo arquivo de imagem também. Imagem de autoria própria não
-- entra na trava por personagem (só na trava por arquivo).
--
-- Quem pode o quê:
--   ver e reservar   -> qualquer conta aprovada (não banida/silenciada, pra reservar)
--   liberar (apagar) -> quem reservou, ou administrador
begin;

create table if not exists public.reservas_imagens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  -- o personagem do jogador que vai usar a imagem
  nome text not null check (length(btrim(nome)) between 1 and 120),
  faccao text check (faccao is null or length(faccao) <= 120),
  raca text check (raca is null or length(raca) <= 120),
  classe text check (classe is null or length(classe) <= 120),
  subclasse text check (subclasse is null or length(subclasse) <= 120),
  -- o personagem que aparece na imagem e de que universo ele vem
  personagem text not null check (length(btrim(personagem)) between 1 and 120),
  universo text not null check (length(btrim(universo)) between 1 and 120),
  autoral boolean not null default false,
  titulo text not null check (length(btrim(titulo)) between 1 and 160),
  caminho text not null,
  imagem_hash text not null check (imagem_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  -- personagem+universo sem acento, maiúscula ou espaço a mais: é a chave da "uma vez só"
  chave text generated always as (
    regexp_replace(
      translate(lower(btrim(personagem) || '|' || btrim(universo)),
        'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ',
        'aaaaaaeeeeiiiiooooouuuucnyy'),
      '\s+', ' ', 'g')
  ) stored,
  constraint reservas_imagens_caminho_da_conta check (caminho ~ ('^' || user_id::text || '/[0-9a-zA-Z_.-]+\.(jpg|png|webp|gif)$'))
);

create unique index if not exists reservas_imagens_chave_unica on public.reservas_imagens(chave) where not autoral;
create unique index if not exists reservas_imagens_hash_unico on public.reservas_imagens(imagem_hash);
create index if not exists reservas_imagens_por_data on public.reservas_imagens(created_at desc);
create index if not exists reservas_imagens_por_dono on public.reservas_imagens(user_id);

alter table public.reservas_imagens enable row level security;
revoke all on public.reservas_imagens from anon, authenticated;
grant select on public.reservas_imagens to authenticated;
grant insert (user_id, nome, faccao, raca, classe, subclasse, personagem, universo, autoral, titulo, caminho, imagem_hash) on public.reservas_imagens to authenticated;
grant delete on public.reservas_imagens to authenticated;

drop policy if exists drk_reservas_ler on public.reservas_imagens;
create policy drk_reservas_ler on public.reservas_imagens for select to authenticated
  using (public.drk_e_admin() or public.drk_conta_aprovada());

drop policy if exists drk_reservas_criar on public.reservas_imagens;
create policy drk_reservas_criar on public.reservas_imagens for insert to authenticated
  with check (user_id = (select auth.uid()) and public.drk_conta_pode_agir());

drop policy if exists drk_reservas_liberar on public.reservas_imagens;
create policy drk_reservas_liberar on public.reservas_imagens for delete to authenticated
  using (user_id = (select auth.uid()) or public.drk_e_admin());


-- ------------------------------------------------------------
-- STORAGE — a imagem fica na pasta da própria conta; leitura pública pela URL
-- ------------------------------------------------------------

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('reservas', 'reservas', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists drk_reservas_img_ler on storage.objects;
create policy drk_reservas_img_ler on storage.objects for select using (bucket_id = 'reservas');
drop policy if exists drk_reservas_img_enviar on storage.objects;
create policy drk_reservas_img_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'reservas' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists drk_reservas_img_apagar on storage.objects;
create policy drk_reservas_img_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'reservas' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.drk_e_admin()));

commit;

-- Verificação: deve devolver 0.
select count(*) as reservas from public.reservas_imagens;
