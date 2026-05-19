# Script para iniciar JobPilot Backend en Windows
# Ejecutar: .\start-app.ps1

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          INICIANDO JOBPILOT BACKEND - TODOS LOS SERVICIOS      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
$currentDir = Get-Location
if (-not (Test-Path "app/__init__.py")) {
    Write-Host "❌ Error: No estás en el directorio correcto" -ForegroundColor Red
    Write-Host "   Debe estar en: C:\Users\Lenovo\Desktop\Proyectos\jobia\jobpilot-backend" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Directorio correcto: $currentDir" -ForegroundColor Green
Write-Host ""

# Paso 1: Verificar Python
Write-Host "📍 Paso 1: Verificando Python..." -ForegroundColor Cyan
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Python no encontrado o no está en PATH" -ForegroundColor Red
    Write-Host "   Instala Python desde https://python.org" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Paso 2: Verificar dependencias
Write-Host "📍 Paso 2: Verificando dependencias..." -ForegroundColor Cyan
$deps = pip list 2>&1 | Select-String "Flask|SQLAlchemy|anthropic"
if ($deps.Count -gt 0) {
    Write-Host "✅ Dependencias principales instaladas" -ForegroundColor Green
} else {
    Write-Host "⚠️  Instalando dependencias (puede tomar 1-2 minutos)..." -ForegroundColor Yellow
    pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error instalando dependencias" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dependencias instaladas" -ForegroundColor Green
}

Write-Host ""

# Paso 3: Verificar .env
Write-Host "📍 Paso 3: Verificando .env..." -ForegroundColor Cyan
if (Test-Path ".env") {
    $envLines = (Get-Content .env | Measure-Object -Line).Lines
    Write-Host "✅ Archivo .env encontrado ($envLines líneas)" -ForegroundColor Green
} else {
    Write-Host "❌ Archivo .env no encontrado" -ForegroundColor Red
    Write-Host "   Crea .env con las variables requeridas" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Paso 4: Crear carpeta de uploads si no existe
Write-Host "📍 Paso 4: Preparando carpetas..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "uploads/cvs" -ErrorAction SilentlyContinue | Out-Null
Write-Host "✅ Carpeta uploads/cvs lista" -ForegroundColor Green

Write-Host ""

# Paso 5: Ejecutar diagnóstico
Write-Host "📍 Paso 5: Ejecutando diagnóstico..." -ForegroundColor Cyan
Write-Host ""
python diagnose.py

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "⚠️  Diagnóstico encontró algunos problemas" -ForegroundColor Yellow
    Write-Host "   Arregla los errores y corre nuevamente" -ForegroundColor Yellow
    Read-Host "   Presiona ENTER para continuar de todas formas"
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    INICIANDO SERVIDOR FLASK                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏳ El servidor está iniciando..." -ForegroundColor Yellow
Write-Host "   Espera a ver: '* Running on http://localhost:5000'" -ForegroundColor Yellow
Write-Host ""

# Paso 6: Iniciar servidor
python run.py
