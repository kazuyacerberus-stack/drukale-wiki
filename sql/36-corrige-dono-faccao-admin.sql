-- Corrige facções aprovadas diretamente por um admin/game master, que
-- ficam sem "user_id" (dono/líder) registrado — o formulário só gravava
-- isso pra contas comuns que mandavam pra análise. Sem dono registrado,
-- o site não sabe que você é o líder: não aparece a bandeira no seu
-- perfil, nem o botão de convidar/aceitar gente na página da facção.
--
-- Troque os dois valores abaixo pelos seus e rode no SQL Editor do
-- Supabase. "seu-slug-aqui" é o endereço da facção (o que aparece em
-- /faccoes/<isto-aqui>); o e-mail é o da sua conta de login.

update public.faccoes
set user_id = (select id from auth.users where email = 'seu-email@exemplo.com')
where slug = 'seu-slug-aqui';
