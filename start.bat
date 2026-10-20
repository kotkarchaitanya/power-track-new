@echo off
title PowerTrack - Electricity Information Platform
color 0B
echo ========================================================
echo               ⚡ POWERTRACK APPLICATION
echo            "Track Power. Stay Informed."
echo ========================================================
echo Starting local web and API server on port 8085...
echo.

start "" "http://localhost:8085/"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8085

pause
