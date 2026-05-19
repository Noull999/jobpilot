import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('access_token'))
  }, [])

  return (
    <div className="bg-black relative z-10">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-base py-4xl md:py-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3xl items-center">
          {/* Hero Content */}
          <div className="animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-md leading-tight">
              Tu Coach IA para{' '}
              <span className="text-accent">conseguir empleo</span>
            </h1>
            <p className="text-lg text-gray-4 mb-2xl leading-relaxed">
              JobPilot te acompaña en cada paso de tu búsqueda de empleo. Desde perfeccionar tu CV hasta prepararte para entrevistas, nuestro coach IA está aquí para ayudarte.
            </p>
            <div className="flex flex-col sm:flex-row gap-md">
              {isLoggedIn ? (
                <Link
                  to="/chat"
                  className="btn btn-primary text-lg px-2xl py-md"
                >
                  Ir al Chat
                </Link>
              ) : (
                <>
                  <Link
                    to="/signup"
                    className="btn btn-primary text-lg px-2xl py-md"
                  >
                    Comenzar Gratis
                  </Link>
                  <Link
                    to="/login"
                    className="btn btn-secondary text-lg px-2xl py-md"
                  >
                    Entrar
                  </Link>
                </>
              )}
            </div>
            <p className="text-sm text-gray-3 mt-md">
              ✓ Sin tarjeta de crédito requerida • ✓ Acceso inmediato
            </p>
          </div>

          {/* Hero Visual */}
          <div className="relative h-96 md:h-full min-h-96 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-black to-black-3 rounded-lg opacity-80 blur-2xl"></div>
            <div className="relative bg-black-3 rounded-lg border border-gray-1 p-2xl w-full max-w-sm animate-slide-up shadow-lg">
              <div className="space-y-md">
                <div className="flex gap-md items-start">
                  <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent flex items-center justify-center flex-shrink-0">
                    <span className="text-accent font-bold">AI</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      Análisis de tu perfil
                    </p>
                    <p className="text-xs text-gray-3 mt-xs">
                      Identificamos tus fortalezas
                    </p>
                  </div>
                </div>
                <div className="flex gap-md items-start">
                  <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent flex items-center justify-center flex-shrink-0">
                    <span className="text-accent font-bold">📝</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      Mejora tu CV
                    </p>
                    <p className="text-xs text-gray-3 mt-xs">
                      Optimizado para ATS y seleccionadores
                    </p>
                  </div>
                </div>
                <div className="flex gap-md items-start">
                  <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent flex items-center justify-center flex-shrink-0">
                    <span className="text-accent font-bold">💼</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      Prepara entrevistas
                    </p>
                    <p className="text-xs text-gray-3 mt-xs">
                      Simulaciones y retroalimentación
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-black-3 border-y border-gray-1 py-4xl">
        <div className="max-w-7xl mx-auto px-base">
          <div className="text-center mb-3xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-md">
              Todo lo que necesitas
            </h2>
            <p className="text-lg text-gray-4 max-w-2xl mx-auto">
              Herramientas poderosas para acelerar tu búsqueda de empleo
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2xl">
            {[
              {
                title: 'Chat con Coach IA',
                desc: 'Conversaciones ilimitadas con tu coach IA disponible 24/7',
                icon: '💬',
              },
              {
                title: 'Historial y Contexto',
                desc: 'Tu coach recuerda tus conversaciones previas para consejos personalizados',
                icon: '📚',
              },
              {
                title: 'Análisis en Tiempo Real',
                desc: 'Retroalimentación instantánea sobre tus respuestas y mejoras',
                icon: '⚡',
              },
              {
                title: 'Planes Flexibles',
                desc: 'Elige el plan que se ajuste a tus necesidades y presupuesto',
                icon: '💎',
              },
              {
                title: 'Preparación de Entrevistas',
                desc: 'Simulaciones de entrevistas con preguntas realistas de tu industria',
                icon: '🎯',
              },
              {
                title: 'Comunidad de Usuarios',
                desc: 'Conecta con otros job seekers y comparte experiencias',
                icon: '👥',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-black-3 rounded-lg p-2xl border border-gray-1 hover:border-accent hover:shadow-lg hover:shadow-accent/20 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="text-4xl mb-md">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-base">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-4 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="max-w-7xl mx-auto px-base py-4xl">
        <div className="text-center mb-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-md">
            Planes que se ajustan a ti
          </h2>
          <p className="text-lg text-gray-4 max-w-2xl mx-auto">
            Elige el plan perfecto para tu búsqueda de empleo
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2xl max-w-4xl mx-auto">
          {[
            {
              name: 'Básico',
              price: 'Gratis',
              features: ['10 mensajes diarios', 'Chat básico', 'Historial de 7 días'],
              cta: 'Comenzar',
              highlight: false,
            },
            {
              name: 'Pro',
              price: '$9.99',
              period: '/mes',
              features: [
                'Mensajes ilimitados',
                'Análisis de CV',
                'Simulaciones de entrevistas',
                'Historial completo',
                'Soporte prioritario',
              ],
              cta: 'Probar Gratis',
              highlight: true,
            },
            {
              name: 'Premium',
              price: '$24.99',
              period: '/mes',
              features: [
                'Todo en Pro',
                'Coacheo personalizado',
                'Preparación ejecutiva',
                'Sesiones 1-on-1 con expertos',
                'Garantía de empleo*',
              ],
              cta: 'Contactar Ventas',
              highlight: false,
            },
          ].map((plan, idx) => (
            <div
              key={idx}
              className={`rounded-lg p-2xl border transition-all duration-300 ${
                plan.highlight
                  ? 'border-accent bg-black-3 shadow-lg shadow-accent/30 scale-105'
                  : 'border-gray-1 bg-black-3'
              }`}
            >
              {plan.highlight && (
                <div className="mb-md">
                  <span className="inline-block bg-accent text-white text-xs font-semibold px-md py-xs rounded-full">
                    MÁS POPULAR
                  </span>
                </div>
              )}
              <h3 className="text-xl font-bold text-white mb-base">{plan.name}</h3>
              <div className="mb-md">
                <span className="text-4xl font-bold text-accent">{plan.price}</span>
                {plan.period && (
                  <span className="text-gray-4 text-sm ml-xs">{plan.period}</span>
                )}
              </div>
              <ul className="space-y-base mb-2xl text-sm text-gray-4">
                {plan.features.map((feature, fidx) => (
                  <li key={fidx} className="flex items-start gap-base">
                    <span className="text-accent font-bold">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-md rounded-md font-semibold transition-colors ${
                  plan.highlight
                    ? 'btn btn-primary'
                    : 'btn btn-secondary'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-black-2 border-t border-gray-1 py-4xl">
        <div className="max-w-3xl mx-auto px-base text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-md">
            ¿Listo para conseguir tu próximo empleo?
          </h2>
          <p className="text-lg text-gray-4 mb-2xl">
            Únete a miles de job seekers que ya están usando JobPilot
          </p>
          {!isLoggedIn && (
            <div className="flex flex-col sm:flex-row gap-md justify-center">
              <Link
                to="/signup"
                className="btn btn-primary text-lg px-2xl py-md"
              >
                Crear Cuenta Gratis
              </Link>
              <Link
                to="/pricing"
                className="btn btn-secondary text-lg px-2xl py-md"
              >
                Ver Planes
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
