@echo off
setlocal EnableExtensions
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js not found. Run setup.bat first in a normal terminal.
  pause
  exit /b 1
)

echo Starting Modern Chummer at http://localhost:4200/
echo Press Ctrl+C to stop.
echo.
call npm start
if errorlevel 1 (
  echo.
  echo If this failed after setup, try running setup.bat again.
  pause
)
