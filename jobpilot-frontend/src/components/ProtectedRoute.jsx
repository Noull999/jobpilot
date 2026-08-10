import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../services/api'

export default function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verify authentication by calling a protected endpoint
        await api.get('/health')
        setIsAuthenticated(true)
      } catch (error) {
        if (error.response?.status === 401) {
          setIsAuthenticated(false)
        } else {
          // On other errors, allow access but log warning
          console.warn('Auth check failed:', error)
          setIsAuthenticated(true)
        }
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}
