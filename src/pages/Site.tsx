import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Site() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center">
      <div className="container mx-auto px-4 py-12 md:py-20 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Text Content */}
          <div className="flex flex-col gap-6 max-w-2xl mx-auto lg:mx-0 text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground animate-fade-in-up">
              Disparo de <span className="text-primary">WhatsApp</span>{' '}
              Simplificado
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed animate-fade-in-up delay-100">
              Envie mensagens personalizadas para múltiplos contatos
              simultaneamente. Carregue sua planilha e comece sua campanha em
              minutos.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-4 animate-fade-in-up delay-200">
              <Button
                asChild
                size="lg"
                className="text-lg px-8 h-12 shadow-lg hover:shadow-primary/20 transition-all duration-300 hover:scale-105"
              >
                <Link to="/login">
                  Começar
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm font-medium text-muted-foreground animate-fade-in-up delay-300">
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <CheckCircle2 className="text-primary h-5 w-5" />
                <span>Rápido e Seguro</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <CheckCircle2 className="text-primary h-5 w-5" />
                <span>Suporte CSV e Excel</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <CheckCircle2 className="text-primary h-5 w-5" />
                <span>Alta Conversão</span>
              </div>
            </div>
          </div>

          {/* Visual Element */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-full lg:h-auto flex justify-center animate-fade-in-up delay-300">
            <div className="relative animate-float">
              {/* Background Blob */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/10 rounded-full blur-3xl -z-10" />

              {/* Mockup Image */}
              <img
                src="https://img.usecurling.com/p/600/600?q=smartphone%20chat%20messages%20app&color=green&dpr=2"
                alt="WhatsApp Messaging Mockup"
                className="relative z-10 w-full h-auto drop-shadow-2xl rounded-3xl transform rotate-3 transition-transform hover:rotate-0 duration-500"
              />

              {/* Floating Element 1 */}
              <div className="absolute -top-6 -right-6 bg-white p-4 rounded-xl shadow-xl z-20 animate-bounce [animation-duration:3000ms]">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <CheckCircle2 className="text-primary h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Enviado</p>
                    <p className="text-xs text-muted-foreground">
                      1,234 mensagens
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
