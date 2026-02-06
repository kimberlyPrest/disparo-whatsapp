import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { campaignsService, Campaign } from '@/services/campaigns'
import { Button, buttonVariants } from '@/components/ui/button'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Loader2,
  Pause,
  Eye,
  AlertCircle,
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
} from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export default function Disparos() {
  const { user, loading: authLoading } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [pausingId, setPausingId] = useState<string | null>(null)
  const [resumingId, setResumingId] = useState<string | null>(null)
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(
    null,
  )
  const [isDeleting, setIsDeleting] = useState(false)
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
          (payload) => {
            // Optimistically update the list without full refetch for smoother UI
            if (payload.eventType === 'UPDATE') {
              setCampaigns((prev) =>
                prev.map((c) =>
                  c.id === payload.new.id ? (payload.new as Campaign) : c,
                ),
              )
            } else {
              // For INSERT or DELETE, refetch might be safer/easier
              fetchCampaigns()
            }
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
      // Optimistic update
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

  const handleResume = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation() // Prevent row click
    setResumingId(id)
    try {
      await campaignsService.resume(id)
      toast.success('Campanha retomada com sucesso')
      // Optimistic update
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'active' } : c)),
      )
    } catch (error) {
      console.error(error)
      toast.error('Erro ao retomar campanha')
    } finally {
      setResumingId(null)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent, campaign: Campaign) => {
    e.stopPropagation()
    setCampaignToDelete(campaign)
  }

  const confirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!campaignToDelete) return

    setIsDeleting(true)
    try {
      await campaignsService.delete(campaignToDelete.id)
      toast.success('Campanha excluída com sucesso')
      // Optimistic update
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignToDelete.id))
      setCampaignToDelete(null)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao excluir campanha')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRowClick = (id: string) => {
    navigate(`/disparos/${id}`)
  }

  const getStatusBadge = (status: string, hasErrors: boolean) => {
    if (status === 'finished' && hasErrors) {
      return (
        <Badge
          variant="outline"
          className="border-orange-500 text-orange-600 gap-1 bg-orange-50"
        >
          <AlertTriangle className="h-3 w-3" />
          Concluído com Erros
        </Badge>
      )
    }

    switch (status) {
      case 'finished':
        return (
          <Badge className="bg-green-500 hover:bg-green-600 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Finalizado
          </Badge>
        )
      case 'failed':
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Falhou
          </Badge>
        )
      case 'active':
      case 'processing':
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600 gap-1 animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin" />
            Em Andamento
          </Badge>
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
            className="bg-orange-400 text-white hover:bg-orange-500 gap-1"
          >
            <Pause className="h-3 w-3" />
            Pausado
          </Badge>
        )
      case 'canceled':
        return <Badge variant="outline">Cancelado</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getProgressIndicatorClass = (status: string, hasErrors: boolean) => {
    if (status === 'finished' && hasErrors) return 'bg-orange-500'

    switch (status) {
      case 'finished':
        return 'bg-green-500'
      case 'failed':
      case 'error':
        return 'bg-destructive'
      case 'active':
      case 'processing':
        return 'bg-blue-500 animate-pulse'
      case 'paused':
        return 'bg-orange-400'
      case 'scheduled':
      case 'pending':
        return 'bg-muted-foreground/30'
      default:
        return 'bg-primary'
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
            Gerencie suas campanhas de envio e acompanhe o progresso em tempo
            real.
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
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Campanha</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[250px]">Progresso</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-3 w-full rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-8 w-8 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                    <TableHead className="w-[250px]">Progresso</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => {
                    const total = Math.max(campaign.total_messages || 0, 0)
                    // Ensure sent is not negative and respect the DB value, clamping to total is optional but good for UI sanity if DB desyncs
                    const sent = Math.min(
                      Math.max(campaign.sent_messages || 0, 0),
                      total,
                    )
                    const percentage =
                      total > 0 ? Math.round((sent / total) * 100) : 0

                    const status = campaign.status || 'unknown'
                    const isActive = ['active', 'processing'].includes(status)
                    const isPaused = status === 'paused'

                    // Logic to detect if finished with errors:
                    // Status is 'finished' BUT sent messages count is less than total messages count
                    const hasErrors = status === 'finished' && sent < total

                    return (
                      <TableRow
                        key={campaign.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleRowClick(campaign.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="truncate max-w-[200px] md:max-w-none">
                              {campaign.name}
                            </span>
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
                          {getStatusBadge(status, hasErrors)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-medium">
                              <span>{percentage}%</span>
                              <span className="text-muted-foreground">
                                {sent} / {total} enviadas
                              </span>
                            </div>
                            <Progress
                              value={percentage}
                              className="h-2.5"
                              indicatorClassName={getProgressIndicatorClass(
                                status,
                                hasErrors,
                              )}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden md:table-cell whitespace-nowrap">
                          {format(
                            new Date(campaign.created_at),
                            "dd 'de' MMM, HH:mm",
                            { locale: ptBR },
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {isActive && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 hidden sm:flex"
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
                            {isPaused && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700 hidden sm:flex"
                                onClick={(e) => handleResume(e, campaign.id)}
                                disabled={resumingId === campaign.id}
                              >
                                {resumingId === campaign.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Play className="h-3 w-3 mr-1" />
                                    Retomar
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => handleDeleteClick(e, campaign)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Excluir campanha</span>
                            </Button>
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

      <AlertDialog
        open={!!campaignToDelete}
        onOpenChange={(open) => !open && setCampaignToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Tem certeza que deseja excluir esta campanha?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita e excluirá todo o histórico de
              mensagens associado à campanha{' '}
              <span className="font-medium text-foreground">
                "{campaignToDelete?.name}"
              </span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={confirmDelete}
              className={cn(
                buttonVariants({ variant: 'destructive' }),
                'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              )}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
