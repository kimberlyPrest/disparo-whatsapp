import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-900 text-white font-bold text-sm font-manrope">
              R
            </div>
            <span className="font-manrope font-bold text-lg text-slate-900">
              Ripple
            </span>
          </Link>

          <p className="font-noto text-sm text-slate-400">
            &copy; {new Date().getFullYear()} Ripple. Todos os direitos
            reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
