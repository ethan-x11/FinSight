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
    echo [ERROR] npm not found in PATH. Install Node.js 18+ and re-run this script.
    exit /b 1
)

pushd "%FRONTEND_DIR%"
echo [INFO] Installing frontend dependencies...
npm install
set "NPM_EXIT=%ERRORLEVEL%"

if "%NPM_EXIT%"=="0" (
    echo [SUCCESS] Frontend setup complete.
) else (
    echo [ERROR] Frontend setup failed with exit code %NPM_EXIT%.
)

popd
exit /b %NPM_EXIT%
