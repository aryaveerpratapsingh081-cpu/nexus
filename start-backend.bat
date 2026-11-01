@echo off
title Nexus AI OS - Backend API
cd /d "%~dp0backend"
echo Starting FastAPI Backend on http://127.0.0.1:8005...
venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8005 --reload
pause
