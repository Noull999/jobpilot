import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { userAPI, chatAPI, cvAPI, jobsAPI } from '../services/api'

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

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      navigate('/login')
      return
    }

    const hasCompletedOnboarding = localStorage.getItem('onboarding-completed')
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true)
    }

    loadDashboard()
  }, [navigate])

  const loadDashboard = async () => {
    try {
      const [userRes, statsRes, cvRes, jobsRes] = await Promise.all([
        userAPI.profile(),
        userAPI.stats(),
        cvAPI.current().catch(() => ({ data: { cv: null } })),
        jobsAPI.matches(10).catch(() => ({ data: { matches: [] } }))
      ])
      setUser(userRes.data?.user)
      setStats(statsRes.data?.stats)
      setCv(cvRes.data?.cv)
      if (cvRes.data?.cv) setCvUploaded(true)
      setJobMatches(jobsRes.data?.matches || [])
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

  const completeOnboarding = () => {
    localStorage.setItem('onboarding-completed', 'true')
    setShowOnboarding(false)
    setOnboardingStep('welcome')
    toast.success('¡Bienvenido a JobPilot!')
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
    if (!chatInput.trim()) return

    const userMessage = { text: chatInput, sender: 'user' }
    setChatMessages([...chatMessages, userMessage])
    setChatInput('')
    setChatLoading(true)

    try {
      const res = await chatAPI.send(chatInput)
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
                <label className="block">
                  <div className="border-2 border-dashed border-gray-1 rounded-lg p-2xl cursor-pointer hover:border-red transition-colors">
                    <div className="text-4xl mb-md">⬆️</div>
                    <div className="text-sm font-semibold text-white mb-xs">Click para subir CV</div>
                    <div className="text-xs text-gray-4">PDF, DOC o DOCX • Máx 5MB</div>
                  </div>
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleCvUpload} />
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
                  <div className="flex items-start gap-lg">
                    <div className="w-16 h-16 rounded-lg bg-red flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                      {user?.name?.substring(0, 2).toUpperCase() || 'JA'}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-bold mb-xs">{user?.name}</div>
                      <div className="text-sm text-gray-4 mb-md">
                        {cv?.job_titles?.[0] || 'Profesional'} {cv?.experience_years ? `· ${cv.experience_years} años` : ''}
                      </div>
                      <div className="flex flex-wrap gap-xs">
                        {(cv?.skills || []).slice(0, 6).map((skill) => (
                          <span key={skill} className="px-md py-xs bg-red text-white text-xs rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="text-3xl font-bold text-red">{cv?.ats_score || 0}</div>
                      <div className="text-xs text-gray-3 text-center">Puntuación<br/>ATS</div>
                    </div>
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
                  <button className="btn btn-secondary text-sm">
                    Ver todos →
                  </button>
                </div>

                {jobMatches && jobMatches.length > 0 ? (
                  <div className="space-y-md">
                    {jobMatches.slice(0, 3).map((match, idx) => (
                      <div key={idx} className="flex items-center justify-between p-md bg-black rounded-lg border border-gray-1 hover:border-red transition-colors cursor-pointer">
                        <div>
                          <div className="font-semibold text-white">{match.job?.company}</div>
                          <div className="text-sm text-gray-4">{match.job?.title}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-red">{Math.round(match.match_score)}%</div>
                          <div className="text-xs text-gray-3">compatibilidad</div>
                        </div>
                      </div>
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
              <div className="bg-black-3 border border-gray-1 rounded-lg p-lg">
                <h2 className="text-xl font-bold text-white mb-lg">Análisis de tu CV</h2>
                <div className="grid grid-cols-2 gap-lg">
                  <div>
                    <h3 className="text-white font-bold mb-md">✓ Fortalezas</h3>
                    <ul className="space-y-md text-sm text-gray-4">
                      <li>→ Stack técnico completo</li>
                      <li>→ Experiencia en desarrollo e IT</li>
                      <li>→ Buena estructura profesional</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-red font-bold mb-md">⚠ Áreas de mejora</h3>
                    <ul className="space-y-md text-sm text-gray-4">
                      <li>→ Agregar portafolio de proyectos</li>
                      <li>→ Incluir LinkedIn en encabezado</li>
                      <li>→ Agregar certificaciones</li>
                    </ul>
                  </div>
                </div>
              </div>
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
              <button className="btn btn-primary mb-lg">⟳ Actualizar</button>
              {jobMatches && jobMatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                  {jobMatches.map((match, idx) => (
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
                        <a href={match.job?.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-sm">
                          Ver Oferta →
                        </a>
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
            <div className="max-w-4xl">
              <div className="bg-black-3 border border-gray-1 rounded-lg p-lg">
                <h2 className="text-xl font-bold text-white mb-lg">Generador de Carta de Presentación</h2>
                <div className="space-y-lg">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-md">Puesto Objetivo</label>
                    <input
                      type="text"
                      placeholder="Ej: Developer Full Stack"
                      className="w-full input-base bg-black border border-gray-1 text-white placeholder-gray-4 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-md">Empresa</label>
                    <input
                      type="text"
                      placeholder="Ej: Google, Mercado Libre"
                      className="w-full input-base bg-black border border-gray-1 text-white placeholder-gray-4 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-md">Tono Deseado</label>
                    <select className="w-full input-base bg-black border border-gray-1 text-white rounded">
                      <option value="formal">Formal y Profesional</option>
                      <option value="casual">Casual y Descontracturado</option>
                      <option value="energetic">Energético y Dinámico</option>
                    </select>
                  </div>
                  <button className="btn btn-primary w-full">
                    Generar Carta con Coach →
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeView === 'applications' && (
            <div className="max-w-4xl">
              <div className="bg-black-3 border border-gray-1 rounded-lg p-lg">
                <h2 className="text-xl font-bold text-white mb-lg">Seguimiento de Postulaciones</h2>
                <div className="text-center py-2xl">
                  <div className="text-4xl mb-md">📋</div>
                  <p className="text-gray-4 mb-lg">Aún no has registrado postulaciones</p>
                  <p className="text-sm text-gray-3 mb-lg">Usa esta herramienta para hacer seguimiento de tus aplicaciones y entrevistas</p>
                  <button className="btn btn-primary">
                    Registrar Postulación →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* CHAT PANEL */}
      {showChatPanel && (
        <div className="fixed right-0 top-0 h-full w-96 bg-black-2 border-l border-gray-1 flex flex-col shadow-lg z-50 animate-fade-in">
          {/* Header */}
          <div className="border-b border-gray-1 p-md flex items-center justify-between bg-black-3">
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

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-md space-y-md">
            {chatMessages.length === 0 ? (
              <div className="text-center py-2xl text-gray-4">
                <div className="text-3xl mb-md">💬</div>
                <p className="text-sm">Hola, soy tu Coach IA. ¿En qué puedo ayudarte?</p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs rounded-lg p-md text-sm ${
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
                <div className="bg-black-3 text-gray-3 border border-gray-1 rounded-lg p-md">
                  <span className="animate-pulse">●●●</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-1 p-md bg-black-3">
            <div className="flex gap-md">
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
                disabled={chatLoading || !chatInput.trim()}
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
