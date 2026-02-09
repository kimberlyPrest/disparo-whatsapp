import { ShieldAlert, Store, AlertTriangle, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function Features() {
  const features = [
    {
      icon: ShieldAlert,
      title: 'Blindagem de Conta',
      description:
        'Intervalos humanizados e pausas periódicas automáticas para proteger seu número.',
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: Store,
      title: 'Horário Comercial',
      description:
        'O sistema pausa automaticamente fora do seu horário de atendimento definido.',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: AlertTriangle,
      title: 'Gestão de Erros',
      description:
        'Notificações instantâneas de mensagens falhadas para correção rápida na lista.',
      color: 'bg-amber-100 text-amber-600',
    },
    {
      icon: Calendar,
      title: 'Agendamento Estratégico',
      description:
        'Planeje suas campanhas com antecedência e deixe o Ripple trabalhar por você.',
      color: 'bg-purple-100 text-purple-600',
    },
  ]

  return (
    <section className="py-20 bg-[#f6f8f6]">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="font-manrope font-bold text-3xl md:text-4xl text-slate-900 mb-4">
            Recursos Poderosos
          </h2>
          <p className="font-noto text-slate-600 max-w-2xl mx-auto">
            Tudo o que você precisa para uma operação profissional.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="border-none shadow-sm hover:shadow-md transition-all duration-300"
            >
              <CardContent className="p-6">
                <div
                  className={`w-10 h-10 rounded-lg ${feature.color} flex items-center justify-center mb-4`}
                >
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="font-manrope font-bold text-base text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="font-noto text-xs text-slate-500 leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
