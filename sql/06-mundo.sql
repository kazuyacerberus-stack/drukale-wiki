-- ============================================================
-- DRUKALE // O MUNDO EM 3D — tabela dos locais
--
-- Cada império, base, quartel, ruína ou cidadela orbital que você
-- cravar no planeta vira uma linha aqui.
--
-- Rode isto uma única vez no Supabase: SQL Editor > New query > Run
-- É seguro rodar de novo: nada é apagado e nada é duplicado.
-- ============================================================

-- 1) A tabela -------------------------------------------------
-- lat/lon  = onde no planeta (como latitude e longitude da Terra),
--            para o ponto continuar no lugar certo quando o globo gira
--            e não se perder se um dia o desenho do planeta mudar.
-- altitude = 0 é no chão. Acima de 0 é órbita (a cidadela espacial).
create table if not exists public.locais (
  id         uuid primary key default gen_random_uuid(),
  nome       text        not null,
  tipo       text        not null default 'cidade',
  resumo     text,
  lat        double precision not null,
  lon        double precision not null,
  altitude   double precision not null default 0,
  created_at timestamptz not null default now()
);

-- se a tabela já existia de uma tentativa anterior, completa o que falta
alter table public.locais
  add column if not exists resumo     text,
  add column if not exists altitude   double precision not null default 0,
  add column if not exists created_at timestamptz not null default now();

-- só os seis tipos que o painel conhece
alter table public.locais drop constraint if exists locais_tipo_valido;
alter table public.locais add constraint locais_tipo_valido
  check (tipo in ('capital','cidade','base','quartel','ruina','orbital'));

-- coordenada tem que existir de verdade
alter table public.locais drop constraint if exists locais_coordenada_valida;
alter table public.locais add constraint locais_coordenada_valida
  check (lat between -90 and 90 and lon between -180 and 180);

create index if not exists locais_criado_idx on public.locais (created_at);


-- 2) Quem pode o quê ------------------------------------------
-- Mesma regra do resto da wiki: qualquer um lê, só quem está
-- logado cria, edita ou apaga.

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'locais'
  loop
    execute format('drop policy %I on public.locais', p.policyname);
  end loop;
end $$;

alter table public.locais enable row level security;

create policy "drk_local_ler_publico"
  on public.locais for select
  using (true);

create policy "drk_local_criar_logado"
  on public.locais for insert
  to authenticated with check (true);

create policy "drk_local_editar_logado"
  on public.locais for update
  to authenticated using (true) with check (true);

create policy "drk_local_apagar_logado"
  on public.locais for delete
  to authenticated using (true);


-- 3) Confira o resultado --------------------------------------
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'locais'
order by ordinal_position;

select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'locais'
order by cmd;
