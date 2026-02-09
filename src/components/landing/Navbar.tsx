import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const Logo = () => (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded bg-[#13ec5b] text-white font-bold text-lg font-manrope">
        R
      </div>
      <span className="font-manrope font-bold text-xl text-slate-900">
        Ripple
      </span>
    </div>
  )

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/80 backdrop-blur-md border-b border-slate-100 py-3'
          : 'bg-transparent py-5',
      )}
    >
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between">
          <Logo />

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/login"
              className="font-noto font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Login
            </Link>
            <Button
              asChild
              className="bg-slate-900 hover:bg-slate-800 text-white font-manrope font-semibold rounded-lg px-6"
            >
              <Link to="/signup">Começar Grátis</Link>
            </Button>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden text-slate-900"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-100 p-4 shadow-lg animate-fade-in-down">
          <div className="flex flex-col gap-4">
            <Link
              to="/login"
              className="font-noto font-medium text-slate-600 py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Login
            </Link>
            <Button
              asChild
              className="bg-slate-900 hover:bg-slate-800 text-white w-full"
            >
              <Link to="/signup">Começar Grátis</Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  )
}
