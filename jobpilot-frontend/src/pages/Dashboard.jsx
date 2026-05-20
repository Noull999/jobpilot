import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { userAPI, chatAPI, cvAPI, jobsAPI } from '../services/api'
import CVEditor from '../components/CVEditor'
import ExperienceFilter from '../components/ExperienceFilter'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('dashboard')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState('welcome')
  const [cvUploaded, setCvUploaded] = useState(false)
  const [showChatPanel, setShowChatPanel] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [cv, setCv] = useState(null)
  const [jobMatches, setJobMatches] = useState([])
  const [cvUploading, setCvUploading] = useState(false)
  const [showAllJobs, setShowAllJobs] = useState(false)
  const [generateLetterLoading, setGenerateLetterLoading] = useState(false)
  const [coverLetterForm, setCoverLetterForm] = useState({
    position: '',
    company: '',
    tone: 'formal'
  })
  const [generatedLetter, setGeneratedLetter] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [editingSkills, setEditingSkills] = useState(false)
  const [newSkill, setNewSkill] = useState('')
  const [tempSkills, setTempSkills] = useState([])
  const [showCVEditor, setShowCVEditor] = useState(false)
  const [savingCV, setSavingCV] = useState(false)
  const [applications, setApplications] = useState([])
  const [selectedExperienceFilter, setSelectedExperienceFilter] = useState(null)
  const [selectedJobsExperienceFilter, setSelectedJobsExperienceFilter] = useState(null)
  const fileInputRef = useRef()
  const cvUploadRef = useRef()

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      navigate('/login')
      return
    }

    const hasCompletedOnboarding = localStorage.getItem('onboarding-completed')
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true)
      setLoading(false)
      return
    }

    loadDashboard()
  }, [navigate])

  useEffect(() => {
    if (activeView === 'applications') {
      jobsAPI.applications()
        .then(res => setApplications(res.data?.applications || []))
        .catch(() => setApplications([]))
    }
  }, [activeView])

  const loadDashboard = async () => {
    try {
      const [userRes, statsRes, cvRes, jobsRes, appsRes] = await Promise.all([
        userAPI.profile(),
        userAPI.stats(),
        cvAPI.current().catch(() => ({ data: { cv: null } })),
        jobsAPI.matches(10).catch(() => ({ data: { matches: [] } })),
        jobsAPI.applications().catch(() => ({ data: { applications: [] } }))
      ])
      setUser(userRes.data?.user)
      setStats(statsRes.data?.stats)
      setCv(cvRes.data?.cv)
      if (cvRes.data?.cv) setCvUploaded(true)
      setJobMatches(jobsRes.data?.matches || [])
      setApplications(appsRes.data?.applications || [])
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('access_token')
        navigate('/login')
      } else {
        toast.error('Error al cargar el dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    navigate('/')
    toast.success('Sesión cerrada')
  }

  const filterByExperience = (matches, filterLevel) => {
    if (filterLevel === null) return matches
    const userExperience = cv?.experience_years || 0
    return matches.filter(match => {
      if (filterLevel === 3) return userExperience >= 3
      return userExperience >= filterLevel
    })
  }

  const completeOnboarding = () => {
    localStorage.setItem('onboarding-completed', 'true')
    setShowOnboarding(false)
    setOnboardingStep('welcome')
    toast.success('¡Bienvenido a JobPilot!')
    loadDashboard()
  }

  const handleCvUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCvUploading(true)
    try {
      const res = await cvAPI.upload(file)
      setCv(res.data.cv)
      setCvUploaded(true)
      setOnboardingStep('results')
      toast.success('CV cargado y analizado')

      // Cargar nuevos matches
      const matchesRes = await jobsAPI.matches(10)
      setJobMatches(matchesRes.data?.matches || [])
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message
      toast.error(errorMsg)
    } finally {
      setCvUploading(false)
    }
  }

  const startEditingSkills = () => {
    setTempSkills(cv?.skills || [])
    setEditingSkills(true)
  }

  const addSkill = () => {
    if (newSkill.trim() && !tempSkills.includes(newSkill.trim())) {
      setTempSkills([...tempSkills, newSkill.trim()])
      setNewSkill('')
    }
  }

  const removeSkill = (skillToRemove) => {
    setTempSkills(tempSkills.filter(s => s !== skillToRemove))
  }

  const saveSkills = async () => {
    if (!cv) return
    try {
      const updatedCv = { ...cv, skills: tempSkills }
      setCv(updatedCv)
      setEditingSkills(false)
      toast.success('Skills actualizados')
      // Reload matches con skills nuevas
      const matchesRes = await jobsAPI.matches(10)
      setJobMatches(matchesRes.data?.matches || [])
    } catch (error) {
      toast.error('Error al actualizar skills')
    }
  }

  const handleCVSave = (updatedCv) => {
    setCv(updatedCv)
    setShowCVEditor(false)
    toast.success('CV actualizado correctamente')
    setSavingCV(false)
  }

  const refreshJobMatches = async () => {
    try {
      const matchesRes = await jobsAPI.matches(10)
      setJobMatches(matchesRes.data?.matches || [])
      toast.success('Empleos actualizados')
    } catch (error) {
      toast.error('Error al actualizar empleos')
    }
  }

  const loadChatHistory = async () => {
    try {
      const res = await chatAPI.history()
      const history = res.data?.history || []
      const formattedMessages = history.flatMap((chat) => [
        { text: chat.message_user, sender: 'user' },
        { text: chat.message_ai, sender: 'coach' }
      ])
      setChatMessages(formattedMessages)
    } catch (error) {
      console.error('Error loading chat:', error)
    }
  }

  const sendMessage = async () => {
    if (!chatInput.trim() && !selectedFile) return

    const userMessage = { text: selectedFile ? `📎 ${selectedFile.name}\n${chatInput || ''}` : chatInput, sender: 'user' }
    setChatMessages([...chatMessages, userMessage])
    setChatInput('')
    setChatLoading(true)

    try {
      let res
      if (selectedFile) {
        res = await chatAPI.sendWithFile(chatInput || `Analiza este archivo: ${selectedFile.name}`, selectedFile, activeView)
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        res = await chatAPI.send(chatInput, activeView)
      }

      const coachMessage = { text: res.data?.response || 'Entendido', sender: 'coach' }
      setChatMessages((prev) => [...prev, coachMessage])
    } catch (error) {
      const status = error.response?.status
      let errorMsg = 'Error al enviar mensaje'

      if (status === 402) {
        errorMsg = 'Créditos de API agotados. Agrega $2 USD a tu cuenta de Anthropic Console.'
      } else if (status === 429) {
        errorMsg = 'Límite de mensajes alcanzado. Upgrade a Pro para acceso ilimitado.'
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message
      }

      toast.error(errorMsg)
      setChatMessages((prev) => prev.slice(0, -1))
    } finally {
      setChatLoading(false)
    }
  }

  const openChatPanel = async () => {
    setShowChatPanel(true)
    await loadChatHistory()
  }

  const handleGenerateLetter = async () => {
    if (!coverLetterForm.position.trim() || !coverLetterForm.company.trim()) {
      toast.error('Por favor completa todos los campos')
      return
    }

    setGenerateLetterLoading(true)
    try {
      const prompt = `Genera una carta de presentación ${coverLetterForm.tone} para el puesto de ${coverLetterForm.position} en ${coverLetterForm.company}. Considera mi CV y experiencia profesional. La carta debe ser persuasiva y destacar mis mejores habilidades.`

      const res = await chatAPI.send(prompt, 'cover')
      setGeneratedLetter(res.data?.response || '')
      toast.success('Carta generada exitosamente')
    } catch (error) {
      toast.error('Error al generar la carta')
    } finally {
      setGenerateLetterLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-header)]">
        <p className="text-gray-4">Cargando...</p>
      </div>
    )
  }

  if (showOnboarding) {
    return (
      <div className="flex min-h-[calc(100vh-header)] bg-black items-center justify-center">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

        {onboardingStep === 'welcome' && (
          <div className="relative bg-black-3 border border-gray-1 rounded-lg p-2xl max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-2xl">
                <div className="text-4xl mb-md">🚀</div>
                <h2 className="text-2xl font-bold text-white mb-md">Bienvenido a JobPilot</h2>
                <p className="text-gray-4 text-sm">Tu coach IA para encontrar el trabajo ideal</p>
              </div>

              <div className="space-y-md mb-2xl">
                <div className="bg-black rounded-lg p-md border border-gray-1 text-left">
                  <div className="flex gap-md items-start">
                    <span className="text-lg mt-xs">1️⃣</span>
                    <div>
                      <div className="font-semibold text-white text-sm">Sube tu CV</div>
                      <div className="text-xs text-gray-4 mt-xs">Análisis automático de tu perfil</div>
                    </div>
                  </div>
                </div>
                <div className="bg-black rounded-lg p-md border border-gray-1 text-left">
                  <div className="flex gap-md items-start">
                    <span className="text-lg mt-xs">2️⃣</span>
                    <div>
                      <div className="font-semibold text-white text-sm">Mira tus matches</div>
                      <div className="text-xs text-gray-4 mt-xs">Empleos que encajan con tu perfil</div>
                    </div>
                  </div>
                </div>
                <div className="bg-black rounded-lg p-md border border-gray-1 text-left">
                  <div className="flex gap-md items-start">
                    <span className="text-lg mt-xs">3️⃣</span>
                    <div>
                      <div className="font-semibold text-white text-sm">Chatea con Coach</div>
                      <div className="text-xs text-gray-4 mt-xs">Preparación y estrategia de búsqueda</div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setOnboardingStep('cv')}
                className="w-full btn btn-primary mb-md"
              >
                Empezar →
              </button>
              <button
                onClick={completeOnboarding}
                className="w-full btn btn-secondary text-xs"
              >
                Explorar después
              </button>
            </div>
          </div>
        )}

        {onboardingStep === 'cv' && (
          <div className="relative bg-black-3 border border-gray-1 rounded-lg p-2xl max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-2xl">
                <div className="text-4xl mb-md">📄</div>
                <h2 className="text-2xl font-bold text-white mb-md">Sube tu CV</h2>
                <p className="text-gray-4 text-sm">Lo analizaremos para encontrarte el mejor match</p>
              </div>

              <div className="mb-2xl">
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-gray-1 rounded-lg p-2xl cursor-pointer hover:border-red transition-colors">
                    <div className="text-4xl mb-md">⬆️</div>
                    <div className="text-sm font-semibold text-white mb-xs">Click para subir CV</div>
                    <div className="text-xs text-gray-4">PDF, DOC o DOCX • Máx 5MB</div>
                  </div>
                  <input
                    ref={cvUploadRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={handleCvUpload}
                  />
                </label>
              </div>

              <div className="text-left bg-black rounded-lg p-md border border-gray-1 mb-2xl">
                <div className="text-xs font-semibold text-gray-3 mb-md">¿Qué hacemos con tu CV?</div>
                <ul className="space-y-xs text-xs text-gray-4">
                  <li>✓ Análisis automático de skills y experiencia</li>
                  <li>✓ Puntuación ATS para optimización</li>
                  <li>✓ Recomendaciones personalizadas</li>
                </ul>
              </div>

              <button
                onClick={completeOnboarding}
                className="w-full btn btn-secondary text-xs"
              >
                Saltear por ahora
              </button>
            </div>
          </div>
        )}

        {onboardingStep === 'results' && (
          <div className="relative bg-black-3 border border-gray-1 rounded-lg p-2xl max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-2xl">
                <div className="text-4xl mb-md">✨</div>
                <h2 className="text-2xl font-bold text-white mb-md">¡CV Analizado!</h2>
                <p className="text-gray-4 text-sm">Encontramos {jobMatches?.length || 0} empleos que encajan contigo</p>
              </div>

              <div className="space-y-md mb-2xl">
                {jobMatches && jobMatches.length > 0 ? (
                  jobMatches.slice(0, 3).map((match, idx) => (
                    <div key={idx} className="flex items-center justify-between p-md bg-black rounded-lg border border-gray-1 text-left">
                      <div>
                        <div className="font-semibold text-white text-sm">{match.job?.company}</div>
                        <div className="text-xs text-gray-4">{match.job?.title}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red">{Math.round(match.match_score)}%</div>
                        <div className="text-xs text-gray-3">match</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-lg text-gray-4 text-sm">
                    Analizando tus matches...
                  </div>
                )}
              </div>

              <button
                onClick={completeOnboarding}
                className="w-full btn btn-primary"
              >
                Ver mi dashboard →
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-header)] bg-black">
      {/* SIDEBAR */}
      <aside className="w-64 bg-black-2 border-r border-gray-1 p-md flex flex-col">
        {/* Logo */}
        <div className="mb-4xl text-center">
          <div className="text-2xl font-bold mb-xs">
            Job<span className="text-red">Pilot</span>
          </div>
          <div className="text-xs text-gray-3">// tu coach IA</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-xs">
          <div className="text-xs uppercase text-gray-3 font-bold mb-md px-md">Menú Principal</div>

          {[
            { id: 'dashboard', label: 'Dashboard', icon: '◈' },
            { id: 'cv', label: 'Mi CV', icon: '▤' },
            { id: 'jobs', label: 'Empleos', icon: '⊞', badge: stats?.job_matches || 0 },
            { id: 'chat', label: 'Coach IA', icon: '◉', action: 'openChat' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.action === 'openChat') {
                  openChatPanel()
                } else {
                  setActiveView(item.id)
                }
              }}
              className={`w-full flex items-center gap-md px-md py-md rounded transition-colors ${
                (item.action === 'openChat' ? showChatPanel : activeView === item.id)
                  ? 'bg-black-3 text-white border-l-2 border-red'
                  : 'text-gray-4 hover:text-white hover:bg-black-3'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
              {item.badge ? (
                <span className="ml-auto text-xs bg-red text-white px-2 py-1 rounded-full">
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        {/* Tools Section */}
        <div className="border-t border-gray-1 pt-md mt-md">
          <div className="text-xs uppercase text-gray-3 font-bold mb-md px-md">Herramientas</div>
          <div className="space-y-xs">
            {[
              { id: 'cover', label: 'Carta de Presentación', icon: '✎' },
              { id: 'applications', label: 'Postulaciones', icon: '⊟' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-md px-md py-md rounded transition-colors ${
                  activeView === item.id
                    ? 'bg-black-3 text-white border-l-2 border-red'
                    : 'text-gray-4 hover:text-white hover:bg-black-3'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* User Card */}
        <div className="border-t border-gray-1 pt-md mt-md">
          <div className="bg-black-3 rounded-lg p-md border border-gray-1">
            <div className="flex items-center gap-md mb-md">
              <div className="w-10 h-10 rounded-full bg-red flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.substring(0, 2).toUpperCase() || 'JA'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
                <div className="text-xs text-gray-3 truncate">{user?.email}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full btn btn-secondary text-xs py-base"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* TOPBAR */}
        <div className="border-b border-gray-1 bg-black-2 px-2xl py-md flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Tu <em className="text-red not-italic">misión</em> laboral
            </h1>
            <div className="text-xs text-gray-3 mt-xs">// dashboard · resumen general</div>
          </div>
          <div className="flex items-center gap-md px-md py-base bg-black rounded-lg border border-gray-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-sm text-gray-4">Agente activo</span>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-2xl">
          {activeView === 'dashboard' && (
            <div className="space-y-2xl max-w-6xl">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
                {[
                  {
                    label: 'Tu Compatibilidad',
                    value: cv?.ats_score || 0,
                    suffix: '%',
                    trend: cv?.ats_score ? '✓ CV analizado' : '— Sube tu CV',
                    icon: '📊',
                    help: 'Qué tan bien tu CV encaja con empleos disponibles',
                  },
                  {
                    label: 'Empleos Recomendados',
                    value: jobMatches?.length || 0,
                    trend: jobMatches?.length ? `Encontramos ${jobMatches.length} matches` : '— Carga CV',
                    icon: '💼',
                    help: 'Posiciones que coinciden con tu perfil',
                  },
                  {
                    label: 'Postulaciones',
                    value: stats?.total_chats || 0,
                    trend: '— Empieza ya',
                    icon: '📝',
                    help: 'Empleos a los que ya has aplicado',
                  },
                  {
                    label: 'Estado del CV',
                    value: cv ? 'OPTIMIZADO' : 'PENDIENTE',
                    trend: cv ? '✓ Listo' : '→ Sube tu CV',
                    icon: '📄',
                    help: 'Si tu CV está optimizado para sistemas ATS',
                  },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-black-3 border border-gray-1 rounded-lg p-lg group relative cursor-help">
                    <div className="flex items-start justify-between mb-md">
                      <div className="text-gray-3 text-xs uppercase font-bold">{stat.label}</div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="text-xs text-gray-4 bg-black rounded px-2 py-1 whitespace-nowrap absolute top-full mt-2 right-0 z-10 border border-gray-1">
                          {stat.help}
                        </div>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-red mb-md">
                      {stat.value}
                      {stat.suffix && <span className="text-gray-3 text-lg ml-1">{stat.suffix}</span>}
                    </div>
                    <div className="text-xs text-gray-4">{stat.trend}</div>
                  </div>
                ))}
              </div>

              {/* Profile Section */}
              <div className="bg-black-3 border border-gray-1 rounded-lg p-lg">
                <div className="flex items-start justify-between mb-lg pb-lg border-b border-gray-1">
                  <div>
                    <div className="flex items-center gap-md">
                      <span className="text-sm text-gray-3">▸</span>
                      <h2 className="text-lg font-bold text-white">Tu perfil profesional</h2>
                    </div>
                    <div className="text-xs text-gray-3 mt-xs">// análisis de tu CV y experiencia</div>
                  </div>
                  <Link to="/chat" className="btn btn-ghost text-sm">
                    Preguntar al Coach →
                  </Link>
                </div>

                {cv ? (
                  <div className="space-y-md">
                    {/* Profile Header */}
                    <div className="flex items-start gap-lg p-md bg-black rounded-lg border border-gray-1">
                      <div className="w-16 h-16 rounded-lg bg-red flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                        {user?.name?.substring(0, 2).toUpperCase() || 'JA'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-bold mb-xs">{user?.name}</div>
                        <div className="text-sm text-gray-4 mb-md">
                          {cv?.job_titles?.[0] || 'Profesional'}
                          {cv?.experience_years && ` • ${cv.experience_years} años de experiencia`}
                        </div>
                        <div className="flex items-center gap-md">
                          <div className="flex-1">
                            <div className="text-xs text-gray-3 mb-xs">Puntuación ATS</div>
                            <div className="flex items-center gap-md">
                              <div className="flex-1 bg-gray-1 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-red h-full"
                                  style={{ width: `${cv?.ats_score || 0}%` }}
                                />
                              </div>
                              <span className="text-lg font-bold text-red w-10 text-right">{cv?.ats_score || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Skills Section */}
                    {cv?.skills && cv.skills.length > 0 && (
                      <div className="p-md bg-black rounded-lg border border-gray-1">
                        <div className="flex items-center justify-between mb-md">
                          <h3 className="text-sm text-gray-4 font-semibold">Skills Técnicos ({cv.skills.length})</h3>
                          <button
                            onClick={() => {
                              setTempSkills(cv?.skills || [])
                              setEditingSkills(true)
                              setActiveView('cv')
                            }}
                            className="text-xs text-red hover:text-red/80 transition-colors"
                          >
                            Editar
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-xs">
                          {cv.skills.map((skill) => (
                            <span key={skill} className="px-md py-xs bg-red text-white text-xs rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Experience Section */}
                    {cv?.job_titles && cv.job_titles.length > 0 && (
                      <div className="p-md bg-black rounded-lg border border-gray-1">
                        <h3 className="text-sm text-gray-4 mb-md font-semibold">Experiencia Laboral</h3>
                        <div className="space-y-xs">
                          {cv.job_titles.map((title, idx) => (
                            <div key={idx} className="text-sm text-white">• {title}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CV Info */}
                    <div className="p-md bg-black rounded-lg border border-gray-1">
                      <h3 className="text-sm text-gray-4 mb-md font-semibold">Información del CV</h3>
                      <div className="space-y-xs text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-4">Archivo:</span>
                          <span className="text-white">{cv?.filename}</span>
                        </div>
                        {cv?.uploaded_at && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-4">Cargado:</span>
                            <span className="text-white">{new Date(cv.uploaded_at).toLocaleDateString('es-ES')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveView('cv')}
                      className="w-full btn btn-secondary text-sm"
                    >
                      Actualizar CV
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-2xl">
                    <div className="text-3xl mb-md">📄</div>
                    <h3 className="text-white font-semibold mb-md">Aún no subimos tu CV</h3>
                    <p className="text-gray-4 text-sm mb-lg">Carga tu CV para que nuestro Coach analice tu perfil y te recomiende empleos personalizados</p>
                    <button
                      onClick={() => setActiveView('cv')}
                      className="btn btn-primary text-sm"
                    >
                      Subir CV →
                    </button>
                  </div>
                )}
              </div>

              {/* Top Opportunities */}
              <div className="bg-black-3 border border-gray-1 rounded-lg p-lg">
                <div className="flex items-start justify-between mb-lg pb-lg border-b border-gray-1">
                  <div>
                    <div className="flex items-center gap-md">
                      <span className="text-sm text-gray-3">▸</span>
                      <h2 className="text-lg font-bold text-white">Empleos recomendados</h2>
                    </div>
                    <div className="text-xs text-gray-3 mt-xs">// que mejor encajan con tu perfil</div>
                  </div>
                  <button
                    onClick={() => setShowAllJobs(true)}
                    className="btn btn-secondary text-sm"
                  >
                    Ver todos →
                  </button>
                </div>

                {jobMatches && jobMatches.length > 0 && (
                  <div className="mb-lg">
                    <ExperienceFilter
                      selected={selectedExperienceFilter}
                      onChange={setSelectedExperienceFilter}
                    />
                  </div>
                )}

                {jobMatches && jobMatches.length > 0 ? (
                  <div className="space-y-md">
                    {filterByExperience(jobMatches, selectedExperienceFilter).slice(0, 3).map((match, idx) => (
                      <Link
                        key={idx}
                        to={`/jobs/${match.job_id}`}
                        state={{ match }}
                        className="block"
                      >
                        <div className="flex items-center justify-between p-md bg-black rounded-lg border border-gray-1 hover:border-red transition-colors cursor-pointer">
                          <div>
                            <div className="font-semibold text-white">{match.job?.company}</div>
                            <div className="text-sm text-gray-4">{match.job?.title}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-red">{Math.round(match.match_score)}%</div>
                            <div className="text-xs text-gray-3">compatibilidad</div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2xl">
                    <div className="text-3xl mb-md">🎯</div>
                    <p className="text-gray-4 text-sm mb-lg">Una vez cargues tu CV, veremos aquí los empleos que mejor encajan contigo</p>
                    <button
                      onClick={() => setActiveView('cv')}
                      className="btn btn-primary text-sm"
                    >
                      Subir CV ahora →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'cv' && (
            <div className="max-w-4xl space-y-lg">
              {cv ? (
                <>
                  {/* CV Analysis */}
                  <div className="bg-black-3 border border-gray-1 rounded-lg p-lg">
                    <h2 className="text-xl font-bold text-white mb-lg">Análisis de tu CV</h2>
                    <div className="space-y-lg">
                      {/* ATS Score */}
                      <div className="p-lg bg-black rounded-lg border border-gray-1">
                        <div className="mb-lg">
                          <div className="flex items-center justify-between mb-md">
                            <span className="text-sm text-gray-4">Puntuación ATS (Compatibility)</span>
                            <span className={`font-bold text-lg ${cv?.ats_score >= 80 ? 'text-green-500' : cv?.ats_score >= 60 ? 'text-yellow-500' : 'text-orange-500'}`}>
                              {cv?.ats_score || 0}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-1 rounded-full h-3 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                cv?.ats_score >= 80
                                  ? 'bg-green-500'
                                  : cv?.ats_score >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-orange-500'
                              }`}
                              style={{ width: `${cv?.ats_score || 0}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-3">
                          {cv?.ats_score >= 80
                            ? '✓ Excelente compatibilidad con sistemas ATS'
                            : cv?.ats_score >= 60
                            ? '⚠ Buena compatibilidad, pero hay espacio para mejora'
                            : '→ Necesita optimización para sistemas ATS'}
                        </p>
                      </div>

                      {/* Skills Summary */}
                      <div className="p-lg bg-black rounded-lg border border-gray-1">
                        <div className="flex items-center justify-between mb-md">
                          <h3 className="text-white font-bold">
                            Skills Detectados ({editingSkills ? tempSkills.length : cv?.skills?.length || 0})
                          </h3>
                          {!editingSkills && (
                            <button
                              onClick={startEditingSkills}
                              className="btn btn-secondary text-xs py-xs px-md"
                            >
                              Editar
                            </button>
                          )}
                        </div>

                        {editingSkills ? (
                          <div className="space-y-md">
                            {/* Edit Mode */}
                            <div className="flex gap-md">
                              <input
                                type="text"
                                value={newSkill}
                                onChange={(e) => setNewSkill(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                                placeholder="Agrega un skill..."
                                className="flex-1 input-base text-sm bg-black-3 border border-gray-1 text-white placeholder-gray-4 rounded px-md py-xs"
                              />
                              <button
                                onClick={addSkill}
                                className="btn btn-primary text-xs px-md py-xs"
                              >
                                +
                              </button>
                            </div>

                            {tempSkills.length > 0 ? (
                              <div className="flex flex-wrap gap-md">
                                {tempSkills.map((skill) => (
                                  <div
                                    key={skill}
                                    className="px-md py-xs bg-red text-white text-xs rounded flex items-center gap-md hover:bg-red/80 transition-colors"
                                  >
                                    <span>{skill}</span>
                                    <button
                                      onClick={() => removeSkill(skill)}
                                      className="font-bold hover:text-black transition-colors"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-4">No hay skills agregados</p>
                            )}

                            <div className="flex gap-md pt-md">
                              <button
                                onClick={saveSkills}
                                className="btn btn-primary text-sm flex-1"
                              >
                                Guardar cambios
                              </button>
                              <button
                                onClick={() => setEditingSkills(false)}
                                className="btn btn-secondary text-sm flex-1"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {cv?.skills && cv.skills.length > 0 ? (
                              <div className="flex flex-wrap gap-md">
                                {cv.skills.map((skill) => (
                                  <span key={skill} className="px-md py-xs bg-red text-white text-xs rounded">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-4">No se detectaron skills en tu CV. Agrega algunos con el botón "Editar"</p>
                            )}
                          </>
                        )}
                      </div>

                      {/* Experience Summary */}
                      <div className="p-lg bg-black rounded-lg border border-gray-1">
                        <h3 className="text-white font-bold mb-md">Experiencia</h3>
                        <div className="space-y-md">
                          <div>
                            <span className="text-xs text-gray-4">Años de experiencia:</span>
                            <p className="text-white font-semibold text-lg mt-xs">
                              {cv?.experience_years || 0} años
                            </p>
                          </div>
                          {cv?.job_titles && cv.job_titles.length > 0 && (
                            <div>
                              <span className="text-xs text-gray-4 block mb-md">Puestos anteriores:</span>
                              <div className="space-y-xs">
                                {cv.job_titles.map((title, idx) => (
                                  <div key={idx} className="text-sm text-white flex items-start gap-md">
                                    <span className="text-gray-3 mt-xs">•</span>
                                    <span>{title}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* AI Recommendations */}
                      <div className="p-lg bg-black rounded-lg border border-gray-1">
                        <h3 className="text-white font-bold mb-md">Recomendaciones</h3>
                        <ul className="space-y-md text-sm text-gray-4">
                          {cv?.skills?.length > 0 && (
                            <li>✓ Tienes {cv.skills.length} skills relevantes detectadas</li>
                          )}
                          {cv?.experience_years >= 5 && (
                            <li>✓ Experiencia sólida ({cv.experience_years}+ años)</li>
                          )}
                          {cv?.ats_score < 70 && (
                            <li>→ Mejora formato y estructura para mejor puntuación ATS</li>
                          )}
                          {(!cv?.skills || cv.skills.length === 0) && (
                            <li>→ Asegúrate de listar todos tus skills técnicos</li>
                          )}
                          <li>→ Agrega portafolio o GitHub para más credibilidad</li>
                          <li>→ Incluye certificaciones si tienes</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* CV Editor Section */}
                  {!showCVEditor && (
                    <div className="text-center">
                      <button
                        onClick={() => setShowCVEditor(true)}
                        className="btn btn-secondary"
                      >
                        Editar Información del CV →
                      </button>
                    </div>
                  )}

                  {showCVEditor && (
                    <CVEditor
                      cv={cv}
                      onSave={handleCVSave}
                      loading={savingCV}
                    />
                  )}

                  {/* Upload New CV */}
                  <div className="bg-black-3 border border-gray-1 rounded-lg p-lg text-center">
                    <p className="text-gray-4 mb-md text-sm">¿Quieres actualizar tu CV con uno nuevo?</p>
                    <label className="block cursor-pointer">
                      <input
                        ref={cvUploadRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                        onChange={handleCvUpload}
                      />
                      <button
                        onClick={() => cvUploadRef.current?.click()}
                        className="btn btn-primary"
                        disabled={cvUploading}
                      >
                        {cvUploading ? 'Analizando...' : 'Subir nuevo CV →'}
                      </button>
                    </label>
                  </div>
                </>
              ) : (
                <div className="text-center py-2xl">
                  <div className="text-3xl mb-md">📄</div>
                  <h3 className="text-white font-semibold mb-md">Aún no subimos tu CV</h3>
                  <p className="text-gray-4 text-sm mb-lg">Carga tu CV para que nuestro Coach analice tu perfil y te recomiende empleos personalizados</p>
                  <label className="block">
                    <input
                      ref={cvUploadRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={handleCvUpload}
                    />
                    <button
                      onClick={() => cvUploadRef.current?.click()}
                      className="btn btn-primary"
                      disabled={cvUploading}
                    >
                      {cvUploading ? 'Analizando...' : 'Subir CV →'}
                    </button>
                  </label>
                </div>
              )}
            </div>
          )}

          {activeView === 'chat' && (
            <div className="max-w-2xl">
              <Link to="/chat" className="btn btn-primary">
                Abrir Chat Completo →
              </Link>
            </div>
          )}

          {activeView === 'jobs' && (
            <div className="max-w-4xl">
              <h2 className="text-xl font-bold text-white mb-lg">Empleos Recomendados</h2>
              <button onClick={refreshJobMatches} className="btn btn-primary mb-lg">⟳ Actualizar</button>
              {jobMatches && jobMatches.length > 0 && (
                <div className="mb-lg">
                  <ExperienceFilter
                    selected={selectedJobsExperienceFilter}
                    onChange={setSelectedJobsExperienceFilter}
                  />
                </div>
              )}
              {jobMatches && jobMatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                  {filterByExperience(jobMatches, selectedJobsExperienceFilter).map((match, idx) => (
                    <div key={idx} className="bg-black-3 border border-gray-1 rounded-lg p-lg hover:border-red transition-colors">
                      <div className="mb-md">
                        <h3 className="text-white font-bold text-lg">{match.job?.title}</h3>
                        <p className="text-sm text-gray-4">{match.job?.company} • {match.job?.location}</p>
                      </div>
                      <p className="text-sm text-gray-4 mb-md line-clamp-2">{match.job?.description}</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-gray-3">Compatibilidad:</span>
                          <div className="text-lg font-bold text-red">{Math.round(match.match_score)}%</div>
                        </div>
                        <Link to={`/jobs/${match.job_id}`} state={{ match }} className="btn btn-secondary text-sm">
                          Ver Oferta →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2xl">
                  <p className="text-gray-4 text-sm">No hay empleos disponibles. Sube tu CV para encontrar matches.</p>
                </div>
              )}
            </div>
          )}

          {activeView === 'cover' && (
            <div className="max-w-4xl space-y-lg">
              <div className="bg-black-3 border border-gray-1 rounded-lg p-lg">
                <h2 className="text-xl font-bold text-white mb-lg">Generador de Carta de Presentación</h2>
                <div className="space-y-lg">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-md">Puesto Objetivo</label>
                    <input
                      type="text"
                      placeholder="Ej: Developer Full Stack"
                      value={coverLetterForm.position}
                      onChange={(e) => setCoverLetterForm({ ...coverLetterForm, position: e.target.value })}
                      className="w-full input-base bg-black border border-gray-1 text-white placeholder-gray-4 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-md">Empresa</label>
                    <input
                      type="text"
                      placeholder="Ej: Google, Mercado Libre"
                      value={coverLetterForm.company}
                      onChange={(e) => setCoverLetterForm({ ...coverLetterForm, company: e.target.value })}
                      className="w-full input-base bg-black border border-gray-1 text-white placeholder-gray-4 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-md">Tono Deseado</label>
                    <select
                      value={coverLetterForm.tone}
                      onChange={(e) => setCoverLetterForm({ ...coverLetterForm, tone: e.target.value })}
                      className="w-full input-base bg-black border border-gray-1 text-white rounded"
                    >
                      <option value="formal">Formal y Profesional</option>
                      <option value="casual">Casual y Descontracturado</option>
                      <option value="energetic">Energético y Dinámico</option>
                    </select>
                  </div>
                  <button
                    onClick={handleGenerateLetter}
                    disabled={generateLetterLoading}
                    className="btn btn-primary w-full"
                  >
                    {generateLetterLoading ? 'Generando...' : 'Generar Carta con Coach →'}
                  </button>
                </div>
              </div>

              {generatedLetter && (
                <div className="bg-black-3 border border-gray-1 rounded-lg p-lg">
                  <div className="flex items-center justify-between mb-lg pb-lg border-b border-gray-1">
                    <h3 className="text-lg font-bold text-white">Tu Carta Generada</h3>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedLetter)
                        toast.success('Copiado al portapapeles')
                      }}
                      className="btn btn-secondary text-sm"
                    >
                      Copiar →
                    </button>
                  </div>
                  <div className="bg-black rounded-lg p-lg text-gray-3 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto border border-gray-1">
                    {generatedLetter}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeView === 'applications' && (
            <div className="max-w-4xl">
              <div className="bg-black-3 border border-gray-1 rounded-lg p-lg">
                <h2 className="text-xl font-bold text-white mb-lg">Seguimiento de Postulaciones</h2>
                {applications && applications.length > 0 ? (
                  <div className="space-y-md">
                    {applications.map((app) => (
                      <div key={app.id} className="border border-gray-1 rounded-lg p-md bg-black hover:bg-black-2 transition">
                        <div className="flex justify-between items-start mb-md">
                          <div className="flex-1">
                            <Link to={`/jobs/${app.job_id}`} className="text-lg font-semibold text-blue-3 hover:text-blue-2">
                              Empleo ID: {app.job_id}
                            </Link>
                          </div>
                          <span className={`px-md py-sm rounded text-sm font-medium ${
                            app.status === 'pending' ? 'bg-blue-1 text-blue-3' :
                            app.status === 'accepted' ? 'bg-green-1 text-green-3' :
                            app.status === 'rejected' ? 'bg-red-1 text-red-3' :
                            'bg-gray-1 text-gray-3'
                          }`}>
                            {app.status === 'pending' ? 'Pendiente' :
                             app.status === 'accepted' ? 'Aceptada' :
                             app.status === 'rejected' ? 'Rechazada' :
                             app.status}
                          </span>
                        </div>
                        <p className="text-gray-4 text-sm">
                          Aplicada: {new Date(app.applied_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2xl">
                    <div className="text-4xl mb-md">📋</div>
                    <p className="text-gray-4 mb-lg">Aún no has registrado postulaciones</p>
                    <p className="text-sm text-gray-3 mb-lg">Usa esta herramienta para hacer seguimiento de tus aplicaciones y entrevistas</p>
                    <button className="btn btn-primary">
                      Registrar Postulación →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ALL JOBS MODAL */}
        {showAllJobs && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-lg">
            <div className="bg-black-3 border border-gray-1 rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
              <div className="sticky top-0 bg-black-3 border-b border-gray-1 p-lg space-y-md">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Todos los Empleos Recomendados</h2>
                  <button
                    onClick={() => setShowAllJobs(false)}
                    className="text-gray-4 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>
                {jobMatches && jobMatches.length > 0 && (
                  <ExperienceFilter
                    selected={selectedJobsExperienceFilter}
                    onChange={setSelectedJobsExperienceFilter}
                  />
                )}
              </div>

              <div className="p-lg space-y-md">
                {jobMatches && jobMatches.length > 0 ? (
                  filterByExperience(jobMatches, selectedJobsExperienceFilter).map((match, idx) => (
                    <Link
                      key={idx}
                      to={`/jobs/${match.job_id}`}
                      state={{ match }}
                      className="block"
                    >
                      <div
                        className="flex items-center justify-between p-md bg-black rounded-lg border border-gray-1 hover:border-red transition-colors cursor-pointer"
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-white">{match.job?.company || 'Empresa'}</div>
                          <div className="text-sm text-gray-4">{match.job?.title || 'Posición'}</div>
                          <div className="text-xs text-gray-3 mt-xs">{match.match_reason || 'Match encontrado'}</div>
                        </div>
                        <div className="text-center min-w-24">
                          <div className="text-lg font-bold text-red">{Math.round(match.match_score)}%</div>
                          <div className="text-xs text-gray-3">compatibilidad</div>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-lg text-gray-4">
                    No hay empleos disponibles. Carga tu CV para ver recomendaciones.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CHAT PANEL */}
      {showChatPanel && (
        <div className="fixed right-0 top-0 h-full w-[600px] bg-black-2 border-l border-gray-1 flex flex-col shadow-lg z-50 animate-fade-in">
          {/* Header */}
          <div className="border-b border-gray-1 p-md bg-black-3">
            <div className="flex items-center justify-between mb-md">
              <div>
                <h3 className="font-bold text-white">Coach IA</h3>
                <p className="text-xs text-gray-3 mt-xs">Tu asistente de carrera</p>
              </div>
              <button
                onClick={() => setShowChatPanel(false)}
                className="text-gray-4 hover:text-white text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Usage Stats */}
            {stats && (
              <div className="grid grid-cols-3 gap-xs text-xs p-xs bg-black rounded-lg">
                <div className="text-center">
                  <div className="text-gray-4">Chats</div>
                  <div className="text-white font-bold">{stats.total_chats}</div>
                </div>
                <div className="text-center border-l border-r border-gray-1">
                  <div className="text-gray-4">Tokens</div>
                  <div className="text-white font-bold">{(stats.total_tokens || 0).toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-4">Costo</div>
                  <div className="text-white font-bold">${(stats.total_cost || 0).toFixed(2)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-lg space-y-lg">
            {chatMessages.length === 0 ? (
              <div className="text-center py-2xl text-gray-4">
                <div className="text-4xl mb-md">💬</div>
                <p className="text-base">Hola, soy tu Coach IA. ¿En qué puedo ayudarte?</p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-md rounded-lg p-lg text-base whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? 'bg-red text-white'
                        : 'bg-black-3 text-gray-3 border border-gray-1'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-black-3 text-gray-3 border border-gray-1 rounded-lg p-lg">
                  <span className="animate-pulse text-lg">●●●</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-1 p-md bg-black-3">
            {selectedFile && (
              <div className="mb-sm text-xs text-gray-3 bg-black rounded px-sm py-xs flex items-center justify-between">
                <span>📎 {selectedFile.name}</span>
                <button
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="text-gray-4 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex gap-md">
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setSelectedFile(file)
                }}
                accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png,.gif"
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={chatLoading}
                className="btn btn-secondary px-md py-md text-sm disabled:opacity-50"
                title="Adjuntar archivo"
              >
                📎
              </button>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Escribe tu pregunta..."
                disabled={chatLoading}
                className="flex-1 input-base text-sm bg-black border border-gray-1 text-white placeholder-gray-4"
              />
              <button
                onClick={sendMessage}
                disabled={chatLoading || (!chatInput.trim() && !selectedFile)}
                className="btn btn-primary px-md py-md text-sm disabled:opacity-50"
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop para cerrar panel */}
      {showChatPanel && (
        <div
          onClick={() => setShowChatPanel(false)}
          className="fixed inset-0 bg-black/0 z-40"
        />
      )}
    </div>
  )
}
