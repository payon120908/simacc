@echo off
title Antigravity Online Ledger Launcher
echo ==========================================================
echo   Starting Antigravity Ledger in ONLINE Mode
echo ==========================================================
echo.

:: Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set PYTHON_CMD=python
    goto python_found
)
where py >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set PYTHON_CMD=py
    goto python_found
)
echo [ERROR] Python is NOT installed!
pause
exit

:python_found
:: Start Python server in a new window
echo 1. Launching local backend server...
start "Backend Server" %PYTHON_CMD% server.py

:: Wait 2 seconds for server to start
timeout /t 2 >nul

:: Check if cloudflared is installed at default location
set CLOUDFLARED_PATH="C:\Program Files (x86)\cloudflared\cloudflared.exe"
if not exist %CLOUDFLARED_PATH% (
    set CLOUDFLARED_PATH="C:\Program Files\cloudflared\cloudflared.exe"
)
if not exist %CLOUDFLARED_PATH% (
    echo [ERROR] cloudflared is not installed!
    echo Please install cloudflared first.
    pause
    exit
)

echo 2. Launching Cloudflare Tunnel...
echo ----------------------------------------------------------
echo Copy the trycloudflare link below to share with your team!
echo ----------------------------------------------------------
%CLOUDFLARED_PATH% tunnel --url http://127.0.0.1:8085
