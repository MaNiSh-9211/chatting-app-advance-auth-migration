@echo off
REM AuthAdvance - Install All Dependencies
REM This script installs npm packages for both server and client

echo ============================================
echo    AuthAdvance - Installing Dependencies   
echo ============================================
echo.

REM Get the current directory
set PROJECT_ROOT=%~dp0

echo [1/2] Installing Backend Dependencies...
echo ----------------------------------------
cd /d "%PROJECT_ROOT%server"
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install server dependencies!
    pause
    exit /b 1
)
echo [OK] Server dependencies installed successfully!
echo.

echo [2/2] Installing Frontend Dependencies...
echo ----------------------------------------
cd /d "%PROJECT_ROOT%client"
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install client dependencies!
    pause
    exit /b 1
)
echo [OK] Client dependencies installed successfully!
echo.

echo ============================================
echo    All Dependencies Installed!             
echo ============================================
echo.
echo Next steps:
echo 1. Configure your .env file in the server folder
echo 2. Run start.bat to launch the application
echo.
pause
