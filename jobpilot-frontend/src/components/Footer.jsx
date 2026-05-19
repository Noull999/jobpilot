import { Link } from 'react-router-dom'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-black-2 text-white border-t border-gray-1">
      <div className="max-w-7xl mx-auto px-base py-4xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2xl mb-3xl">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-semibold mb-md text-white">JobPilot</h3>
            <p className="text-sm text-gray-3">
              Tu coach IA para conseguir el empleo que mereces en Chile y Latinoamérica.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold mb-md text-white uppercase tracking-wide">
              Producto
            </h4>
            <ul className="space-y-base text-sm">
              <li>
                <Link to="/chat" className="text-gray-3 hover:text-accent transition-colors">
                  Chat con Coach
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-gray-3 hover:text-accent transition-colors">
                  Planes
                </Link>
              </li>
              <li>
                <Link to="/#features" className="text-gray-3 hover:text-accent transition-colors">
                  Características
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold mb-md text-white uppercase tracking-wide">
              Empresa
            </h4>
            <ul className="space-y-base text-sm">
              <li>
                <a href="#" className="text-gray-3 hover:text-accent transition-colors">
                  Sobre Nosotros
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-3 hover:text-accent transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-3 hover:text-accent transition-colors">
                  Contacto
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold mb-md text-white uppercase tracking-wide">
              Legal
            </h4>
            <ul className="space-y-base text-sm">
              <li>
                <a href="#" className="text-gray-3 hover:text-accent transition-colors">
                  Privacidad
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-3 hover:text-accent transition-colors">
                  Términos
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-3 hover:text-accent transition-colors">
                  Cookies
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-1 mb-2xl"></div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-md text-sm text-gray-3">
          <p>© {currentYear} JobPilot. Todos los derechos reservados.</p>
          <div className="flex gap-md">
            <a href="#" aria-label="Twitter" className="hover:text-accent transition-colors">
              Twitter
            </a>
            <a href="#" aria-label="LinkedIn" className="hover:text-accent transition-colors">
              LinkedIn
            </a>
            <a href="#" aria-label="Instagram" className="hover:text-accent transition-colors">
              Instagram
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
