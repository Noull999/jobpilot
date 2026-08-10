import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export default function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const errorHandler = (event) => {
      setHasError(true)
      setError(event.error?.message || 'Ocurrió un error inesperado')
      toast.error(event.error?.message || 'Error')
    }

    window.addEventListener('error', errorHandler)
    return () => window.removeEventListener('error', errorHandler)
  }, [])

  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">¡Algo salió mal!</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setHasError(false)
              setError(null)
            }}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    )
  }

  return children
}
