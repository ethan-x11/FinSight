@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"

if not exist "%BACKEND_DIR%" (
    echo [ERROR] Backend directory not found at "%BACKEND_DIR%".
    exit /b 1
)

where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found in PATH. Install Python 3.10+ and re-run this script.
    exit /b 1
)

pushd "%BACKEND_DIR%"

if not exist "requirements.txt" (
    echo [ERROR] Missing requirements.txt in "%BACKEND_DIR%".
    popd
    exit /b 1
)

echo [INFO] Ensuring virtual environment exists...
if not exist ".venv" (
    python -m venv .venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        popd
        exit /b 1
    )
)

set "BACKEND_ENV_ACTIVE="
call ".venv\Scripts\activate.bat"
if errorlevel 1 (
    echo [ERROR] Failed to activate virtual environment.
    popd
    exit /b 1
)
set "BACKEND_ENV_ACTIVE=1"

echo [INFO] Upgrading pip...
python -m pip install --upgrade pip
if errorlevel 1 goto backend_fail

echo [INFO] Installing backend dependencies...
python -m pip install -r requirements.txt && pip uninstall azure-ai-projects -y && pip install azure-ai-projects --pre
if errorlevel 1 goto backend_fail

echo [SUCCESS] Backend setup complete.
set "BACKEND_EXIT=0"
goto backend_cleanup

:backend_fail
set "BACKEND_EXIT=%ERRORLEVEL%"
if "%BACKEND_EXIT%"=="0" set "BACKEND_EXIT=1"
echo [ERROR] Backend setup failed with exit code %BACKEND_EXIT%.

:backend_cleanup
if defined BACKEND_ENV_ACTIVE call deactivate
popd
exit /b %BACKEND_EXIT%
