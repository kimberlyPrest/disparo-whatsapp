import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export function CTA() {
  return (
    <section className="py-24 bg-[#102216] relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#13ec5b]/10 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#0da540]/10 rounded-full blur-3xl translate-y-1/2" />

      <div className="container mx-auto px-4 max-w-7xl relative z-10 text-center">
        <h2 className="font-manrope font-extrabold text-3xl md:text-5xl text-white mb-6">
          Pronto para profissionalizar seus
          <br />
          disparos?
        </h2>
        <p className="font-noto text-slate-300 mb-10 max-w-xl mx-auto">
          Junte-se a milhares de empresas que usam o Ripple para vender mais no
          WhatsApp com segurança.
        </p>

        <div className="flex flex-col items-center gap-4">
          <Button
            asChild
            size="lg"
            className="bg-[#13ec5b] hover:bg-[#0da540] text-slate-900 font-bold h-14 px-10 rounded-lg text-lg shadow-[0_0_20px_rgba(19,236,91,0.3)] hover:shadow-[0_0_30px_rgba(19,236,91,0.5)] transition-all duration-300"
          >
            <Link to="/signup">Começar Agora - Grátis</Link>
          </Button>
          <p className="text-slate-500 text-xs">
            Sem cartão de crédito necessário • 14 dias de teste grátis
          </p>
        </div>
      </div>
    </section>
  )
}
