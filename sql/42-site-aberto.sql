-- ============================================================
-- TERRA SAVE // SITE ABERTO PARA LEITURA
--
-- Execute o arquivo INTEIRO no SQL Editor do Supabase.
--
-- O que muda: qualquer pessoa, mesmo sem conta, passa a VER o
-- conteúdo do jogo — fichas, cenas (e seus comentários e reações),
-- facções e membros, eventos/crônicas, mapa, regras (e ideias e
-- perguntas), reserva de imagens, novidades, posts PÚBLICOS de perfil
-- e o nome/avatar/bio dos jogadores.
--
-- O que NÃO muda:
--   * escrever continua exigindo conta (publicar, comentar, reagir,
--     propor ficha/facção/território) — nenhuma regra de escrita é
--     tocada aqui;
--   * tudo que é do Adm continua só do Adm (aprovar, reprovar,
--     moderar, editar conteúdo oficial);
--   * continua privado: chat, amizades, posts "amigos"/"personalizado",
--     e os dados de moderação do perfil (status da conta, motivo de
--     reprovação, silenciamento);
--   * conteúdo pendente ou reprovado: o visitante sem conta só vê o
--     que já está APROVADO.
--
-- Tudo roda numa transação: se qualquer linha falhar, nada é aplicado.
-- Para desfazer, rode de novo o sql/22-conta-aprovacao-e-acesso.sql.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) CONTEÚDO DO JOGO SEM ETAPA DE APROVAÇÃO: leitura livre
-- ------------------------------------------------------------

drop policy if exists drk_cenas_ler on public.cenas;
create policy drk_cenas_ler on public.cenas
  for select to anon, authenticated using (true);

drop policy if exists drk_comentarios_ler on public.cena_comentarios;
create policy drk_comentarios_ler on public.cena_comentarios
  for select to anon, authenticated using (true);

drop policy if exists drk_reacoes_ler on public.cena_reacoes;
create policy drk_reacoes_ler on public.cena_reacoes
  for select to anon, authenticated using (true);

drop policy if exists drk_glossario_ler on public.glossario;
create policy drk_glossario_ler on public.glossario
  for select to anon, authenticated using (true);

drop policy if exists drk_novidades_ler on public.novidades;
create policy drk_novidades_ler on public.novidades
  for select to anon, authenticated using (true);

drop policy if exists drk_regras_ler on public.regras;
create policy drk_regras_ler on public.regras
  for select to anon, authenticated using (true);

drop policy if exists drk_regra_comentarios_ler on public.regra_comentarios;
create policy drk_regra_comentarios_ler on public.regra_comentarios
  for select to anon, authenticated using (true);

drop policy if exists drk_regra_perguntas_ler on public.regra_perguntas;
create policy drk_regra_perguntas_ler on public.regra_perguntas
  for select to anon, authenticated using (true);

drop policy if exists drk_reservas_ler on public.reservas_imagens;
create policy drk_reservas_ler on public.reservas_imagens
  for select to anon, authenticated using (true);


-- ------------------------------------------------------------
-- 2) CONTEÚDO COM APROVAÇÃO: o visitante vê só o aprovado.
--    Membro aprovado e Adm continuam vendo o mesmo que antes;
--    o autor continua vendo o que ele mesmo enviou.
-- ------------------------------------------------------------

drop policy if exists drk_ler_publico on public.characters;
create policy drk_ler_publico on public.characters
  for select to anon, authenticated using (
    status_aprovacao = 'aprovado'
    or public.drk_e_admin()
    or public.drk_conta_aprovada()
    or user_id = (select auth.uid())
  );

drop policy if exists drk_eventos_ler on public.eventos;
create policy drk_eventos_ler on public.eventos
  for select to anon, authenticated using (
    status_aprovacao = 'aprovado'
    or public.drk_e_admin()
    or public.drk_conta_aprovada()
    or user_id = (select auth.uid())
  );

drop policy if exists drk_faccoes_ler on public.faccoes;
create policy drk_faccoes_ler on public.faccoes
  for select to anon, authenticated using (
    status_aprovacao = 'aprovado'
    or public.drk_e_admin()
    or public.drk_conta_aprovada()
    or user_id = (select auth.uid())
  );

drop policy if exists "drk_local_ler_publico" on public.locais;
create policy "drk_local_ler_publico" on public.locais
  for select to anon, authenticated using (
    status_aprovacao = 'aprovado'
    or public.drk_e_admin()
    or user_id = (select auth.uid())
  );

