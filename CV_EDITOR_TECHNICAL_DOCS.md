# CV Editor - Documentación Técnica

## Estructura de Datos

### Modelo CV (Backend)

```python
class CV(db.Model):
    # Campos existentes
    id: Integer (PK)
    user_id: Integer (FK)
    filename: String
    file_path: String
    file_size: Integer
    analysis: JSON
    skills: JSON (list of strings)
    experience_years: Integer
    job_titles: JSON (list of strings)
    ats_score: Float
    optimized: Boolean
    uploaded_at: DateTime
    analyzed_at: DateTime
    
    # Nuevos campos editables
    summary: Text
    experience: JSON
    education: JSON
    certifications: JSON
    updated_at: DateTime
```

### Estructura JSON - Experience

```json
{
  "experience": [
    {
      "position": "Senior Software Engineer",
      "company": "TechCorp",
      "start_date": "2020-01-15",
      "end_date": "2023-12-31",
      "description": "Led development of microservices..."
    }
  ]
}
```

### Estructura JSON - Education

```json
{
  "education": [
    {
      "school": "Universidad de Chile",
      "degree": "Licenciatura",
      "field": "Ingeniería en Computación",
      "graduation_year": 2019
    }
  ]
}
```

### Estructura JSON - Certifications

```json
{
  "certifications": [
    {
      "title": "AWS Solutions Architect",
      "issuer": "Amazon Web Services",
      "issue_date": "2021-06-15",
      "expiration_date": "2024-06-15"
    }
  ]
}
```

## API Endpoints

### GET /api/cv/current
Obtiene el CV actual del usuario autenticado.

**Response:**
```json
{
  "success": true,
  "cv": {
    "id": 1,
    "filename": "cv.pdf",
    "ats_score": 85,
    "skills": ["Python", "React"],
    "experience_years": 5,
    "job_titles": ["Developer", "Engineer"],
    "summary": "...",
    "experience": [...],
    "education": [...],
    "certifications": [...]
  }
}
```

### PUT /api/cv/update/{cv_id}
Actualiza campos editables del CV.

**Request Body:**
```json
{
  "summary": "New summary text",
  "skills": ["Python", "JavaScript", "AWS"],
  "experience": [...],
  "education": [...],
  "certifications": [...]
}
```

**Response:**
```json
{
  "success": true,
  "message": "CV updated successfully",
  "cv": { ... }
}
```

## Componente React - CVEditor

### Props

```typescript
interface CVEditorProps {
  cv: CVData;           // CV actual
  onSave: (cv: CVData) => void;  // Callback después de guardar
  loading?: boolean;    // Estado de carga
}
```

### Estado Interno

```typescript
{
  formData: {
    summary: string,
    skills: string[],
    experience: Experience[],
    education: Education[],
    certifications: Certification[]
  },
  expandedSections: {
    [section: string]: boolean
  },
  editingExperience: number | null,
  editingEducation: number | null,
  editingCertification: number | null,
  newSkill: string
}
```

### Funciones Principales

- `toggleSection(section)` - Abre/cierra secciones
- `handleSummaryChange(e)` - Actualiza resumen
- `addSkill()` - Agrega skill nuevo
- `removeSkill(index)` - Elimina skill
- `addExperience()` - Agrega experiencia nueva
- `updateExperience(index, field, value)` - Actualiza campo de experiencia
- `removeExperience(index)` - Elimina experiencia
- `addEducation()` - Similar a experiencia
- `addCertification()` - Similar a experiencia
- `handleSave()` - Envía cambios al backend

## Integración en Dashboard

### Estado Adicional

```javascript
const [showCVEditor, setShowCVEditor] = useState(false)
const [savingCV, setSavingCV] = useState(false)
```

### Handler

```javascript
const handleCVSave = (updatedCv) => {
  setCv(updatedCv)
  setShowCVEditor(false)
  toast.success('CV actualizado correctamente')
  setSavingCV(false)
}
```

### Renderizado Condicional

```jsx
{!showCVEditor && (
  <button onClick={() => setShowCVEditor(true)}>
    Editar Información del CV →
  </button>
)}

{showCVEditor && (
  <CVEditor
    cv={cv}
    onSave={handleCVSave}
    loading={savingCV}
  />
)}
```

## Consideraciones de Diseño

### UX Decisions

1. **Secciones Expandibles**: Reducen abarrotamiento visual
2. **Summary y Skills Expandidas**: Son las más editadas
3. **Botones de Agregar Separados**: Claridad sobre cómo agregar múltiples items
4. **Confirmación Toast**: Feedback inmediato al usuario
5. **Auto-collapse después de guardar**: Indica que el cambio fue procesado

### Validación

- Actualmente mínima (permitir strings vacíos)
- Mejora futura: Validar fechas coherentes
- Mejora futura: Requerir campos obligatorios

### Performance

- Estado local antes de enviar al servidor
- Único request cuando se hace click en "Guardar"
- Evita validación en cada keystroke

## Mejoras Futuras

### Phase 1 (Próximo)
- [ ] Recalcular ATS score basado en cambios
- [ ] Validación de fechas coherentes
- [ ] Campos obligatorios
- [ ] Confirmación antes de descartar cambios

### Phase 2
- [ ] Previsualización de CV
- [ ] Exportación a PDF
- [ ] Timeline visual de experiencia
- [ ] Sugerencias de skills basadas en job requirements

### Phase 3
- [ ] Versionamiento de CV (histórico)
- [ ] Comparación de versiones
- [ ] Template de experiencia/educación
- [ ] Auto-save en background

## Testing

### Manual Tests Realizados
- ✅ Crear/editar/eliminar skills
- ✅ Agregar múltiples experiencias
- ✅ Guardar cambios
- ✅ Validar que los cambios persisten

### Tests Pendientes (TODO)
- [ ] Validar integridad de datos con backend
- [ ] Prueba de dates inválidas
- [ ] Comportamiento con CV corrupto
- [ ] Manejo de errores de red

## Troubleshooting

### Los cambios no se guardan
1. Verificar conexión a internet
2. Revisar consola del navegador (F12)
3. Verificar que el backend está corriendo en 5000

### El editor se ve cortado
1. Aumentar altura del viewport
2. Verificar que no hay overflow en parent

### Skills no se agregan
1. Verificar que el campo no esté vacío
2. Presionar Enter después de escribir
3. O hacer clic en el botón "+"
