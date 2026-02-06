import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { campaignsService, Campaign } from '@/services/campaigns'
import { useParams, Link, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Loader2,
  ArrowLeft,
  Calendar,
  Clock,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

export default function DisparoDetalhes() {
  const { user, loading: authLoading } = useAuth()
  const { id } = useParams<{ id: string }>()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && id) {
      fetchCampaign(id)
    }
  }, [user, id])

  const fetchCampaign = async (campaignId: string) => {
    try {
      const data = await campaignsService.getById(campaignId)
      setCampaign(data)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar detalhes da campanha')
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

  if (!campaign) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Campanha não encontrada</h2>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/disparos">Voltar para a lista</Link>
        </Button>
      </div>
    )
  }

  const percentage = Math.round(
    ((campaign.sent_messages || 0) /
      Math.max(campaign.total_messages || 1, 1)) *
      100,
  )

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in-up">
      <Button
        asChild
        variant="ghost"
        className="mb-6 pl-0 hover:pl-2 transition-all"
      >
        <Link to="/disparos">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Disparos
        </Link>
      </Button>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl mb-2">
                    {campaign.name}
                  </CardTitle>
                  <CardDescription>ID: {campaign.id}</CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="text-base px-4 py-1 capitalize"
                >
                  {campaign.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Progresso do Envio</span>
                  <span className="text-muted-foreground">
                    {campaign.sent_messages} de {campaign.total_messages}{' '}
                    mensagens
                  </span>
                </div>
                <Progress value={percentage} className="h-4" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-4">
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Criado em</p>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        new Date(campaign.created_at),
                        "dd/MM/yyyy 'às' HH:mm",
                        { locale: ptBR },
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Agendado para</p>
                    <p className="text-sm text-muted-foreground">
                      {campaign.scheduled_at
                        ? format(
                            new Date(campaign.scheduled_at),
                            "dd/MM/yyyy 'às' HH:mm",
                            { locale: ptBR },
                          )
                        : 'Envio Imediato'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Side */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Métricas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-bold">{campaign.total_messages}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm text-muted-foreground">Enviados</span>
                <span className="font-bold text-green-600">
                  {campaign.sent_messages}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Tempo decorrido
                </span>
                <span className="font-bold">
                  {campaign.execution_time
                    ? `${Math.round(campaign.execution_time)}s`
                    : '-'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
