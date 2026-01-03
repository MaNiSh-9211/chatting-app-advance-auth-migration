@echo off
REM AuthAdvance - Startup Script for Windows Command Prompt
REM This script starts both the backend and frontend servers

echo ============================================
echo    AuthAdvance - Starting All Services     
echo ============================================
echo.

REM Get the current directory
set PROJECT_ROOT=%~dp0

echo [1/2] Starting Backend Server...
start "AuthAdvance Backend" cmd /k "cd /d %PROJECT_ROOT%server && echo Starting Backend... && npm run dev"

echo [2/2] Starting Frontend Server...
start "AuthAdvance Frontend" cmd /k "cd /d %PROJECT_ROOT%client && echo Starting Frontend... && npm run dev"

echo.
echo ============================================
echo    Servers Starting...                      
echo ============================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:5000
echo.
echo Two new command windows should have opened.
echo Close them to stop the servers.
echo.

REM Wait and open browser
timeout /t 5 /nobreak > nul
start http://localhost:5173
