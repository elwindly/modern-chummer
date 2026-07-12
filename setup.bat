@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo  Modern Chummer 4 - Setup
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js was not found on PATH.
  echo.
  echo Install Node.js LTS, then open a NEW terminal and run this again.
  echo Do NOT rely on "Run as administrator" — use a normal terminal instead.
  echo.
  goto :fail
)

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm was not found on PATH.
  echo.
  goto :fail
)

echo Node: 
node -v
echo npm:
npm -v
echo.

echo [1/3] Installing dependencies...
call npm install
if errorlevel 1 goto :fail

echo.
echo [2/3] Approving required install scripts (npm 11+)...
call npm approve-scripts esbuild lmdb @parcel/watcher msgpackr-extract
if errorlevel 1 (
  echo WARNING: Could not approve install scripts. If ng serve fails later, run:
  echo   npm approve-scripts --allow-scripts-pending
)

echo.
echo [3/3] Converting Chummer XML to JSON...
call npm run convert
if errorlevel 1 goto :fail

echo.
echo ========================================
echo  Setup complete!
echo  Start the app with:  npm start
echo  Or double-click:     start.bat
echo ========================================
echo.
goto :end

:fail
echo.
echo ========================================
echo  Setup FAILED — see errors above.
echo ========================================
echo.

:end
pause
endlocal
