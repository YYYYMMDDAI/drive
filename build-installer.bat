@echo off
chcp 65001 >nul
title Voice Input - インストーラー作成

echo ================================================
echo   Voice Input - Windows インストーラー作成
echo ================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [エラー] Node.js がインストールされていません。
    pause
    exit /b 1
)

echo [1/3] 依存パッケージをインストール中...
call npm install --no-audit --no-fund

echo.
echo [2/3] アイコンを確認中...
if not exist "icons\icon.png" (
    echo [注意] icons\icon.png が見つかりません。
    echo icons\generate-icons.html をブラウザで開いてPNGを生成し、
    echo icons フォルダに配置してください。
    echo.
    echo アイコン無しでビルドを続行します...
)

echo.
echo [3/3] Windows インストーラーをビルド中...
call npm run build:win

echo.
echo ================================================
echo   完了！ dist フォルダにインストーラーが生成されました。
echo ================================================
pause
