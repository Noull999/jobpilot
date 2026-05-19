import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { authAPI } from '../services/api'

export default function Signup() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    try {
      const { confirmPassword, ...dataToSend } = formData
      const response = await authAPI.signup(dataToSend)
      localStorage.setItem('access_token', response.data.access_token)
      toast.success('¡Cuenta creada exitosamente!')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-header)] bg-black flex items-center justify-center px-base py-4xl">
      <div className="w-full max-w-md">
        <div className="bg-black-3 rounded-lg shadow-lg border border-gray-1 p-2xl">
          <h1 className="text-2xl font-bold text-center text-white mb-base">
            Crear Cuenta
          </h1>
          <p className="text-center text-gray-4 text-sm mb-2xl">
            ¿Ya tienes cuenta? {' '}
            <Link to="/login" className="text-accent hover:text-accent-light font-medium">
              Entra aquí
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-md">
            <div>
              <label className="block text-sm font-medium text-white mb-xs">
                Nombre
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-base w-full"
                placeholder="Tu nombre"
                required
              />
            </div>

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
                minLength="8"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-xs">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
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
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
          </form>

          <p className="text-xs text-ash text-center mt-md">
            Al crear una cuenta, aceptas nuestros {' '}
            <a href="#" className="text-accent hover:text-accent-dark">
              Términos de Servicio
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
