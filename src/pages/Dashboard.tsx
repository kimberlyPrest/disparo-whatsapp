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
  Table as TableIcon,
  Sliders,
  Rocket,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

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

  // Dashboard View Logic
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in-up">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        {/* KPIs Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* List Skeletons */}
        <div className="space-y-6">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-40 mt-1" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                    <Skeleton className="h-2.5 w-full rounded-full" />
                    <div className="flex justify-between text-xs pt-2 mt-2 border-t">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in-up">
        {/* Welcome Header */}
        <div className="mb-12 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-green-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span>
            </span>
            Conta ativada com sucesso
          </div>
          <h1 className="font-manrope text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Bem-vindo ao Ripple! 👋
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Vamos começar sua primeira campanha de mensagens em massa. Siga os
            passos simples abaixo para configurar sua conta e alcançar seus
            clientes ainda hoje.
          </p>
        </div>

        {/* Onboarding Steps */}
        <div className="grid gap-8 md:grid-cols-3 mb-12 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-border -z-10" />

          {/* Step 1 */}
          <div className="group relative flex flex-col items-center text-center md:items-start md:text-left bg-background md:bg-transparent p-4 md:p-0 rounded-xl md:rounded-none">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-primary bg-background shadow-sm mb-4 relative transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <div className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm border-2 border-white shadow-sm">
                1
              </div>
              <TableIcon className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2 transition-colors duration-300 group-hover:text-primary">
              Importe sua Lista
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Carregue sua planilha de contatos (.csv ou .xlsx) para preparar
              sua audiência.
            </p>
          </div>

          {/* Step 2 */}
          <div className="group relative flex flex-col items-center text-center md:items-start md:text-left bg-background md:bg-transparent p-4 md:p-0 rounded-xl md:rounded-none">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border bg-background shadow-sm mb-4 relative transition-all duration-300 group-hover:scale-110 group-hover:border-primary group-hover:shadow-md">
              <div className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground font-bold text-sm border-2 border-white shadow-sm transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                2
              </div>
              <Sliders className="h-10 w-10 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2 transition-colors duration-300 group-hover:text-primary">
              Configure o Disparo
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Defina as configurações de envio e prepare a campanha para seus
              clientes.
            </p>
          </div>

          {/* Step 3 */}
          <div className="group relative flex flex-col items-center text-center md:items-start md:text-left bg-background md:bg-transparent p-4 md:p-0 rounded-xl md:rounded-none">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border bg-background shadow-sm mb-4 relative transition-all duration-300 group-hover:scale-110 group-hover:border-primary group-hover:shadow-md">
              <div className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground font-bold text-sm border-2 border-white shadow-sm transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                3
              </div>
              <Rocket className="h-10 w-10 text-muted-foreground ml-1 transition-colors duration-300 group-hover:text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2 transition-colors duration-300 group-hover:text-primary">
              Inicie o Disparo
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Escreva sua mensagem personalizada e dispare para todos os
              contatos.
            </p>
          </div>
        </div>

        {/* CTA Card */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white border shadow-sm p-8 md:p-12 transition-all hover:shadow-md">
          <div className="grid md:grid-cols-2 gap-8 items-center relative z-10">
            <div className="space-y-8 text-center md:text-left">
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tight">
                  Pronto para começar?
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Não há campanhas ativas no momento. Crie sua primeira campanha
                  agora e veja os resultados.
                </p>
              </div>
              <Button
                asChild
                size="lg"
                className="bg-[#13ec5b] hover:bg-[#13ec5b]/90 text-green-950 font-bold h-14 px-8 rounded-xl text-base shadow-lg shadow-green-500/20 w-full md:w-auto hover:scale-105 transition-transform"
              >
                <Link to="/upload">
                  <Rocket className="mr-2 h-5 w-5" />
                  Iniciar Primeiro Disparo
                </Link>
              </Button>
            </div>

            {/* Illustration */}
            <div className="relative flex justify-center md:justify-end mt-4 md:mt-0">
              <div className="relative h-64 w-64">
                {/* Circles */}
                <div className="absolute inset-0 rounded-full border border-dashed border-slate-200 animate-[spin_12s_linear_infinite]" />
                <div className="absolute inset-8 rounded-full border border-slate-100" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-24 w-24 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 transform -rotate-6 shadow-inner">
                    <MessageSquare className="h-12 w-12 fill-current" />
                  </div>
                </div>
                {/* Status Badge */}
                <div className="absolute top-10 right-0 bg-white shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border text-xs font-semibold animate-float">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  WhatsApp Conectado
                </div>
              </div>
            </div>
          </div>

          {/* Background decoration for card */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-bl-[100%] -z-0 opacity-50" />
        </div>
      </div>
    )
  }

  // Normal Dashboard (Populated)
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
