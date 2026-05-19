# 📦 Script PowerShell para instalar las skills locales como globales
# Permite usarlas en cualquier proyecto sin copiar archivos

Write-Host "🔗 Registrando skills locales con npm link..." -ForegroundColor Green

# Obtener el directorio actual (donde está este script)
$skillsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $skillsDir

# Sonner - Toast component para React
Write-Host "→ Registrando Sonner..." -ForegroundColor Cyan
Push-Location sonner
npm link
Pop-Location

# Impeccable - Design skill
Write-Host "→ Registrando Impeccable..." -ForegroundColor Cyan
Push-Location impeccable
npm link
Pop-Location

# Taste-skill
Write-Host "→ Registrando Taste-skill..." -ForegroundColor Cyan
if (Test-Path "taste-skill/package.json") {
    Push-Location taste-skill
    npm link
    Pop-Location
} else {
    Write-Host "⚠️  taste-skill no tiene package.json, skipping..." -ForegroundColor Yellow
}

Pop-Location

Write-Host ""
Write-Host "✅ Skills registradas globalmente!" -ForegroundColor Green
Write-Host ""
Write-Host "Ahora en tus proyectos puedes usar:" -ForegroundColor Yellow
Write-Host "  npm link sonner"
Write-Host "  npm link impeccable"
Write-Host "  npm link taste-skill"
Write-Host ""
Write-Host "O instalar directamente:" -ForegroundColor Yellow
Write-Host "  npm install file:../skills/sonner"
