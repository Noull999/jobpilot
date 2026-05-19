import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const isLoggedIn = localStorage.getItem('access_token')

  const navLinks = [
    { path: '/chat', label: 'Chat con Coach' },
    { path: '/pricing', label: 'Planes' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <header className="bg-black-2 border-b border-gray-1 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-base py-base flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="font-semibold text-2xl text-white">
          Job<span className="text-accent">Pilot</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-md">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm font-medium transition-colors ${
                isActive(link.path)
                  ? 'text-accent'
                  : 'text-gray-4 hover:text-accent'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center gap-base">
          {isLoggedIn ? (
            <Link
              to="/dashboard"
              className="btn btn-primary text-sm"
            >
              Mi Panel
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-gray-4 hover:text-accent transition-colors"
              >
                Entrar
              </Link>
              <Link
                to="/signup"
                className="btn btn-primary text-sm"
              >
                Crear Cuenta
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-base text-charcoal hover:text-accent"
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={
                mobileMenuOpen
                  ? 'M6 18L18 6M6 6l12 12'
                  : 'M4 6h16M4 12h16M4 18h16'
              }
            />
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-black-2 border-t border-gray-1 animate-slide-up">
          <nav className="flex flex-col gap-base p-base">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-sm font-medium py-base transition-colors ${
                  isActive(link.path)
                    ? 'text-accent'
                    : 'text-gray-4 hover:text-accent'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-gray-1 pt-base flex flex-col gap-base">
              {isLoggedIn ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-primary text-center text-sm"
                >
                  Mi Panel
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-medium text-gray-4 hover:text-accent transition-colors text-center py-base"
                  >
                    Entrar
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn btn-primary text-center text-sm"
                  >
                    Crear Cuenta
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
