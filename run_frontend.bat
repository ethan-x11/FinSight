@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "FRONTEND_DIR=%SCRIPT_DIR%frontend"

if not exist "%FRONTEND_DIR%" (
    echo [ERROR] Frontend directory not found at "%FRONTEND_DIR%".
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found in PATH. Install Node.js and rerun setup_frontend.bat.
    exit /b 1
)

if not exist "%FRONTEND_DIR%\node_modules" (
    echo [WARN] node_modules not found. Run setup_frontend.bat to install dependencies.
)

pushd "%FRONTEND_DIR%"
echo [INFO] Starting frontend dev server on http://localhost:5173 (Ctrl+C to stop)...
npm run dev
set "FRONTEND_EXIT=%ERRORLEVEL%"
popd
exit /b %FRONTEND_EXIT%
