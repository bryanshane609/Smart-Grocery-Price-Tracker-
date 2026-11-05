@echo off
title Smart Grocery Server
echo ===================================================
echo Menjalankan Smart Grocery Local Server di Port 3000
echo ===================================================
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
