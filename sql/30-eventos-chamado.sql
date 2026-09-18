-- DRUKALE / CHAMADO NOS EVENTOS. Execute no SQL Editor do Supabase.
-- Campo livre de "quando" (texto, sem formato de data estrita — igual ao
-- "data" das crônicas) pra dar cara de convocação aos posts do mural de
-- eventos, sem exigir estrutura rígida nem tabela nova.
begin;

alter table public.novidades add column if not exists quando text;

commit;
