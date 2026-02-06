import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import {
  campaignsService,
  Campaign,
  CampaignMessage,
} from '@/services/campaigns'
import { useParams, Link, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Play, Pause, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { ScheduleConfig } from '@/lib/campaign-utils'
import { CampaignKPIs } from '@/components/campaigns/CampaignKPIs'
import { CampaignConfig } from '@/components/campaigns/CampaignConfig'
import { CampaignMessagesTable } from '@/components/campaigns/CampaignMessagesTable'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

export default function DisparoDetalhes() {
  const { user, loading: authLoading } = useAuth()
  const { id } = useParams<{ id: string }>()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [messages, setMessages] = useState<CampaignMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [retryLoadingId, setRetryLoadingId] = useState<string | null>(null)

  const fetchCampaignData = useCallback(async (campaignId: string) => {
    try {
      const [campData, msgsData] = await Promise.all([
        campaignsService.getById(campaignId),
        campaignsService.getMessages(campaignId),
      ])
      setCampaign(campData)
      setMessages(msgsData)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar detalhes da campanha')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && id) {
      fetchCampaignData(id)

      // Real-time subscription for campaign updates
      const campaignSub = supabase
        .channel(`campaign_${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'campaigns',
            filter: `id=eq.${id}`,
          },
          (payload) => {
            setCampaign(payload.new as Campaign)
          },
        )
        .subscribe()

      // Real-time subscription for messages updates
      const messagesSub = supabase
        .channel(`campaign_messages_${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'campaign_messages',
            filter: `campaign_id=eq.${id}`,
          },
          () => {
            // Refresh messages when changes occur (optimally would update just the row, but refetching is safer for now)
            campaignsService.getMessages(id).then(setMessages)
          },
        )
        .subscribe()

      return () => {
        campaignSub.unsubscribe()
        messagesSub.unsubscribe()
      }
    }
  }, [user, id, fetchCampaignData])

  const handlePauseResume = async () => {
    if (!campaign) return
    setActionLoading(true)
    const isPaused = campaign.status === 'paused'

    try {
      if (isPaused) {
        await campaignsService.resume(campaign.id)
        toast.success('Campanha retomada com sucesso')

        // Trigger background processing immediately
        try {
          await campaignsService.triggerQueue(campaign.id)
        } catch (queueError) {
          console.error('Failed to trigger queue', queueError)
          toast.warning(
            'A campanha foi retomada, mas o processamento pode demorar um pouco para iniciar.',
          )
        }
      } else {
        await campaignsService.pause(campaign.id)
        toast.success('Campanha pausada com sucesso')
      }
      // Optimistic update
      setCampaign((prev) =>
        prev ? { ...prev, status: isPaused ? 'active' : 'paused' } : null,
      )
    } catch (error) {
      console.error(error)
      toast.error(`Erro ao ${isPaused ? 'retomar' : 'pausar'} campanha`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRetryMessage = async (messageId: string) => {
    setRetryLoadingId(messageId)
    try {
      await campaignsService.retryMessage(messageId)
      toast.success('Mensagem reinserida na fila')

      // Update local state immediately for better UX
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, status: 'aguardando', error_message: null, sent_at: null }
            : m,
        ),
      )

      // If campaign was finished, we optimistically set it to processing too,
      // though the subscription will handle it accurately.
      setCampaign((prev) => {
        if (prev && prev.status === 'finished') {
          return { ...prev, status: 'processing' }
        }
        return prev
      })

      // Trigger background processing immediately
      try {
        if (campaign) {
          await campaignsService.triggerQueue(campaign.id)
        }
      } catch (queueError) {
        console.error('Failed to trigger queue', queueError)
      }
    } catch (error) {
      console.error(error)
      toast.error('Erro ao tentar reenviar mensagem')
    } finally {
      setRetryLoadingId(null)
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

  if (!loading && !campaign) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl text-center">
        <h2 className="text-2xl font-bold mb-2">Campanha não encontrada</h2>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/disparos">Voltar para a lista</Link>
        </Button>
      </div>
    )
  }

  const kpiStats = campaign
    ? {
        sent: messages.filter((m) => m.status === 'sent').length,
        waiting: messages.filter((m) =>
          ['aguardando', 'pending'].includes(m.status),
        ).length,
        failed: messages.filter((m) => ['failed', 'error'].includes(m.status))
          .length,
        elapsed: campaign.execution_time || 0,
      }
    : { sent: 0, waiting: 0, failed: 0, elapsed: 0 }

  const isPaused = campaign?.status === 'paused'
  const isActive = campaign
    ? ['active', 'processing'].includes(campaign.status)
    : false
  const isFinished = campaign
    ? campaign.status === 'finished' || campaign.status === 'canceled'
    : false

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in-up space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10">
            <Link to="/disparos">
              <ArrowLeft className="h-6 w-6" />
            </Link>
          </Button>
          <div>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {campaign?.name}
                  </h1>
                  <Badge variant={isActive ? 'default' : 'secondary'}>
                    {campaign?.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  ID: {campaign?.id}
                </p>
              </>
            )}
          </div>
        </div>

        {!loading && !isFinished && campaign && (
          <Button
            onClick={handlePauseResume}
            disabled={actionLoading}
            variant={isPaused ? 'default' : 'secondary'}
            className="w-full md:w-auto"
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : isPaused ? (
              <Play className="h-4 w-4 mr-2 fill-current" />
            ) : (
              <Pause className="h-4 w-4 mr-2 fill-current" />
            )}
            {isPaused ? 'Retomar Campanha' : 'Pausar Campanha'}
          </Button>
        )}
      </div>

      {/* KPIs */}
      <CampaignKPIs stats={kpiStats} isLoading={loading} />

      {/* Config Summary */}
      {loading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <CampaignConfig
          config={campaign?.config as unknown as ScheduleConfig}
          scheduledAt={campaign?.scheduled_at || null}
        />
      )}

      {/* Messages Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            Log de Mensagens
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => campaign && fetchCampaignData(campaign.id)}
            disabled={loading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
        <CampaignMessagesTable
          messages={messages}
          onRetry={handleRetryMessage}
          loadingId={retryLoadingId}
          isLoading={loading}
        />
      </div>
    </div>
  )
}
