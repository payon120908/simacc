@echo off
title Antigravity Ledger Launcher
echo ==========================================================
echo   Starting Antigravity Ledger - Corporate Accounting
echo ==========================================================
echo.

:: 1. Check if Python is installed
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

echo [ERROR] Python is NOT installed on this computer!
echo.
echo Please install Python by following these steps:
echo 1. Download and install Python from: https://www.python.org/
echo 2. Make sure to check the box "Add Python to PATH" during installation.
echo 3. Close this window and double-click start-ledger.bat again.
echo.
pause
exit

:python_found
:: 2. Running server
echo 1. Running Full-stack Accounting and Inventory Server on Port 8085...
echo.
%PYTHON_CMD% server.py
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Server crashed or failed to start.
    pause
)
