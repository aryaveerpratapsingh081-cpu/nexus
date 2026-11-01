@echo off
title Nexus AI OS - Desktop Environment Launcher
echo ===================================================
echo           NEXUS AI OS - WINDOWS DESKTOP
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Ollama local service...
curl -s http://127.0.0.1:11434/api/tags >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Ollama service detected and running.
) else (
    echo [NOTICE] Ollama does not seem to be running on http://127.0.0.1:11434.
    echo Please make sure Ollama is launched so local AI features work.
)

echo.
echo [2/3] Starting Python FastAPI Backend on http://127.0.0.1:8005...
start "Nexus AI OS - Backend" /min cmd /c "backend\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8005"

echo Waiting for backend to become ready...
timeout /t 3 /nobreak >nul

echo.
echo [3/3] Launching Nexus AI OS Desktop Application...
cd frontend
start "" npx electron electron/main.cjs

echo.
echo [DONE] Nexus AI OS is running!
echo You can close this launcher window at any time.
