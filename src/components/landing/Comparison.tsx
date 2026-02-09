import { MinusCircle, ShieldCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function Comparison() {
  return (
    <section className="py-20 bg-[#f6f8f6]">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="font-manrope font-bold text-3xl md:text-4xl text-slate-900 mb-4">
            Por que escolher o Ripple?
          </h2>
          <p className="font-noto text-slate-600 max-w-2xl mx-auto">
            Deixe para trás os métodos manuais e arriscados. Mude para a
            automação inteligente.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Manual Card */}
          <Card className="border-none shadow-lg bg-white overflow-hidden group hover:shadow-xl transition-all">
            <CardContent className="p-8 md:p-10">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-6">
                <MinusCircle className="w-6 h-6 text-slate-500" />
              </div>
              <h3 className="font-manrope font-bold text-xl text-slate-900 mb-3">
                Fim das tarefas manuais
              </h3>
              <p className="font-noto text-slate-600 leading-relaxed">
                Enviar mensagens uma a uma não é escalável. Você perde horas
                copiando e colando, sujeito a erros humanos e baixa
                produtividade, sem garantir resultados.
              </p>
            </CardContent>
          </Card>

          {/* Ripple Card */}
          <Card className="border-2 border-[#13ec5b] shadow-xl bg-white overflow-hidden relative group transform md:-translate-y-4">
            <div className="absolute top-0 right-0 bg-[#13ec5b] text-[#102216] text-xs font-bold px-3 py-1 rounded-bl-lg">
              RECOMENDADO
            </div>
            <CardContent className="p-8 md:p-10">
              <div className="w-12 h-12 bg-[#13ec5b]/20 rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-[#0da540]" />
              </div>
              <h3 className="font-manrope font-bold text-xl text-slate-900 mb-3">
                Blindagem Anti-Bloqueio
              </h3>
              <p className="font-noto text-slate-600 leading-relaxed">
                Nossa tecnologia exclusiva simula o comportamento humano com
                pausas inteligentes, protegendo seu número enquanto você escala
                suas vendas com total segurança.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
