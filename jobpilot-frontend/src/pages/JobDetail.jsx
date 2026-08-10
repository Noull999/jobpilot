import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { jobsAPI, cvAPI } from '../services/api'

export default function JobDetail() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [job, setJob] = useState(null)
  const [match, setMatch] = useState(null)
  const [cv, setCv] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      navigate('/login')
      return
    }

    loadJobDetail()
  }, [jobId, navigate])

  const loadJobDetail = async () => {
    try {
      // Get match data from location state if available (passed from Dashboard)
      if (location.state?.match) {
        setMatch(location.state.match)
        setJob(location.state.match.job)
      } else {
        // Otherwise fetch job details
        const jobRes = await jobsAPI.get(jobId)
        setJob(jobRes.data?.job)
      }

      // Get CV data
      const cvRes = await cvAPI.current().catch(() => ({ data: { cv: null } }))
      setCv(cvRes.data?.cv)
    } catch (error) {
      toast.error('Error al cargar los detalles del empleo')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!cv) {
      toast.error('Por favor carga tu CV primero')
      return
    }

    setApplying(true)
    try {
      await jobsAPI.apply(jobId)
      toast.success('¡Solicitud enviada! El reclutador se pondrá en contacto.')
      setApplied(true)
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error('Ya has aplicado a este empleo')
        setApplied(true)
      } else {
        toast.error('Error al enviar solicitud')
      }
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-header)]">
        <p className="text-gray-4">Cargando...</p>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-header)]">
        <p className="text-gray-4 mb-md">Empleo no encontrado</p>
        <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
          Volver al Dashboard
        </button>
      </div>
    )
  }

  const matchScore = match?.match_score || job?.match_score || 0
  const skillsMatched = match?.skills_matched || []
  const skillsMissing = match?.skills_missing || []

  return (
    <div className="min-h-[calc(100vh-header)] bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-4 hover:text-white mb-4 text-sm"
        >
          ← Volver
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Job Details - Left Column */}
          <div className="lg:col-span-2">
            <div className="bg-black-3 border border-gray-1 rounded-lg p-6 mb-6">
              <h1 className="text-3xl font-bold mb-2">{job?.title}</h1>
              <p className="text-gray-4 mb-4">{job?.company}</p>

              {/* Match Score Badge */}
              {matchScore > 0 && (
                <div className="mb-6 p-4 rounded-lg bg-black border border-gray-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-4">Compatibilidad con tu CV:</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-gray-1 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${
                            matchScore >= 80
                              ? 'bg-green-500'
                              : matchScore >= 60
                              ? 'bg-yellow-500'
                              : 'bg-orange-500'
                          }`}
                          style={{ width: `${matchScore}%` }}
                        />
                      </div>
                      <span className="font-bold text-lg w-12 text-right">{matchScore}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Job Info */}
              <div className="space-y-4 mb-6">
                <div>
                  <h3 className="text-sm text-gray-4 mb-2">Descripción</h3>
                  <p className="text-white">{job?.description || 'No disponible'}</p>
                </div>

                {job?.requirements && job.requirements.length > 0 && (
                  <div>
                    <h3 className="text-sm text-gray-4 mb-2">Requisitos</h3>
                    <ul className="text-white space-y-1">
                      {job.requirements.map((req, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span>•</span> {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {skillsMatched && skillsMatched.length > 0 && (
                  <div>
                    <h3 className="text-sm text-gray-4 mb-2">Skills que Tienes</h3>
                    <div className="flex flex-wrap gap-2">
                      {skillsMatched.map((skill, idx) => (
                        <span
                          key={idx}
                          className="bg-green-900/30 border border-green-500/50 rounded-full px-3 py-1 text-xs text-green-400"
                        >
                          ✓ {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {skillsMissing && skillsMissing.length > 0 && (
                  <div>
                    <h3 className="text-sm text-gray-4 mb-2">Skills a Desarrollar</h3>
                    <div className="flex flex-wrap gap-2">
                      {skillsMissing.map((skill, idx) => (
                        <span
                          key={idx}
                          className="bg-orange-900/30 border border-orange-500/50 rounded-full px-3 py-1 text-xs text-orange-400"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {job?.location && (
                  <div>
                    <h3 className="text-sm text-gray-4 mb-2">Ubicación</h3>
                    <p className="text-white">{job.location}</p>
                  </div>
                )}

                {job?.salary_min && job?.salary_max && (
                  <div>
                    <h3 className="text-sm text-gray-4 mb-2">Salario</h3>
                    <p className="text-white">${(job.salary_min / 1000000).toFixed(1)}M - ${(job.salary_max / 1000000).toFixed(1)}M</p>
                  </div>
                )}

                {job?.job_type && (
                  <div>
                    <h3 className="text-sm text-gray-4 mb-2">Tipo de Contrato</h3>
                    <p className="text-white">{job.job_type}</p>
                  </div>
                )}
              </div>

              <button
                onClick={handleApply}
                disabled={applied || applying || !cv}
                className="w-full btn btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applied ? '✓ Solicitud Enviada' : applying ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
            </div>
          </div>

          {/* CV Preview - Right Column */}
          <div>
            {cv ? (
              <div className="bg-black-3 border border-gray-1 rounded-lg p-6 sticky top-8">
                <h3 className="text-lg font-bold mb-4">Tu CV</h3>

                {cv.skills && cv.skills.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm text-gray-4 mb-2">Skills ({cv.skills.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {cv.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="bg-black border border-gray-1 rounded-full px-3 py-1 text-xs text-white"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {cv.experience_years && (
                  <div className="mb-6">
                    <h4 className="text-sm text-gray-4 mb-2">Experiencia</h4>
                    <p className="text-white">{cv.experience_years} años</p>
                  </div>
                )}

                {cv.job_titles && cv.job_titles.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm text-gray-4 mb-2">Puestos Anteriores</h4>
                    <ul className="text-white space-y-1">
                      {cv.job_titles.map((title, idx) => (
                        <li key={idx} className="text-sm">
                          • {title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {cv.ats_score && (
                  <div className="p-3 rounded-lg bg-black border border-gray-1">
                    <div className="text-xs text-gray-4 mb-1">ATS Score</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-1 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full"
                          style={{ width: `${cv.ats_score}%` }}
                        />
                      </div>
                      <span className="font-bold text-sm">{cv.ats_score}%</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => window.open('/dashboard', '_blank')}
                  className="w-full mt-6 btn btn-secondary py-2 text-sm"
                >
                  Actualizar CV
                </button>
              </div>
            ) : (
              <div className="bg-black-3 border border-gray-1 rounded-lg p-6 text-center">
                <p className="text-gray-4 mb-4">No has cargado tu CV</p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn btn-primary w-full py-2"
                >
                  Cargar CV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
