-- DRUKALE / CORREÇÃO. Execute o arquivo INTEIRO no SQL Editor do Supabase.
-- O índice único de apelido (criado em sql/09-comunidade.sql) ignorava
-- espaços em branco: "Nome" e "Nome " (com espaço no fim) passavam como
-- contas diferentes, mas aparecem idênticas na tela — dava para se passar
-- por outra conta no chat. Isto troca o índice para também ignorar espaço
-- nas pontas, e não muda nenhum apelido já cadastrado.
begin;

drop index if exists public.profiles_apelido_unico;
create unique index profiles_apelido_unico on public.profiles (lower(btrim(apelido)));

commit;

-- Verificação: se este arquivo rodou sem erro, não existem hoje dois
-- apelidos que só se diferenciam por espaço nas pontas.
