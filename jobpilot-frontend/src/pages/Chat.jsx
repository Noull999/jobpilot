import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { chatAPI } from '../services/api'

export default function Chat() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      navigate('/login')
      return
    }

    loadHistory()
  }, [navigate])

  const loadHistory = async () => {
    try {
      const response = await chatAPI.history()
      setMessages(response.data.messages || [])
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('access_token')
        navigate('/login')
      } else {
        toast.error('Error al cargar el historial')
      }
    } finally {
      setLoadingHistory(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = input
    setInput('')
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
    ])
    setLoading(true)

    try {
      const response = await chatAPI.send(userMessage)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date().toISOString(),
        },
      ])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al enviar el mensaje')
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  if (loadingHistory) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-header)]">
        <p className="text-gray-4">Cargando chat...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-header)] bg-black-2">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-md md:p-2xl max-w-4xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <div className="text-6xl mb-md">💬</div>
              <h2 className="text-2xl font-bold text-ink mb-base">
                Bienvenido a tu Coach IA
              </h2>
              <p className="text-charcoal max-w-md">
                Comienza una conversación sobre tu búsqueda de empleo. Puedo ayudarte con tu CV, entrevistas, y más.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-md">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                } animate-fade-in`}
              >
                <div
                  className={
                    message.role === 'user'
                      ? 'chat-bubble-user'
                      : 'chat-bubble-coach'
                  }
                >
                  {message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="chat-bubble-coach">
                  <div className="flex gap-xs">
                    <div className="w-2 h-2 bg-charcoal rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-charcoal rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></div>
                    <div className="w-2 h-2 bg-charcoal rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSendMessage}
        className="border-t border-gray-1 bg-black-3 p-md md:p-2xl"
      >
        <div className="max-w-4xl mx-auto flex gap-base">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta..."
            className="input-base flex-1 bg-black-2 text-white border-gray-1"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn btn-primary px-2xl"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  )
}
