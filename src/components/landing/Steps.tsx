import { TableProperties, Settings, Send } from 'lucide-react'

export function Steps() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16">
          <span className="text-[#13ec5b] font-bold text-sm tracking-widest uppercase mb-2 block">
            COMO FUNCIONA
          </span>
          <h2 className="font-manrope font-bold text-3xl md:text-4xl text-slate-900">
            Comece em 3 passos simples
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector Line (Desktop only) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-slate-100 -z-10" />

          {/* Step 1 */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center justify-center">
                <TableProperties className="w-10 h-10 text-slate-400" />
              </div>
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#13ec5b] text-white flex items-center justify-center font-bold border-4 border-white">
                1
              </div>
            </div>
            <h3 className="font-manrope font-bold text-lg text-slate-900 mb-2">
              Importe sua Lista
            </h3>
            <p className="font-noto text-sm text-slate-500 max-w-xs">
              Carregue sua planilha de contatos (.csv ou .xlsx) para preparar
              sua audiência.
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center justify-center">
                <Settings className="w-10 h-10 text-slate-400" />
              </div>
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold border-4 border-white">
                2
              </div>
            </div>
            <h3 className="font-manrope font-bold text-lg text-slate-900 mb-2">
              Configure o Disparo
            </h3>
            <p className="font-noto text-sm text-slate-500 max-w-xs">
              Defina as configurações de envio, intervalos e horários da
              campanha.
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center justify-center">
                <Send className="w-10 h-10 text-slate-400 ml-1" />
              </div>
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold border-4 border-white">
                3
              </div>
            </div>
            <h3 className="font-manrope font-bold text-lg text-slate-900 mb-2">
              Inicie o Disparo
            </h3>
            <p className="font-noto text-sm text-slate-500 max-w-xs">
              Acompanhe o envio em tempo real e veja os resultados chegando.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
