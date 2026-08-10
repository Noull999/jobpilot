import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // Enviar cookies automáticamente
})

// Interceptor para agregar token a cada request (fallback para compatibilidad)
api.interceptors.request.use((config) => {
  // Las cookies se envían automáticamente con withCredentials: true
  // Este código es un fallback si el token está en localStorage (backward compat)
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const data = error.response?.data

    if (status === 401) {
      // Limpiar localStorage (backward compat)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      // Las cookies se limpian automáticamente por el servidor
      window.location.href = '/login'
    } else if (status === 403) {
      console.error('Acceso denegado:', data?.error || 'No tienes permiso')
    } else if (status === 429) {
      console.error('Rate limit alcanzado. Intenta más tarde')
    } else if (status >= 500) {
      console.error('Error del servidor:', data?.error || 'Error interno')
    } else if (status >= 400) {
      console.error('Error de solicitud:', data?.error || 'Solicitud inválida')
    }

    return Promise.reject(error)
  }
)

// Auth endpoints
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  refresh: () => api.get('/auth/refresh'),
}

// Chat endpoints
export const chatAPI = {
  send: (message, currentPage = null) => {
    const payload = { message }
    if (currentPage) {
      payload.current_page = currentPage
    }
    return api.post('/chat/send', payload)
  },
  sendWithFile: (message, file, currentPage = null) => {
    const formData = new FormData()
    formData.append('message', message)
    if (file) {
      formData.append('file', file)
    }
    if (currentPage) {
      formData.append('current_page', currentPage)
    }
    return api.post('/chat/send', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  history: (limit = 20) => api.get(`/chat/history?limit=${limit}`),
  usage: () => api.get('/chat/usage'),
}

// User endpoints
export const userAPI = {
  profile: () => api.get('/user/profile'),
  update: (data) => api.put('/user/profile', data),
  stats: () => api.get('/user/stats'),
  usage: () => api.get('/user/stats'), // Alias for getting usage/cost info
}

// Subscription endpoints
export const subscriptionAPI = {
  status: () => api.get('/subscription/status'),
  upgrade: (tier) => api.post('/subscription/upgrade', { tier }),
  cancel: () => api.post('/subscription/cancel'),
}

// CV endpoints
export const cvAPI = {
  upload: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/cv/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  current: () => api.get('/cv/current'),
  update: (cvId, data) => api.put(`/cv/update/${cvId}`, data),
  delete: (cvId) => api.delete(`/cv/${cvId}`),
}

// Jobs endpoints
export const jobsAPI = {
  matches: (limit = 10) => api.get(`/jobs/matches?limit=${limit}`),
  get: (jobId) => api.get(`/jobs/${jobId}`),
  search: (query, limit = 20) => api.get(`/jobs/search?q=${query}&limit=${limit}`),
  apply: (jobId, coverLetter = '') => api.post(`/jobs/${jobId}/apply`, { cover_letter: coverLetter }),
  applications: () => api.get('/jobs/applications'),
}

// Health check
export const healthCheck = () => api.get('/health')

export default api
