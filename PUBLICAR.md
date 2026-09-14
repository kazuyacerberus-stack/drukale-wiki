# Publicar a Drukale Wiki

Siga na ordem. Os passos 1 a 3 trancam o banco; só depois disso é seguro
colocar o site no ar.

---

## 1. Criar o seu usuário

No Supabase, menu **Authentication → Users → Add user → Create new user**.

- E-mail: o seu
- Senha: uma senha forte, guarde num gerenciador
- Marque **Auto Confirm User** (senão o Supabase exige confirmação por e-mail)

Este será o único usuário da wiki. É com ele que você vai entrar em `/admin`.

---

## 2. Fechar o cadastro público  ← não pule

No Supabase, **Authentication → Sign In / Providers → Email**.

Desligue a opção que permite novos cadastros (aparece como
**"Allow new users to sign up"** ou **"Enable sign ups"**) e salve.

Se isso ficar ligado, qualquer pessoa cria uma conta sozinha pelo Supabase e,
com ela, ganha permissão de escrever na sua wiki. O passo 3 sozinho não
protege contra isso — os dois andam juntos.

---

## 3. Trancar o banco

**SQL Editor → New query**, cole o conteúdo de `sql/03-seguranca.sql` e rode.

O que ele faz: apaga as políticas abertas que existiam, liga o RLS e cria
quatro regras novas — leitura para todo mundo, escrita apenas para quem tem
sessão. Faz o mesmo com o bucket de imagens.

No fim ele lista as políticas que ficaram valendo. Devem aparecer
`drk_ler_publico` (sem role) e as três `drk_*_logado` com role
`{authenticated}`.

---

## 4. Testar localmente

```
npm run dev
```

Confira quatro coisas:

- `localhost:3000` abre a galeria normalmente, sem pedir login
- `localhost:3000/admin` redireciona para a tela de acesso
- entrando com o seu e-mail e senha, o painel abre
- criar, editar e excluir continuam funcionando

Se der "Sessão expirada" ao salvar, saia e entre de novo.

---

## 5. Subir o código para o GitHub

Confirme antes que o arquivo `.gitignore` tem a linha `.env*` ou
`.env.local`. Suas chaves não podem ir para o repositório.

```
git init
git add .
git commit -m "Drukale Wiki"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/drukale-wiki.git
git push -u origin main
```

---

## 6. Publicar na Vercel

1. Entre em vercel.com com a conta do GitHub
2. **Add New → Project** e escolha o repositório `drukale-wiki`
3. Antes de clicar em Deploy, abra **Environment Variables** e crie as duas:

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | o mesmo do seu `.env.local` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | o mesmo do seu `.env.local` |

4. **Deploy**

Em poucos minutos o site sai em `drukale-wiki.vercel.app`. A partir daí, todo
`git push` para a `main` republica sozinho.

---

## 7. Avisar o Supabase do novo endereço

No Supabase, **Authentication → URL Configuration**, coloque o endereço da
Vercel em **Site URL**. Isso evita problemas de sessão no site publicado.

---

## Depois

Domínio próprio: na Vercel, **Settings → Domains**. Se você comprar um
`.com.br` ou `.wiki`, é lá que aponta.

Se um dia precisar trocar a senha, é em **Authentication → Users**, nos três
pontinhos ao lado do seu usuário.
