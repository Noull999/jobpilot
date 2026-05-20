import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para agregar token a cada request
api.interceptors.request.use((config) => {
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
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
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
  history: (limit = 20) => api.get(`/chat/history?limit=${limit}`),
  usage: () => api.get('/chat/usage'),
}

// User endpoints
export const userAPI = {
  profile: () => api.get('/user/profile'),
  update: (data) => api.put('/user/profile', data),
  stats: () => api.get('/user/stats'),
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
  delete: (cvId) => api.delete(`/cv/${cvId}`),
}

// Jobs endpoints
export const jobsAPI = {
  matches: (limit = 10) => api.get(`/jobs/matches?limit=${limit}`),
  get: (jobId) => api.get(`/jobs/${jobId}`),
  search: (query, limit = 20) => api.get(`/jobs/search?q=${query}&limit=${limit}`),
}

// Health check
export const healthCheck = () => api.get('/health')

export default api
