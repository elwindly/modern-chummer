@echo off
cd /d "%~dp0"
echo Installing dependencies...
call npm install
if errorlevel 1 exit /b 1
echo.
echo Converting Chummer XML to JSON...
call npm run convert
if errorlevel 1 exit /b 1
echo.
echo Done. Start the app with: npm start
pause
