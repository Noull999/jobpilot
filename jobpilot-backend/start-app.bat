@echo off
REM Script para iniciar JobPilot Backend en Windows
REM Simplemente haz doble-click o ejecuta: start-app.bat

setlocal enabledelayedexpansion

cls
echo.
echo ════════════════════════════════════════════════════════════════
echo           INICIANDO JOBPILOT BACKEND - TODOS LOS SERVICIOS
echo ════════════════════════════════════════════════════════════════
echo.

REM Verificar que estamos en el directorio correcto
if not exist "app\__init__.py" (
    echo ❌ Error: No estás en el directorio correcto
    echo    Debe estar en: C:\Users\Lenovo\Desktop\Proyectos\jobia\jobpilot-backend
    pause
    exit /b 1
)

echo ✅ Directorio correcto: %cd%
echo.

REM Paso 1: Verificar Python
echo 📍 Paso 1: Verificando Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python no encontrado o no está en PATH
    echo    Instala Python desde https://python.org
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
    echo ✅ !PYTHON_VERSION!
)
echo.

REM Paso 2: Verificar dependencias
echo 📍 Paso 2: Verificando dependencias...
pip list 2>nul | findstr /i "Flask SQLAlchemy anthropic" >nul
if errorlevel 1 (
    echo ⚠️  Instalando dependencias (puede tomar 1-2 minutos)...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ❌ Error instalando dependencias
        pause
        exit /b 1
    )
    echo ✅ Dependencias instaladas
) else (
    echo ✅ Dependencias principales instaladas
)
echo.

REM Paso 3: Verificar .env
echo 📍 Paso 3: Verificando .env...
if exist ".env" (
    for /f "tokens=*" %%i in ('find /c /v "" ^< .env') do set ENV_LINES=%%i
    echo ✅ Archivo .env encontrado (!ENV_LINES! líneas)
) else (
    echo ❌ Archivo .env no encontrado
    echo    Crea .env con las variables requeridas
    pause
    exit /b 1
)
echo.

REM Paso 4: Crear carpeta de uploads
echo 📍 Paso 4: Preparando carpetas...
if not exist "uploads\cvs" mkdir uploads\cvs
echo ✅ Carpeta uploads/cvs lista
echo.

REM Paso 5: Ejecutar diagnóstico
echo 📍 Paso 5: Ejecutando diagnóstico...
echo.
python diagnose.py
echo.

REM Paso 6: Iniciar servidor
echo.
echo ════════════════════════════════════════════════════════════════
echo                    INICIANDO SERVIDOR FLASK
echo ════════════════════════════════════════════════════════════════
echo.
echo ⏳ El servidor está iniciando...
echo    Espera a ver: '* Running on http://localhost:5000'
echo.

python run.py

pause
