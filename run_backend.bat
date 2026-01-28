@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"

if not exist "%BACKEND_DIR%" (
    echo [ERROR] Backend directory not found at "%BACKEND_DIR%".
    exit /b 1
)

pushd "%BACKEND_DIR%"

set "BACKEND_ENV_ACTIVE="
if exist ".venv\Scripts\activate.bat" (
    call ".venv\Scripts\activate.bat"
    if errorlevel 1 (
        echo [ERROR] Failed to activate virtual environment in "%BACKEND_DIR%".
        popd
        exit /b 1
    )
    set "BACKEND_ENV_ACTIVE=1"
) else (
    where python >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Python not found in PATH. Run setup_backend.bat first.
        popd
        exit /b 1
    )
)

where uvicorn >nul 2>&1
if errorlevel 1 (
    python -m uvicorn --help >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Uvicorn is not installed. Run setup_backend.bat to install dependencies.
        if defined BACKEND_ENV_ACTIVE call deactivate
        popd
        exit /b 1
    )
)

echo [INFO] Starting backend API on http://localhost:8000 (Ctrl+C to stop)...
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
set "BACKEND_EXIT=%ERRORLEVEL%"

if defined BACKEND_ENV_ACTIVE call deactivate
popd
exit /b %BACKEND_EXIT%
