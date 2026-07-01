@echo off
title Fix Cloudflare Tunnel Service

:: Check for administrator privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :admin
) else (
    goto :elevate
)

:elevate
echo ==========================================================
echo   Requesting Administrator Privileges...
echo   (Please click "YES" or "ตกลง" on the Windows popup)
echo ==========================================================
powershell -Command "Start-Process '%~f0' -Verb RunAs"
exit /b

:admin
echo ==========================================================
echo   Updating Cloudflare Tunnel Service with the Correct Token
echo ==========================================================
echo.

echo 1. Stopping existing Cloudflared service...
sc stop Cloudflared

echo 2. Updating service configuration to use correct token...
sc config Cloudflared binPath= "\"C:\Program Files (x86)\cloudflared\cloudflared.exe\" tunnel run --token eyJhIjoiODIyOWM3YmIzODA3YjkwOTQ5YTJhNmYwOGIyMjM3MDAiLCJ0IjoiNjY0ZWRiMzYtMzNlOS00Yjc0LWI0YTctZWVjZWZkMTUxY2M5IiwicyI6Ik1tWmlaVEExTlRrdE9UVmhNUzAwTmpGakxXSmhabU10WkRKaU5EazBPR0ptTWpRMyJ9"

echo 3. Starting Cloudflared service...
sc start Cloudflared

echo.
echo ==========================================================
echo   Service updated successfully! You can close this window.
echo ==========================================================
echo.
pause
