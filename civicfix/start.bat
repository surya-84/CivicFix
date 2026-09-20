@echo off
echo Starting CivicFix...
echo.
echo [1/2] Starting Backend (FastAPI) on port 8000...
start "CivicFix Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 3 /nobreak >nul
echo [2/2] Starting Frontend (Vite) on port 5173...
start "CivicFix Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 3 /nobreak >nul
echo.
echo CivicFix is running!
echo   Frontend: http://localhost:5173
echo   Backend API: http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.
echo Demo Credentials:
echo   Citizen: 9000000001 / citizen123
echo   Admin:   9000000003 / admin123
echo.
start http://localhost:5173
pause