-- membros de facção: filiação aceita é pública; pedido pendente
-- continua visível só para o próprio, o líder e o Adm
drop policy if exists drk_faccao_membros_ler on public.faccao_membros;
create policy drk_faccao_membros_ler on public.faccao_membros
  for select to anon, authenticated using (
    status = 'aceito'
    or public.drk_e_admin()
    or user_id = (select auth.uid())
    or exists (select 1 from public.faccoes f
               where f.id = faccao_membros.faccao_id and f.user_id = (select auth.uid()))
  );


-- ------------------------------------------------------------
-- 3) PERFIS DE JOGADOR: o visitante vê só a parte pública.
--    A permissão é por COLUNA: status da conta, motivo de
--    reprovação e silenciamento ficam de fora para quem não entrou.
-- ------------------------------------------------------------

drop policy if exists drk_perfil_ler on public.profiles;
create policy drk_perfil_ler on public.profiles
  for select to anon, authenticated using (true);

revoke select on public.profiles from anon;
grant select (user_id, apelido, avatar_url, bio, capa_url, banido, created_at)
  on public.profiles to anon;


-- ------------------------------------------------------------
-- 4) POSTS DE PERFIL: só os marcados "público" abrem.
--    "amigos" e "personalizado" seguem com as regras de antes.
-- ------------------------------------------------------------

drop policy if exists drk_perfil_posts_ler_publico on public.perfil_posts;
create policy drk_perfil_posts_ler_publico on public.perfil_posts
  for select to anon, authenticated using (visibilidade = 'publico');

-- comentários e reações de post seguem quem pode ver o post: a
-- função passa a reconhecer post público para qualquer pessoa
create or replace function public.drk_posso_ver_post(alvo_post uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfil_posts p
    where p.id = alvo_post
    and (
      p.visibilidade = 'publico'
      or public.drk_e_admin()
      or p.user_id = (select auth.uid())
      or (
        public.drk_conta_aprovada() and (
          (p.visibilidade = 'amigos' and exists (
            select 1 from public.amizades
            where solicitante = (select auth.uid()) and destinatario = p.user_id and status = 'aceita'
          ))
          or (p.visibilidade = 'personalizado' and public.drk_na_audiencia_do_post(p.id))
        )
      )
    )
  );
$$;


-- ------------------------------------------------------------
-- 5) PERMISSÕES DE TABELA para o visitante (a RLS acima decide
--    as LINHAS; isto libera a tabela em si). Só leitura.
-- ------------------------------------------------------------

grant select on
  public.characters, public.locais, public.cenas, public.cena_comentarios, public.cena_reacoes,
  public.faccoes, public.faccao_membros, public.eventos, public.glossario, public.novidades,
  public.regras, public.regra_comentarios, public.regra_perguntas, public.reservas_imagens,
  public.perfil_posts, public.perfil_post_comentarios, public.perfil_post_reacoes
to anon;


-- ------------------------------------------------------------
-- 6) FUNÇÕES que as páginas públicas e as regras acima chamam.
--    Nenhuma função de AÇÃO (aprovar, amizade, facção...) entra
--    aqui — essas continuam só para quem tem conta.
-- ------------------------------------------------------------

do $$
declare
  assinatura text;
begin
  foreach assinatura in array array[
    'public.drk_e_admin()',
    'public.drk_conta_aprovada()',
    'public.drk_posso_ver_post(uuid)',
    'public.drk_buscar_cenas(text,text,text,integer)',
    'public.drk_filtros_cenas()',
    'public.drk_buscar_feed_publico(integer)',
    'public.drk_buscar_posts_perfil(uuid)',
    'public.drk_atividade_perfil(uuid)'
  ] loop
    if to_regprocedure(assinatura) is not null then
      execute format('grant execute on function %s to anon, authenticated', assinatura);
    else
      raise notice 'função não encontrada (ignorada): %', assinatura;
    end if;
  end loop;
end $$;

commit;


-- ------------------------------------------------------------
-- CONFERÊNCIA: o que um visitante sem conta enxerga agora.
-- Todas as linhas devem vir com visitante_le = true.
-- ------------------------------------------------------------

select t as tabela, has_table_privilege('anon', 'public.' || t, 'select') as visitante_le
from unnest(array[
  'characters','locais','cenas','faccoes','eventos','regras','reservas_imagens','perfil_posts'
]) as t
union all
select 'profiles (apelido)', has_column_privilege('anon', 'public.profiles', 'apelido', 'select')
union all
select 'profiles (motivo_reprovacao) — deve ser false', has_column_privilege('anon', 'public.profiles', 'motivo_reprovacao', 'select');
