import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { subscriptionAPI } from '../services/api'

export default function Pricing() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState({})
  const [currentPlan, setCurrentPlan] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      loadCurrentPlan()
    }
  }, [])

  const loadCurrentPlan = async () => {
    try {
      const response = await subscriptionAPI.status()
      setCurrentPlan(response.data.current_tier)
    } catch (error) {
      // Silently handle if user is not logged in
    }
  }

  const handleUpgrade = async (tier) => {
    if (!localStorage.getItem('access_token')) {
      navigate('/signup')
      return
    }

    setLoading((prev) => ({ ...prev, [tier]: true }))

    try {
      const response = await subscriptionAPI.upgrade(tier)
      // In a real app, this would redirect to Stripe or process the upgrade
      toast.success(`Upgrade a ${tier} iniciado`)
      loadCurrentPlan()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al procesar el upgrade')
    } finally {
      setLoading((prev) => ({ ...prev, [tier]: false }))
    }
  }

  const plans = [
    {
      tier: 'free',
      name: 'Básico',
      price: 'Gratis',
      period: '',
      description: 'Perfecto para empezar',
      features: [
        '10 mensajes diarios',
        'Chat básico con el coach',
        'Historial de 7 días',
        'Acceso a características básicas',
      ],
      cta: 'Crear Cuenta',
      highlight: false,
    },
    {
      tier: 'pro',
      name: 'Pro',
      price: '$9.99',
      period: '/mes',
      description: 'Para job seekers serios',
      features: [
        'Mensajes ilimitados',
        'Análisis detallado de CV',
        'Simulaciones de entrevistas',
        'Historial completo',
        'Soporte por email',
        'Actualizaciones de contenido',
      ],
      cta: 'Comenzar Pro',
      highlight: true,
    },
    {
      tier: 'premium',
      name: 'Premium',
      price: '$24.99',
      period: '/mes',
      description: 'Para resultados máximos',
      features: [
        'Todo en Pro',
        'Coaching personalizado 1-on-1',
        'Preparación ejecutiva',
        'Sesiones con expertos en industria',
        'Acceso prioritario a nuevas features',
        'Comunidad privada de premium',
        'Garantía de satisfacción 30 días',
      ],
      cta: 'Comenzar Premium',
      highlight: false,
    },
  ]

  return (
    <div className="min-h-[calc(100vh-header)] bg-black py-4xl px-base">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-md">
            Planes que se ajustan a ti
          </h1>
          <p className="text-lg text-gray-4 max-w-2xl mx-auto">
            Elige el plan perfecto para acelerar tu búsqueda de empleo
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-md mb-4xl">
          <span className="text-gray-4">Mensual</span>
          {/* Toggle would go here for annual pricing */}
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2xl max-w-5xl mx-auto mb-4xl">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className={`rounded-lg border transition-all duration-300 relative overflow-hidden ${
                plan.highlight
                  ? 'border-red bg-black-2 shadow-xl scale-105'
                  : 'border-gray-1 bg-black-3'
              }`}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-0 right-0 bg-red text-white py-base text-center text-xs font-bold uppercase">
                  Más Popular
                </div>
              )}

              <div className={`p-2xl ${plan.highlight ? 'pt-4xl' : ''}`}>
                <h2 className="text-2xl font-bold text-white mb-base">
                  {plan.name}
                </h2>
                <p className="text-sm text-gray-4 mb-2xl">
                  {plan.description}
                </p>

                {/* Pricing */}
                <div className="mb-2xl">
                  <div className="flex items-baseline gap-xs">
                    <span className="text-4xl font-bold text-red">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-gray-4 text-sm">
                        {plan.period}
                      </span>
                    )}
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleUpgrade(plan.tier)}
                  disabled={loading[plan.tier] || currentPlan === plan.tier}
                  className={`w-full py-md rounded-md font-semibold transition-colors mb-2xl ${
                    currentPlan === plan.tier
                      ? 'btn bg-gray-3 text-white cursor-default'
                      : plan.highlight
                        ? 'btn btn-primary'
                        : 'btn btn-secondary'
                  }`}
                >
                  {loading[plan.tier]
                    ? 'Procesando...'
                    : currentPlan === plan.tier
                      ? 'Plan Actual'
                      : plan.cta}
                </button>

                {/* Features List */}
                <ul className="space-y-base">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-base text-sm text-gray-4">
                      <span className="text-red flex-shrink-0 font-bold">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-2xl">
            Preguntas Frecuentes
          </h2>

          <div className="space-y-md">
            {[
              {
                q: '¿Puedo cambiar de plan en cualquier momento?',
                a: 'Sí, puedes cambiar o cancelar tu plan en cualquier momento desde tu panel de control.',
              },
              {
                q: '¿Hay período de prueba?',
                a: 'Nuestro plan Básico es gratuito para siempre. Los planes Pro y Premium ofrecen 7 días de prueba gratis.',
              },
              {
                q: '¿Qué métodos de pago aceptan?',
                a: 'Aceptamos tarjetas de crédito, débito y billeteras digitales a través de Stripe.',
              },
              {
                q: '¿Hay reembolsos?',
                a: 'Ofrecemos garantía de satisfacción de 30 días. Si no estás contento, te reembolsamos completamente.',
              },
            ].map((faq, idx) => (
              <details
                key={idx}
                className="group border border-gray-1 rounded-lg p-md cursor-pointer bg-black-3"
              >
                <summary className="flex items-center justify-between font-semibold text-white">
                  {faq.q}
                  <span className="text-red transition-transform group-open:rotate-180">
                    ▼
                  </span>
                </summary>
                <p className="text-gray-4 mt-md text-sm">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
