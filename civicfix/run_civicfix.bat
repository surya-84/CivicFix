@echo off
title CivicFix Launcher
echo ==============================================
echo        CivicFix - Starting Services...
echo ==============================================

echo [1/3] Ensuring ports 8000 and 5173 are free...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo [2/3] Starting Backend API (FastAPI on Port 8000)...
cd /d "%~dp0backend"
start "CivicFix Backend (FastAPI)" cmd /k "python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo [3/3] Starting Frontend (Vite on Port 5173)...
cd /d "%~dp0frontend"
start "CivicFix Frontend (Vite)" cmd /k "npm run dev"

timeout /t 3 >nul
start http://localhost:5173/
echo ==============================================
echo  CivicFix is now running at: http://localhost:5173
echo  Backend Swagger Docs: http://localhost:8000/docs
echo ==============================================
