@echo off
title P&A Redes Sociais - Modo Desenvolvimento
cd /d "%~dp0"
echo ========================================================
echo   P&A REDES SOCIAIS - MODO DESENVOLVIMENTO (HOT RELOAD) 
echo ========================================================
echo.
echo Servidor de desenvolvimento rodando em http://localhost:3000
echo.
node .\node_modules\next\dist\bin\next dev -p 3000
pause
