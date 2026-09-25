# O MUNDO DRUKALE — como colocar no ar

Leia uma vez inteiro antes de começar. São 4 passos e leva uns 10 minutos.

> **Já instalou uma vez?** Então pule direto para o
> **[PASSO 1B](#passo-1b--a-serpente-e-a-imagem-do-ambiente)**, o
> **[PASSO 1C](#passo-1c--comunidade-contas-apelido-avatar-e-chat)** e o
> **[PASSO 1D](#passo-1d--facções-linha-do-tempo-glossário-e-mapa-político)**,
> que são o SQL novo. Depois siga os passos 2, 3 e 4 normalmente.

---

## PASSO 1 — Criar a tabela no Supabase

Sem este passo o planeta abre, mas não deixa salvar nenhum local.

1. Abra **supabase.com**, entre na sua conta e clique no projeto do Drukale.
2. No menu da esquerda, clique em **SQL Editor**.
3. Clique em **New query** (botão verde, em cima).
4. Abra o arquivo `sql/06-mundo.sql` no Bloco de Notas, selecione tudo
   (**Ctrl+A**), copie (**Ctrl+C**).
5. Cole na janela do SQL Editor (**Ctrl+V**) e clique em **Run**
   (ou aperte **Ctrl+Enter**).
6. Embaixo tem que aparecer uma tabelinha com as palavras
   `id, nome, tipo, resumo, lat, lon, altitude, created_at`.
   Apareceu? Deu certo. Pode fechar.

> Se der erro, me mande a mensagem inteira. **Não** rode duas vezes achando
> que na segunda vai. (Pode rodar de novo sem medo, aliás: o arquivo foi
> feito para não apagar nem duplicar nada. Mas o erro continua lá.)

---

## PASSO 1B — A serpente e a imagem do ambiente

Mesma coisa, com o arquivo `sql/07-serpente-e-imagem.sql`.

Este passo faz três coisas:

- libera o sétimo tipo de local, a **serpente** (sem ele, o Supabase
  recusa a serpente e o painel acusa erro ao gravar);
- cria a coluna onde fica o endereço da **imagem do ambiente**;
- cria o balde `locais`, onde as imagens ficam guardadas, já com a
  trava de 8 MB e só formatos de imagem.

No fim tem que aparecer a lista de colunas terminando em `imagem`, e o
balde `locais` com limite `8`.

---

## PASSO 1C — Comunidade: contas, apelido, avatar e chat

Mesma coisa, com o arquivo `sql/09-comunidade.sql`. Este passo cria:

- os **perfis** (apelido + foto de cada conta);
- o poder de **silenciar** e **expulsar** uma conta;
- o **chat** da comunidade, com entrega em tempo real;
- os baldes de imagem `avatars` (fotos de perfil) e `chat` (anexos do chat).

No fim tem que aparecer uma lista com um perfil por conta que já existia
(inclusive a sua), e os baldes `avatars`/`chat` na segunda consulta.

> Este passo também muda quem pode publicar uma cena: quem estiver
> silenciado ou expulso deixa de conseguir postar. Não apaga cena nenhuma.

### A chave do Giphy (busca de GIF e figurinha no chat)

O botão de GIF/figurinha do chat busca de verdade no Giphy, e isso precisa
de uma chavinha grátis:

1. Entre em **developers.giphy.com**, crie uma conta e clique em
   **Create an App** → escolha **API** (não SDK) → dê um nome qualquer,
   ex. "Drukale Chat".
2. Copie a **API Key** que aparece.
3. Abra o arquivo `.env.local`, na pasta do site, e adicione uma linha:
   `NEXT_PUBLIC_GIPHY_API_KEY=cole_a_chave_aqui`
4. Se o site já está publicado na Vercel, adicione a mesma linha lá
   também: painel do projeto na Vercel → **Settings** → **Environment
   Variables** → nome `NEXT_PUBLIC_GIPHY_API_KEY`, valor a chave.

Sem essa chave o resto do site funciona normalmente — só o botão de
GIF/figurinha do chat avisa que ainda falta configurar.

---

## PASSO 1D — Facções, linha do tempo, glossário e mapa político

São quatro arquivos novos, um por cima do outro — rode os quatro, nessa
ordem, do mesmo jeito de sempre (SQL Editor → colar o arquivo inteiro →
Run):

1. `sql/10-faccoes.sql` — cria a tabela de **facções** (casas, ordens,
   organizações) e o balde `faccoes`, onde fica o símbolo de cada uma.
2. `sql/11-eventos.sql` — cria a tabela da **linha do tempo**. Sem balde
   novo, não tem imagem.
3. `sql/12-glossario.sql` — cria a tabela do **glossário**. Também sem
   balde novo.
4. `sql/13-mapa-politico.sql` — só adiciona uma coluna (`faccao`) na
   tabela de locais que já existia; é o que liga cada local do mundo a
   uma facção dona, pro mapa político funcionar.

Cada um mostra sua própria consulta de verificação no fim — confira que
nenhum deles deu erro vermelho antes de seguir para o próximo.

---

## PASSO 2 — Trocar os arquivos no computador

1. Baixe o arquivo **drukale-mundo-3d.zip** que eu te mandei.
2. Clique nele com o **botão direito** → **Extrair tudo** → **Extrair**.
3. Vai abrir uma janela com **duas pastas**: `app` e `sql`.
4. Selecione as duas (clique em `app`, segure **Ctrl**, clique em `sql`)
   e **copie** (**Ctrl+C**).
5. Abra a pasta do site: **Desktop → drukale-wiki**.
6. **Cole** (**Ctrl+V**).
7. O Windows vai perguntar o que fazer com os arquivos repetidos.
   Escolha **"Substituir os arquivos no destino"**.

> ⚠️ Preste atenção nisto: as pastas `app` e `sql` têm que ficar **dentro**
> de `drukale-wiki`, lado a lado com o `PUBLICAR.bat`. Se você abrir a pasta
> `drukale-wiki` e vir outra pasta `app` **dentro** da pasta `app`, deu
> errado — apague e refaça o passo 6.

---

## PASSO 3 — Publicar

1. Dentro de **Desktop → drukale-wiki**, dê dois cliques em **PUBLICAR.bat**.
2. Vai abrir uma janela preta. Espere. Demora de 1 a 3 minutos.
3. No fim tem que aparecer **PUBLICADO COM SUCESSO**.
4. Agora espere mais **1 minuto** — é o tempo que a Vercel leva para
   montar a versão nova sozinha.

> Se aparecer erro vermelho no meio, copie a janela inteira e me mande.

---

## PASSO 4 — Ver funcionando

1. Abra o navegador e digite na **barra de endereço**:
   `terrasave.vercel.app`
2. **Não** use Ctrl+Shift+R nesta página. Digite o endereço e dê Enter.
3. Lá em cima, do lado direito, apareceu um botão novo: **◍ mundo**.
   Clique nele.
4. Vai aparecer **"gerando o mundo..."** por uns 2 segundos. É normal:
   a rocha, o relevo, o mar e as nuvens são calculados na hora, no seu
   navegador — não é uma foto baixada da internet.
5. O planeta aparece girando sozinho.

---

## Como usar

**Todo mundo pode:**

- **Arrastar** com o mouse (ou o dedo) para girar o planeta.
- **Rolar** a rodinha para chegar perto ou se afastar.
- **Clicar num ponto colorido** para ler o que é aquele lugar.
- **Parar o giro** no botão `❚❚ parar o giro`, para olhar com calma.
  O giro também para sozinho assim que você arrasta o planeta — quem
  pegou o mundo com a mão quer olhar, não ver passar.

**Só você, depois de entrar no painel (`/admin`), pode:**

1. Entrar em `/admin` e fazer login, como você já faz para criar personagem.
2. Voltar para **◍ mundo**.
3. Clicar em **+ novo local** (o botão só aparece para quem está logado).
4. **Clicar no planeta**, no lugar exato onde o local fica.
5. Preencher o nome, escolher o tipo e escrever o resumo.
6. **Escolher a imagem do ambiente**, se quiser (JPG, PNG, WEBP ou GIF,
   até 8 MB). Ela aparece no topo do painel quando alguém abre o local.
7. Clicar em **gravar**.

Para mudar ou apagar depois: clique no ponto → **editar** ou **remover**.
Trocar a imagem apaga a antiga do Storage sozinho; remover o local
também leva a imagem junto.

### Contas, apelido, cenas e chat

**Qualquer pessoa pode criar uma conta sozinha**, em `/cadastro`: escolhe
e-mail, senha, apelido e (se quiser) uma foto. Com essa conta dá para:

- ler o site inteiro normalmente (isso já era público);
- publicar cenas em `/cenas`;
- entrar no chat em `/chat` — o chat só é visível para quem tem conta;
- trocar apelido e foto a qualquer momento em `/perfil`.

Essa conta **não** consegue criar, editar ou apagar personagens/locais —
isso continua exclusivo de quem está em `drukale_admins`, como sempre foi.

O apelido e a foto aparecem ao lado de cada cena e mensagem para quem
está logado. O **e-mail de quem postou só aparece para você**, o
administrador — os outros membros só veem o apelido.

**Silenciar e expulsar** (só o administrador vê essas opções):

- Em `/admin/comunidade` tem a lista de todas as contas, com busca por
  e-mail ou apelido, e os botões **silenciar** (escolhendo por quanto
  tempo), **remover silêncio**, **expulsar** e **reintegrar**.
- Silenciado: continua logado e lendo o site, mas o Supabase recusa
  novas cenas e mensagens dele até o prazo passar.
- Expulso: bloqueio permanente de postar, e as mensagens antigas dele
  somem do chat de todo mundo (só você continua vendo, no chat e na
  lista de contas).
- Atalhos rápidos também aparecem direto no chat e nas cenas, ao lado do
  nome de quem postou, quando você está logado como administrador.

### Facções

Cada casa, ordem ou organização do império ganha sua própria página, em
`/faccoes` (a lista) e `/faccoes/nome-da-facção` (a página dela).

- **Qualquer visitante** pode ler: símbolo, resumo, história, território
  em texto, e duas listas que se preenchem sozinhas — **membros**
  (personagens cujo campo "facção" na ficha bate com o nome dela) e
  **locais no mapa** (locais do mundo atribuídos a ela — ver "mapa
  político" abaixo).
- **Só você**, logado, cria/edita/apaga em `/admin/faccoes`. O nome que
  você escolhe ali é o que casa com o campo "facção" da ficha do
  personagem — escreva igual (maiúscula/minúscula e acento não importam,
  mas o nome tem que ser o mesmo) para o link e a lista de membros
  funcionarem.

### Linha do tempo

Os grandes marcos do império, em ordem, em `/linha-do-tempo`.

- Cada evento tem um **título**, uma **data** (texto livre — o império
  não tem calendário fixo, então escreva o que fizer sentido: "Ano 12
  depois da Queda", "Terceira Era", ou deixe em branco) e um resumo/
  descrição.
- A **ordem em que aparecem não segue a data escrita** — ela é ajustada
  à mão, em `/admin/linha-do-tempo`, com os botões **↑** e **↓** ao lado
  de cada evento. Um evento novo sempre nasce no fim da lista.

### Glossário

Termos do mundo — raças, magia, tecnologia, organizações, lugares — em
`/glossario`, com busca por nome e filtro por categoria.

- Criar/editar/apagar, como sempre, em `/admin/glossario`.
- Por enquanto o glossário é uma página à parte: um termo cadastrado
  ali **não** vira link automático dentro do texto das fichas, cenas ou
  eventos. Fica pra depois.

### Os sete tipos

| tipo | para quê |
|---|---|
| **capital** | a sede do império — é a que tem o castelo branco e a cidade gigante |
| **cidade** | núcleo habitado comum |
| **base** | instalação militar ou de pesquisa |
| **quartel-general** | centro de comando |
| **ruína** | o que sobrou de alguma coisa |
| **cidadela orbital** | **não fica no chão**: aparece girando em órbita, acima do planeta |
| **serpente** | a criatura gigante que nada no oceano |

Dois deles se desenham sozinhos, e não são enfeite — só aparecem se você
cadastrar:

- A **cidadela orbital** vira uma estação de anéis girando acima do
  planeta, e continua clicável de lá.
- A **serpente** vira um corpo enorme serpenteando rente à água, com
  crista no dorso, cabeça e olhos. Crave ela **em cima do mar** — em
  terra firme ela aparece do mesmo jeito, mas fica estranho.

### Mapa político

O botão **◑ mapa político**, na barra embaixo do planeta, pinta o
território de cada facção sobre o globo, com fronteira entre elas — não
é um desenho fixo: é calculado na hora a partir de qual local pertence a
qual facção, então se atualiza sozinho sempre que você muda um dono.

- **Atribuir dono**: edite um local (clique no ponto → **editar**, ou
  **+ novo local**) e escolha a facção no campo **"facção dona"**. Vazio
  = "nenhuma", esse local não pinta território nenhum.
- Com **um só** local tendo dono, o planeta inteiro fica da cor daquela
  facção — é o comportamento certo (não tem ninguém mais perto pra
  disputar território). A fronteira só aparece quando **dois ou mais**
  locais de facções diferentes existem.
- Clicar de novo no botão (agora **🌐 mapa por tipo**) volta pro globo
  normal, colorido por tipo de local.
- Se nenhum local tiver facção ainda, o botão liga mas avisa que falta
  atribuir — não é erro.

---

## Coisas que é bom saber

- **As torres de energia, as fendas de lava e as civilizações que você vê
  espalhadas pelo planeta são cenário.** Não têm nome nem ficha: estão lá
  para o mundo não parecer vazio. Os locais de verdade são só os que você
  cadastra, e são os que têm ponto colorido e nome escrito ao lado.

- **O lugar é guardado por latitude e longitude**, igualzinho ao mundo real.
  Por isso o ponto continua no lugar certo quando o planeta gira — e por
  isso, se um dia eu mudar o desenho do planeta, seus impérios não se
  perdem.

- **O mundo é sempre o mesmo.** Ele é sorteado, mas com um número fixo:
  o planeta que você vê hoje é o mesmo que você vai ver daqui a um ano,
  e é o mesmo que qualquer pessoa vê.

- **Se aparecer "este navegador não consegue desenhar o globo"**: o
  computador está com a aceleração 3D desligada. O resto do site continua
  funcionando normalmente.

- **Esta página não é verde.** Ela usa um visual próprio — chapa escura,
  latão, rebites e a varredura de um tubo cansado. A galeria e as fichas
  continuam Matrix como sempre foram.

- **No espaço em volta há duas coisas de propósito**: a **Cicatrix
  Maledictum**, o rasgo em forma de olho de cobra bifurcado, e a névoa
  com braços e garras que cerca o mundo. São cenário fixo: não têm ficha
  e não se clica nelas.
