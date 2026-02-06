import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Send, Clock, AlertTriangle, Timer } from 'lucide-react'

interface CampaignKPIsProps {
  stats: {
    sent: number
    waiting: number
    failed: number
    elapsed: number
  }
  isLoading?: boolean
}

export function CampaignKPIs({ stats, isLoading = false }: CampaignKPIsProps) {
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remSeconds = Math.round(seconds % 60)
    if (minutes > 60) {
      const hours = Math.floor(minutes / 60)
      const remMin = minutes % 60
      return `${hours}h ${remMin}m`
    }
    return `${minutes}m ${remSeconds}s`
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Enviados</CardTitle>
          <Send className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.sent}</div>
          <p className="text-xs text-muted-foreground">Mensagens entregues</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Aguardando</CardTitle>
          <Clock className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.waiting}</div>
          <p className="text-xs text-muted-foreground">Na fila de envio</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Falhas</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          <p className="text-xs text-muted-foreground">Erros de envio</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tempo Decorrido</CardTitle>
          <Timer className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatTime(stats.elapsed)}</div>
          <p className="text-xs text-muted-foreground">Duração da execução</p>
        </CardContent>
      </Card>
    </div>
  )
}
