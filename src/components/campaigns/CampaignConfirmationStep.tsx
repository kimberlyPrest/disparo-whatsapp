import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, CheckCircle2, List, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ScheduleConfig, ScheduledMessage } from '@/lib/campaign-utils'
import { Contact } from '@/services/contacts'

interface CampaignConfirmationStepProps {
  schedule: ScheduledMessage[]
  contacts: (Contact | undefined)[]
  config: ScheduleConfig
  onBack: () => void
  onConfirm: () => void
  isLoading: boolean
}

export function CampaignConfirmationStep({
  schedule,
  contacts,
  config,
  onBack,
  onConfirm,
  isLoading,
}: CampaignConfirmationStepProps) {
  const endTime =
    schedule.length > 0 ? schedule[schedule.length - 1].sendTime : new Date()

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle>Confirmar Disparo da Campanha</DialogTitle>
        <DialogDescription>
          Revise os detalhes e a fila de mensagens antes de iniciar.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-muted/30 p-4 rounded-lg border space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Previsão de Término</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {format(endTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>

        <div className="bg-muted/30 p-4 rounded-lg border space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Total de Mensagens</span>
          </div>
          <p className="text-lg font-bold text-foreground">{schedule.length}</p>
        </div>

        <div className="col-span-1 md:col-span-2 bg-muted/30 p-4 rounded-lg border space-y-1">
          <span className="text-sm font-medium text-muted-foreground block mb-2">
            Resumo da Configuração
          </span>
          <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">Intervalo: </span>
              <span className="font-medium">
                {config.minInterval}s - {config.maxInterval}s
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Pausas (Lote): </span>
              <span className="font-medium">
                {config.useBatching
                  ? `${config.batchSize} msgs / ${config.batchPauseMin}-${config.batchPauseMax}s`
                  : 'Desativado'}
              </span>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <span className="text-muted-foreground">Horário Comercial: </span>
              <span
                className={`font-medium ${config.businessHoursStrategy === 'ignore' ? 'text-amber-600' : 'text-green-600'}`}
              >
                {config.businessHoursStrategy === 'ignore'
                  ? 'Sim (Enviar fora do horário)'
                  : 'Não (Pausar e retomar)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full border rounded-lg">
        <AccordionItem value="queue" className="border-none">
          <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <List className="h-4 w-4" />
              <span>Ver fila de mensagens</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ScrollArea className="h-[200px] w-full p-4 pt-0">
              <div className="space-y-2">
                {schedule.map((item, idx) => {
                  const contact = contacts[item.contactIndex] || {
                    name: 'Desconhecido',
                    phone: '?',
                    id: '?',
                    created_at: '',
                    message: '',
                    user_id: '',
                    status: '',
                  }
                  return (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-sm py-2 border-b last:border-0"
                    >
                      <span
                        className="font-medium truncate max-w-[150px] sm:max-w-[200px]"
                        title={contact.name}
                      >
                        {contact.name}
                      </span>
                      <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {format(item.sendTime, 'dd/MM/yyyy HH:mm:ss')}
                      </span>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button onClick={onConfirm} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirmar Disparo
        </Button>
      </DialogFooter>
    </div>
  )
}
