@echo off
setlocal

rem ============================================================
rem  DRUKALE WIKI - PUBLICAR
rem  Clique duas vezes neste arquivo para mandar suas mudancas
rem  para o site. Ele compila antes e so envia se passar.
rem ============================================================

cd /d "%~dp0"

echo.
echo ============================================================
echo   PUBLICAR DRUKALE WIKI
echo ============================================================
echo.

if not exist "package.json" (
  echo   [ERRO] Este arquivo esta na pasta errada.
  echo.
  echo   Ele precisa ficar DENTRO da pasta drukale-wiki,
  echo   do lado do package.json e da pasta app.
  echo.
  echo   Pasta onde ele esta agora:
  echo   %CD%
  echo.
  pause
  exit /b 1
)

set "MSG="
set /p MSG=O que voce mudou? [Enter para "Atualizacao"]:
if "%MSG%"=="" set "MSG=Atualizacao"

echo.
echo ------------------------------------------------------------
echo   1 de 3   Compilando... isso leva uns 30 segundos
echo ------------------------------------------------------------
echo.
call npm run build
if errorlevel 1 goto falhou_build

echo.
echo ------------------------------------------------------------
echo   2 de 3   Registrando a mudanca
echo ------------------------------------------------------------
echo.
git add -A
git diff --cached --quiet
if not errorlevel 1 goto nada_novo
git commit -m "%MSG%"
if errorlevel 1 goto falhou_commit

echo.
echo ------------------------------------------------------------
echo   3 de 3   Enviando para o GitHub
echo ------------------------------------------------------------
echo.
git push
if errorlevel 1 goto falhou_push

echo.
echo ============================================================
echo   PUBLICADO COM SUCESSO
echo ============================================================
echo.
echo   A Vercel ja esta republicando.
echo   Daqui a uns 60 segundos, abra este endereco:
echo.
echo       https://terrasave.vercel.app
echo.
echo   Abra com Ctrl + Shift + R para forcar a versao nova.
echo.
echo   Nao use enderecos compridos com codigo no meio -
echo   aqueles mostram versoes antigas congeladas.
echo.
pause
exit /b 0


:falhou_build
echo.
echo ============================================================
echo   O BUILD FALHOU - NADA FOI ENVIADO
echo ============================================================
echo.
echo   Seu site no ar continua intacto. O envio so acontece
echo   quando a compilacao passa, entao erro nenhum chega la.
echo.
echo   Role a tela para cima e procure a linha que comeca com
echo   "Type error:" ou "Error:". Ela diz qual arquivo esta
echo   com problema e em qual linha.
echo.
echo   Copie esse trecho e mande para o Claude.
echo.
pause
exit /b 1


:nada_novo
echo.
echo ------------------------------------------------------------
echo   NADA NOVO PARA PUBLICAR
echo ------------------------------------------------------------
echo.
echo   Nenhum arquivo mudou desde a ultima vez.
echo.
echo   Se voce acabou de trocar algum arquivo, ele provavelmente
echo   foi parar na pasta errada. Os arquivos do site ficam em:
echo.
echo       %CD%\app
echo.
echo   Dica: ao arrastar um arquivo para a pasta certa, o Windows
echo   pergunta se voce quer SUBSTITUIR. Se ele nao perguntar
echo   nada, a pasta esta errada.
echo.
pause
exit /b 0


:falhou_commit
echo.
echo ============================================================
echo   NAO CONSEGUI REGISTRAR A MUDANCA
echo ============================================================
echo.
echo   Copie o texto acima e mande para o Claude.
echo.
pause
exit /b 1


:falhou_push
echo.
echo ============================================================
echo   O ENVIO FALHOU - O SITE NAO FOI ATUALIZADO
echo ============================================================
echo.
echo   A mudanca ficou guardada aqui no seu computador, mas nao
echo   chegou ao GitHub. Por isso o site continua na versao velha.
echo.
echo   Causas comuns: a internet caiu, ou o GitHub pediu login.
echo.
echo   Copie o texto acima e mande para o Claude.
echo.
pause
exit /b 1