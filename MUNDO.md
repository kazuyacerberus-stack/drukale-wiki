# O MUNDO DRUKALE — como colocar no ar

Leia uma vez inteiro antes de começar. São 4 passos e leva uns 10 minutos.

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
   `drukale-wiki-wa62.vercel.app`
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

**Só você, depois de entrar no painel (`/admin`), pode:**

1. Entrar em `/admin` e fazer login, como você já faz para criar personagem.
2. Voltar para **◍ mundo**.
3. Clicar em **+ novo local** (o botão só aparece para quem está logado).
4. **Clicar no planeta**, no lugar exato onde o local fica.
5. Preencher o nome, escolher o tipo e escrever o resumo.
6. Clicar em **gravar**.

Para mudar ou apagar depois: clique no ponto → **editar** ou **remover**.

### Os seis tipos

| tipo | para quê |
|---|---|
| **capital** | a sede do império — é a que tem o castelo branco e a cidade gigante |
| **cidade** | núcleo habitado comum |
| **base** | instalação militar ou de pesquisa |
| **quartel-general** | centro de comando |
| **ruína** | o que sobrou de alguma coisa |
| **cidadela orbital** | **não fica no chão**: aparece girando em órbita, acima do planeta |

A **cidadela orbital** é a única que se desenha sozinha no céu. Cadastre
uma e ela aparece como uma estação de anéis orbitando o mundo — e continua
clicável de lá.

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
