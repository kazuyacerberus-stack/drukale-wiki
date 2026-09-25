-- DRUKALE / RAIO DO TERRITÓRIO. Execute no SQL Editor do Supabase.
--
-- Cada local ganha um raio: o tamanho da região que ele ocupa no globo,
-- desenhado no mapa como uma fronteira tracejada. Guardado em GRAUS de
-- arco (1° ≈ 111 km na escala da Terra); 0 = só o ponto, sem região.
-- Nada existente muda: todo local antigo nasce com raio 0.
alter table public.locais add column if not exists raio double precision not null default 0;

alter table public.locais drop constraint if exists locais_raio_valido;
alter table public.locais add constraint locais_raio_valido check (raio >= 0 and raio <= 30);

-- Verificação: deve listar a coluna nova
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'locais' and column_name = 'raio';
