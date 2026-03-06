@echo off
chcp 65001 >nul
title Voice Input - セットアップ

echo ================================================
echo   Voice Input - 音声入力 ^& 多言語翻訳
echo ================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [エラー] Node.js がインストールされていません。
    echo 以下からインストールしてください:
    echo   https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/2] 依存パッケージをインストール中...
call npm install --no-audit --no-fund
if %ERRORLEVEL% neq 0 (
    echo [エラー] npm install に失敗しました。
    pause
    exit /b 1
)

echo.
echo [2/2] アプリを起動中...
echo.
call npm start
