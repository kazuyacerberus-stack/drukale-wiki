-- ============================================================
-- DRUKALE // AMPLIAÇÃO DA FICHA DE PERSONAGEM
-- Rode isto uma única vez no Supabase: SQL Editor > New query > Run
-- É seguro rodar de novo: nada é apagado e nada é duplicado.
-- ============================================================

-- 1) Novas colunas da ficha ----------------------------------
alter table characters
  add column if not exists slug        text,  -- endereço da página: /personagem/elsharion
  add column if not exists epithet     text,  -- epíteto / alcunha
  add column if not exists quote       text,  -- citação em destaque
  add column if not exists history     text,  -- história completa
  add column if not exists powers      text,  -- poderes e habilidades
  add column if not exists faction     text,  -- facção / casa
  add column if not exists status      text,  -- vivo, morto, desaparecido...
  add column if not exists race        text,  -- raça / origem
  add column if not exists affiliation text,  -- afiliações
  add column if not exists created_at  timestamptz default now();


-- 2) Gera o endereço dos personagens que já existem ----------
create extension if not exists unaccent;

with base as (
  select
    id,
    coalesce(
      nullif(
        trim(both '-' from
          regexp_replace(lower(unaccent(coalesce(name, ''))), '[^a-z0-9]+', '-', 'g')
        ),
        ''
      ),
      'personagem-' || id::text
    ) as s
  from characters
  where slug is null or slug = ''
),
numerado as (
  select id, s, row_number() over (partition by s order by id) as n
  from base
)
update characters c
set slug = case when numerado.n = 1 then numerado.s
                else numerado.s || '-' || numerado.n::text end
from numerado
where c.id = numerado.id;


-- 3) Impede dois personagens com o mesmo endereço ------------
create unique index if not exists characters_slug_key on characters (slug);


-- 4) Confira o resultado -------------------------------------
select id, slug, name, epithet, faction, status from characters order by id;
