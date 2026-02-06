import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScheduleConfig } from '@/lib/campaign-utils'
import { Settings2, Clock, Zap, Briefcase } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CampaignConfigProps {
  config: ScheduleConfig | null
  scheduledAt: string | null
}

export function CampaignConfig({ config, scheduledAt }: CampaignConfigProps) {
  if (!config) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings2 className="h-5 w-5" />
          Configuração do Disparo
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4" />
            <span>Intervalo</span>
          </div>
          <p className="font-medium">
            {config.minInterval} a {config.maxInterval} segundos
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Pausas (Lotes)</span>
          </div>
          <p className="font-medium">
            {config.useBatching
              ? `${config.batchSize} msgs / pausa de ${config.batchPauseMin}-${config.batchPauseMax}s`
              : 'Desativado'}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Briefcase className="h-4 w-4" />
            <span>Horário Comercial</span>
          </div>
          <p className="font-medium">
            {config.businessHoursStrategy === 'pause'
              ? `Respeitar (${config.businessHoursPauseTime || '18:00'} - ${config.businessHoursResumeTime || '08:00'})`
              : 'Ignorar (Envio contínuo)'}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Início Agendado</span>
          </div>
          <p className="font-medium">
            {scheduledAt
              ? format(new Date(scheduledAt), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })
              : 'Imediato'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
