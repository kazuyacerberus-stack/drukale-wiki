-- DRUKALE / BIO E CAPA DO PERFIL. Execute no SQL Editor do Supabase.
-- Sem tabela nem bucket novo — a capa entra no bucket "avatars" que já
-- existe, na mesma pasta por conta (as políticas de storage desse bucket
-- já isolam por pasta, não por nome de arquivo, então já cobrem o
-- arquivo novo automaticamente).
begin;

alter table public.profiles add column if not exists bio text check (length(bio) <= 300);
alter table public.profiles add column if not exists capa_url text;

commit;
