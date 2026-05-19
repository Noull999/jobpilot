import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { authAPI } from '../services/api'

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await authAPI.login(formData)
      localStorage.setItem('access_token', response.data.access_token)
      toast.success('Bienvenido de vuelta!')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-header)] bg-black flex items-center justify-center px-base py-4xl">
      <div className="w-full max-w-md">
        <div className="bg-black-3 rounded-lg shadow-lg border border-gray-1 p-2xl">
          <h1 className="text-2xl font-bold text-center text-white mb-base">
            Entrar a JobPilot
          </h1>
          <p className="text-center text-gray-4 text-sm mb-2xl">
            ¿No tienes cuenta? {' '}
            <Link to="/signup" className="text-accent hover:text-accent-light font-medium">
              Crear una
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-md">
            <div>
              <label className="block text-sm font-medium text-white mb-xs">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-base w-full"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-xs">
                Contraseña
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input-base w-full"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? 'Cargando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-2xl text-center">
            <a href="#" className="text-sm text-accent hover:text-accent-dark">
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
