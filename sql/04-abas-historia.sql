-- ============================================================
-- DRUKALE // ABAS DE HISTÓRIA
-- Rode isto uma única vez no Supabase: SQL Editor > New query > Run
-- É seguro rodar de novo: nada é apagado e nada é duplicado.
-- ============================================================

-- 1) A coluna que guarda as abas -----------------------------
-- Cada aba é um par { "titulo": "...", "texto": "..." } e a ordem
-- das abas na página é a ordem em que elas aparecem na lista.
alter table characters
  add column if not exists sections jsonb not null default '[]'::jsonb;


-- 2) Aproveita o que já estava escrito -----------------------
-- Quem já tinha história e/ou poderes ganha essas abas prontas.
-- O "where sections = '[]'" garante que rodar de novo não duplica:
-- quem já tem abas passa batido.
update characters
set sections =
  (case
     when history is not null and btrim(history) <> ''
     then jsonb_build_array(jsonb_build_object('titulo', 'História', 'texto', history))
     else '[]'::jsonb
   end)
  ||
  (case
     when powers is not null and btrim(powers) <> ''
     then jsonb_build_array(jsonb_build_object('titulo', 'Poderes e habilidades', 'texto', powers))
     else '[]'::jsonb
   end)
where sections = '[]'::jsonb;


-- 3) Confira o resultado -------------------------------------
-- A coluna "abas" mostra os títulos que cada personagem ficou tendo.
select
  name,
  jsonb_array_length(sections) as qtd_abas,
  (
    select string_agg(x->>'titulo', ' | ')
    from jsonb_array_elements(sections) as x
  ) as abas
from characters
order by name;


-- ============================================================
-- OBSERVAÇÃO
-- As colunas history e powers continuam no banco, intactas, como
-- cópia de segurança. O site não escreve mais nelas — passa a usar
-- só a coluna sections. Se algum dia quiser conferir o texto antigo:
--
--   select name, history, powers from characters;
-- ============================================================
