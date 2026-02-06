import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { campaignsService, Campaign } from '@/services/campaigns'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Link, Navigate } from 'react-router-dom'
import {
  Loader2,
  MessageSquare,
  Clock,
  Send,
  Calendar,
  PlusCircle,
  Activity,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCampaigns = useCallback(async () => {
    try {
      const data = await campaignsService.getAll()
      setCampaigns(data)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar campanhas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchCampaigns()

      // Real-time updates
      const subscription = supabase
        .channel('dashboard_campaigns')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'campaigns',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchCampaigns()
          },
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user, fetchCampaigns])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Empty State
  if (campaigns.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-7xl animate-fade-in-up">
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto space-y-8">
          <div className="bg-primary/10 p-6 rounded-full">
            <Send className="h-12 w-12 text-primary" />
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Faça o seu primeiro Disparo de WhatsApp
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Importe sua planilha de contatos e envie mensagens personalizadas
              em massa de forma simples e rápida. Acompanhe o progresso e os
              resultados em tempo real.
            </p>
          </div>

          <Button
            asChild
            size="lg"
            className="h-12 px-8 text-lg shadow-lg hover:shadow-primary/20 hover:scale-105 transition-all"
          >
            <Link to="/upload">
              Começar
              <PlusCircle className="ml-2 h-5 w-5" />
            </Link>
          </Button>

          <div className="w-full max-w-lg mt-8 rounded-xl overflow-hidden shadow-2xl border bg-card">
            <img
              src="https://img.usecurling.com/p/600/300?q=spreadsheet%20dashboard%20analytics&color=blue&dpr=2"
              alt="Dashboard Preview"
              className="w-full h-auto object-cover opacity-80"
            />
          </div>
        </div>
      </div>
    )
  }

  // Dashboard View
  const totalMessagesSent = campaigns.reduce(
    (acc, curr) => acc + (curr.sent_messages || 0),
    0,
  )
  const totalExecutionTime = campaigns.reduce(
    (acc, curr) => acc + (curr.execution_time || 0),
    0,
  ) // in seconds
  const totalCampaigns = campaigns.length

  // Filter including active, scheduled, pending and processing states
  const activeOrScheduled = campaigns.filter((c) =>
    ['active', 'scheduled', 'pending', 'processing'].includes(c.status),
  )

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    if (minutes > 60) {
      const hours = Math.floor(minutes / 60)
      const remMin = minutes % 60
      return `${hours}h ${remMin}m`
    }

    return `${minutes}m ${remainingSeconds > 0 ? `${remainingSeconds}s` : ''}`
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo'
      case 'processing':
        return 'Processando'
      case 'scheduled':
        return 'Agendado'
      case 'pending':
        return 'Pendente'
      case 'finished':
        return 'Finalizado'
      case 'failed':
        return 'Falhou'
      case 'paused':
        return 'Pausado'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'processing':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'scheduled':
      case 'pending':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'paused':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral dos seus disparos e métricas.
          </p>
        </div>
        <Button asChild className="shadow-sm">
          <Link to="/upload">
            <PlusCircle className="mr-2 h-4 w-4" />
            Agendar novo disparo
          </Link>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Mensagens
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalMessagesSent.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Enviadas com sucesso
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tempo de Execução
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(totalExecutionTime)}
            </div>
            <p className="text-xs text-muted-foreground">
              Tempo total de processamento
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Disparos
            </CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCampaigns}</div>
            <p className="text-xs text-muted-foreground">Campanhas criadas</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ativos / Agendados
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOrScheduled.length}</div>
            <p className="text-xs text-muted-foreground">
              Na fila de processamento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active/Scheduled Campaigns List */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold tracking-tight">
          Em Andamento & Agendados
        </h2>
        {activeOrScheduled.length === 0 ? (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">
                Nenhum disparo ativo ou agendado no momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeOrScheduled.map((campaign) => (
              <Card
                key={campaign.id}
                className="overflow-hidden border-l-4 border-l-primary hover:shadow-lg transition-all duration-300"
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle
                      className="text-lg truncate leading-tight"
                      title={campaign.name}
                    >
                      {campaign.name}
                    </CardTitle>
                    <span
                      className={cn(
                        'px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0',
                        getStatusColor(campaign.status),
                      )}
                    >
                      {getStatusLabel(campaign.status)}
                    </span>
                  </div>
                  <CardDescription className="pt-1">
                    {campaign.scheduled_at ? (
                      <span className="flex items-center gap-1.5 text-xs">
                        <Calendar className="h-3 w-3" />
                        {format(
                          new Date(campaign.scheduled_at),
                          'dd/MM/yyyy HH:mm',
                        )}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs">
                        <Clock className="h-3 w-3" />
                        Iniciado imediatamente
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">
                        Progresso
                      </span>
                      <span className="font-bold text-primary">
                        {Math.round(
                          ((campaign.sent_messages || 0) /
                            Math.max(campaign.total_messages, 1)) *
                            100,
                        )}
                        %
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{
                          width: `${((campaign.sent_messages || 0) / Math.max(campaign.total_messages, 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground border-t pt-2 mt-2">
                      <span>
                        Enviados:{' '}
                        <strong className="text-foreground">
                          {campaign.sent_messages || 0}
                        </strong>
                      </span>
                      <span>
                        Total:{' '}
                        <strong className="text-foreground">
                          {campaign.total_messages}
                        </strong>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
