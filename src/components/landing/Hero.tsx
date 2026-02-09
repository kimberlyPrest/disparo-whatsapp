import { Button } from '@/components/ui/button'
import { PlayCircle, ArrowRight, MoreHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Hero() {
  return (
    <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-24 overflow-hidden">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#13ec5b]/10 text-[#0da540] font-bold text-xs uppercase tracking-wide mb-6 animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-[#13ec5b]"></span>
            Tecnologia Anti-Bloqueio 2.0
          </div>

          {/* Headline */}
          <h1 className="font-manrope font-extrabold text-4xl md:text-5xl lg:text-6xl text-slate-900 leading-tight mb-6 animate-fade-in-up delay-100">
            Transforme suas listas em{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0da540] to-[#13ec5b]">
              resultados reais
            </span>{' '}
            no WhatsApp
          </h1>

          {/* Subheadline */}
          <p className="font-noto text-lg md:text-xl text-slate-600 mb-8 max-w-2xl leading-relaxed animate-fade-in-up delay-200">
            A plataforma mais segura para envios em massa. Automatize sua
            comunicação com humanização real e proteja seu número contra
            bloqueios.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in-up delay-300">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-[#13ec5b] hover:bg-[#0da540] text-slate-900 font-bold h-12 px-8 rounded-lg shadow-xl shadow-[#13ec5b]/20 transition-transform hover:-translate-y-1"
            >
              <Link to="/signup">
                Começar Agora - Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-12 px-8 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
            >
              <a href="#">
                <PlayCircle className="mr-2 h-5 w-5 text-[#13ec5b]" />
                Ver Demo
              </a>
            </Button>
          </div>
        </div>

        {/* Browser Mockup */}
        <div className="relative mx-auto max-w-5xl animate-fade-in-up delay-500">
          <div className="rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            {/* Browser Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white border border-slate-200 rounded-md h-6 w-full max-w-md mx-auto opacity-50" />
              </div>
            </div>

            {/* Browser Content (Dashboard Mockup) */}
            <div className="flex h-[400px] md:h-[500px] bg-[#f8fafc]">
              {/* Sidebar */}
              <div className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col p-4 gap-4">
                <div className="h-8 w-32 bg-slate-100 rounded mb-4" />
                <div className="space-y-2">
                  <div className="h-10 w-full bg-[#13ec5b]/10 rounded border-l-4 border-[#13ec5b]" />
                  <div className="h-10 w-full bg-slate-50 rounded" />
                  <div className="h-10 w-full bg-slate-50 rounded" />
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 p-6 overflow-hidden">
                <div className="flex justify-between items-center mb-8">
                  <div className="h-8 w-48 bg-slate-200 rounded" />
                  <div className="h-10 w-32 bg-[#13ec5b] rounded" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-white p-4 rounded-lg shadow-sm border border-slate-100"
                    >
                      <div className="h-10 w-10 rounded-full bg-slate-100 mb-3" />
                      <div className="h-4 w-20 bg-slate-100 rounded mb-2" />
                      <div className="h-6 w-12 bg-slate-200 rounded" />
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-slate-100 h-64 p-4">
                  <div className="flex gap-4 mb-4">
                    <div className="h-8 w-24 bg-slate-100 rounded" />
                    <div className="h-8 w-24 bg-slate-100 rounded" />
                  </div>
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-12 w-full bg-slate-50 rounded flex items-center px-4 justify-between"
                      >
                        <div className="flex gap-3">
                          <div className="h-4 w-4 bg-slate-200 rounded" />
                          <div className="h-4 w-32 bg-slate-200 rounded" />
                        </div>
                        <div className="h-4 w-16 bg-[#13ec5b]/20 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
