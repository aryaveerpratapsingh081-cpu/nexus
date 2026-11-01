@echo off
title Nexus AI OS - Frontend Desktop
cd /d "%~dp0frontend"
echo Launching Electron desktop window...
npx electron electron/main.cjs
pause

