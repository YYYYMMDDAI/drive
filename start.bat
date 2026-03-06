@echo off
cd /d "%~dp0"
chcp 65001 >nul 2>nul
title Voice Input

echo ================================================
echo   Voice Input
echo ================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [!] Node.js not found.
    echo     Download: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist "node_modules\electron" (
    echo [1/2] Installing dependencies...
    call npm install --no-audit --no-fund
    if %ERRORLEVEL% neq 0 (
        echo [!] npm install failed.
        pause
        exit /b 1
    )
    echo.
    echo [2/2] Launching app...
) else (
    echo Launching app...
)

echo.
npx electron .
