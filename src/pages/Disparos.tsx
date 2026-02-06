import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { campaignsService, Campaign } from '@/services/campaigns'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Loader2, Pause, Eye, AlertCircle, Plus } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function Disparos() {
  const { user, loading: authLoading } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [pausingId, setPausingId] = useState<string | null>(null)
  const navigate = useNavigate()

  const fetchCampaigns = useCallback(async () => {
    try {
      const data = await campaignsService.getAll()
      setCampaigns(data)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar disparos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchCampaigns()

      // Real-time updates for campaign status and progress
      const subscription = supabase
        .channel('disparos_list')
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

  const handlePause = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation() // Prevent row click
    setPausingId(id)
    try {
      await campaignsService.pause(id)
      toast.success('Campanha pausada com sucesso')
      // Optimistic update or wait for realtime
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'paused' } : c)),
      )
    } catch (error) {
      console.error(error)
      toast.error('Erro ao pausar campanha')
    } finally {
      setPausingId(null)
    }
  }

  const handleRowClick = (id: string) => {
    navigate(`/disparos/${id}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'finished':
        return (
          <Badge className="bg-green-500 hover:bg-green-600">Finalizado</Badge>
        )
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>
      case 'active':
      case 'processing':
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600">Em Andamento</Badge>
        )
      case 'scheduled':
      case 'pending':
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
            Agendado
          </Badge>
        )
      case 'paused':
        return (
          <Badge
            variant="secondary"
            className="bg-orange-400 text-white hover:bg-orange-500"
          >
            Pausado
          </Badge>
        )
      case 'canceled':
        return <Badge variant="outline">Cancelado</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meus Disparos</h1>
          <p className="text-muted-foreground">
            Gerencie suas campanhas de envio.
          </p>
        </div>
        <Button asChild>
          <Link to="/upload">
            <Plus className="mr-2 h-4 w-4" />
            Novo Disparo
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Campanhas</CardTitle>
          <CardDescription>
            Acompanhe o status e progresso de todos os seus envios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-muted/50 p-6 rounded-full w-fit mx-auto mb-4">
                <AlertCircle className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Nenhuma campanha encontrada
              </h3>
              <p className="text-muted-foreground mb-6">
                Você ainda não realizou nenhum disparo de mensagens.
              </p>
              <Button asChild>
                <Link to="/upload">Criar primeira campanha</Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Campanha</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[200px]">Progresso</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => {
                    const percentage = Math.round(
                      ((campaign.sent_messages || 0) /
                        Math.max(campaign.total_messages || 1, 1)) *
                        100,
                    )
                    const isActive = ['active', 'processing'].includes(
                      campaign.status || '',
                    )

                    return (
                      <TableRow
                        key={campaign.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleRowClick(campaign.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{campaign.name}</span>
                            <span className="text-xs text-muted-foreground md:hidden">
                              {format(
                                new Date(campaign.created_at),
                                'dd/MM/yyyy',
                                { locale: ptBR },
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(campaign.status || 'unknown')}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span>{percentage}%</span>
                              <span className="text-muted-foreground">
                                {campaign.sent_messages}/
                                {campaign.total_messages}
                              </span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden md:table-cell">
                          {format(
                            new Date(campaign.created_at),
                            "dd 'de' MMMM, HH:mm",
                            { locale: ptBR },
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {isActive && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                                onClick={(e) => handlePause(e, campaign.id)}
                                disabled={pausingId === campaign.id}
                              >
                                {pausingId === campaign.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Pause className="h-3 w-3 mr-1" />
                                    Pausar
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRowClick(campaign.id)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">Ver detalhes</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
