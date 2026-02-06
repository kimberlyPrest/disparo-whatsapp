import { Outlet, Link, useLocation } from 'react-router-dom'
import { MessageCircle, LayoutDashboard, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'

export default function Layout() {
  const location = useLocation()
  const { user } = useAuth()

  const isActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + '/')
    )
  }

  return (
    <div className="flex flex-col min-h-screen font-sans bg-background">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-border/40 bg-white/70 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
          <Link
            to={user ? '/dashboard' : '/'}
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <div className="bg-primary/10 p-2 rounded-full">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">
              WhatsApp Sender
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            {!user ? (
              <>
                <Link
                  to="/site"
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors hidden sm:block"
                >
                  Home
                </Link>
                <span className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-not-allowed opacity-50 hidden sm:block">
                  Como funciona
                </span>
              </>
            ) : (
              <>
                <Link
                  to="/dashboard"
                  className={cn(
                    'text-sm font-medium transition-colors flex items-center gap-2',
                    isActive('/dashboard')
                      ? 'text-primary font-bold'
                      : 'text-muted-foreground hover:text-primary',
                  )}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <Link
                  to="/disparos"
                  className={cn(
                    'text-sm font-medium transition-colors flex items-center gap-2',
                    isActive('/disparos')
                      ? 'text-primary font-bold'
                      : 'text-muted-foreground hover:text-primary',
                  )}
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Disparos</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-16">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>
              &copy; {new Date().getFullYear()} Disparo WhatsApp. Todos os
              direitos reservados.
            </p>
            <p className="text-center md:text-right">
              Ferramenta simples para envio de mensagens em massa.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
