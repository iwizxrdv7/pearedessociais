@echo off
title P&A Redes Sociais - Servidor Web
cd /d "%~dp0"
echo ========================================================
echo        P&A REDES SOCIAIS - POSTADOR & AGENDADOR         
echo ========================================================
echo.
echo Iniciando servidor web na porta 3000...
echo Abra no seu navegador: http://localhost:3000
echo.
node .\node_modules\next\dist\bin\next start -p 3000
pause
