# 📦 Skills Locales - Setup

Tres librerías/skills instaladas localmente para usar en todos tus proyectos:

## 1. **Sonner** (v2.0.7) - Toast Notifications para React
- **Ubicación:** `./sonner`
- **Uso:** Componente toast hermoso para React
- **Instalación en tu proyecto:**
  ```bash
  npm install ../skills/sonner
  # o usar el local directamente
  npm install file:../skills/sonner
  ```
- **Uso en código:**
  ```jsx
  import { Toaster, toast } from 'sonner'
  
  export function App() {
    return (
      <>
        <Toaster />
        <button onClick={() => toast.success('¡Éxito!')}>
          Mostrar notificación
        </button>
      </>
    )
  }
  ```

## 2. **Impeccable** (v2.1.9) - Design Skill para AI Coding
- **Ubicación:** `./impeccable`
- **Uso:** Detecta anti-patrones en UI/CSS, mejora diseño frontal
- **CLI:**
  ```bash
  npx ./impeccable detect ./src/
  npx ./impeccable live
  ```
- **Skill para Cursor/Claude Code:**
  - Invocable con `/impeccable` en el editor
  - Comandos: `/impeccable audit`, `/impeccable polish`, `/impeccable critique`
  - Detecta issues: bajo contraste, tipografía plana, exceso de imágenes, etc.

## 3. **Taste Skill** - Design System Skills
- **Ubicación:** `./taste-skill`
- **Uso:** Collection de skills para mejorar diseño
- **Contenido:** Scripts y referencias para design workflow

---

## 🔧 Instalación Global (Recomendado)

Para usar estas skills en **TODOS tus proyectos** sin tener que copiarlas:

### Opción 1: Links Simbólicos (Recomendado)
```bash
# En la carpeta de tu proyecto nuevo, crea links a las skills
mkdir -p node_modules
ln -s ../../../skills/sonner node_modules/sonner
```

### Opción 2: npm link (Más fácil)
```bash
# En cada carpeta de skill
cd skills/sonner && npm link
cd ../impeccable && npm link
cd ../taste-skill && npm link

# En tu proyecto nuevo
npm link sonner
npm link impeccable
npm link taste-skill
```

### Opción 3: Path Aliases en package.json
```json
{
  "dependencies": {
    "sonner": "file:../skills/sonner",
    "impeccable": "file:../skills/impeccable"
  }
}
```

---

## 📚 Skills Disponibles

| Skill | Tipo | Uso | Comando |
|-------|------|-----|---------|
| **Sonner** | React Library | Notificaciones/Toast | `npm install sonner` |
| **Impeccable** | Design Checker | Auditar diseño | `/impeccable` en editor |
| **Taste** | Design System | Referencia de diseño | Consultar `skills/taste-skill/` |

---

## 💡 Próximos Pasos

1. **Para React Frontend:**
   ```bash
   npm install file:./skills/sonner
   npm install file:./skills/impeccable
   ```

2. **En Cursor/Claude Code:**
   - Las skills de impeccable estarán disponibles automáticamente
   - Usa `/impeccable` para cualquier tarea de diseño

3. **Para nuevo proyecto:**
   - Copia este directorio de skills a `../../skills`
   - O usa npm link para acceso global

---

**Setup completado.** ✅
