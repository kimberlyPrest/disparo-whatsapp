import { useEffect, useState } from 'react'
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

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchCampaigns()
    }
  }, [user])

  const fetchCampaigns = async () => {
    try {
      const data = await campaignsService.getAll()
      setCampaigns(data)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar campanhas')
    } finally {
      setLoading(false)
    }
  }

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
    (acc, curr) => acc + curr.messages_sent,
    0,
  )
  const totalExecutionTime = campaigns.reduce(
    (acc, curr) => acc + curr.execution_time,
    0,
  ) // in seconds
  const totalCampaigns = campaigns.length
  const activeOrScheduled = campaigns.filter((c) =>
    ['active', 'scheduled'].includes(c.status),
  )

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds > 0 ? `${remainingSeconds}s` : ''}`
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
        <Card>
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

        <Card>
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

        <Card>
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

        <Card>
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
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
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
                className="overflow-hidden border-l-4 border-l-primary"
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle
                      className="text-lg truncate pr-2"
                      title={campaign.name}
                    >
                      {campaign.name}
                    </CardTitle>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${
                        campaign.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {campaign.status === 'active' ? 'Ativo' : 'Agendado'}
                    </span>
                  </div>
                  <CardDescription>
                    {campaign.scheduled_for ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(
                          new Date(campaign.scheduled_for),
                          'dd/MM/yyyy HH:mm',
                        )}
                      </span>
                    ) : (
                      'Iniciado imediatamente'
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">
                        {Math.round(
                          (campaign.messages_sent /
                            Math.max(campaign.total_messages, 1)) *
                            100,
                        )}
                        %
                      </span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{
                          width: `${(campaign.messages_sent / Math.max(campaign.total_messages, 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                      <span>{campaign.messages_sent} enviados</span>
                      <span>Total: {campaign.total_messages}</span>
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
