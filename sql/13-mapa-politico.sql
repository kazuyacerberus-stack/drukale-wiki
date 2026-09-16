-- DRUKALE / MAPA POLÍTICO. Execute o arquivo INTEIRO no SQL Editor do Supabase.
-- Adiciona a coluna que diz de qual facção é cada local. Não apaga nem
-- duplica nada existente.
begin;

alter table public.locais add column if not exists faccao text;

commit;

-- Verificação: deve mostrar a coluna "faccao" na lista, vazia até você atribuir alguma.
select id, nome, tipo, faccao from public.locais order by nome;
