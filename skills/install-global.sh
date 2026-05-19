#!/bin/bash

# 📦 Script para instalar las skills localmente como globales
# Permite usarlas en cualquier proyecto sin copiar archivos

echo "🔗 Registrando skills locales con npm link..."

# Ir a cada skill y ejecutar npm link
cd "$(dirname "$0")"

# Sonner - Toast component para React
echo "→ Registrando Sonner..."
cd sonner
npm link
cd ..

# Impeccable - Design skill
echo "→ Registrando Impeccable..."
cd impeccable
npm link
cd ..

# Taste-skill
echo "→ Registrando Taste-skill..."
cd taste-skill
# Este podría no tener package.json, so skip if not present
if [ -f "package.json" ]; then
    npm link
fi
cd ..

echo ""
echo "✅ Skills registradas globalmente!"
echo ""
echo "Ahora en tus proyectos puedes usar:"
echo "  npm link sonner"
echo "  npm link impeccable"
echo "  npm link taste-skill"
echo ""
echo "O instalar directamente:"
echo "  npm install file:../skills/sonner"
