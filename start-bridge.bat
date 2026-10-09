@echo off
title Creation+Alt+Fix Lead Factory Bridge
color 0b
echo ========================================================
echo   CREATION+ALT+FIX - AUTONOME LEAD FACTORY BRIDGE
echo ========================================================
echo.
echo Starting Bridge Server on http://127.0.0.1:3847...
echo.
cd /d "%~dp0"
node factory/server/factory-bridge.js
pause
