@echo off
cd /d "%~dp0"
chcp 65001 >nul 2>nul
title Voice Input - Build Installer

echo ================================================
echo   Voice Input - Build Windows Installer
echo ================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [!] Node.js not found.
    echo     Download: https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [1/2] Installing dependencies...
    call npm install --no-audit --no-fund
) else (
    echo [OK] Dependencies already installed.
)

echo.
echo Building Windows installer...
echo This may take a few minutes on first run.
echo.
call npx electron-builder --win

echo.
if exist "dist\*.exe" (
    echo ================================================
    echo   Done! Installer created in dist\ folder.
    echo ================================================
    explorer dist
) else (
    echo Build may have completed. Check dist\ folder.
)
pause
