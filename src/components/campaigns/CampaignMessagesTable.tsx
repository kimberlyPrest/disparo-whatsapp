import { CampaignMessage } from '@/services/campaigns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  MessageSquareOff,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CampaignMessagesTableProps {
  messages: CampaignMessage[]
  onRetry: (id: string) => void
  loadingId: string | null
  isLoading?: boolean
}

export function CampaignMessagesTable({
  messages,
  onRetry,
  loadingId,
  isLoading = false,
}: CampaignMessagesTableProps) {
  const getStatusInfo = (msg: CampaignMessage) => {
    switch (msg.status) {
      case 'sent':
        return {
          label: 'Enviado',
          color:
            'bg-green-100 text-green-700 hover:bg-green-200 border-green-200',
          icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
        }
      case 'failed':
      case 'error':
        return {
          label: 'Falha',
          color: 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200',
          icon: <XCircle className="h-3 w-3 mr-1" />,
        }
      case 'aguardando':
      case 'pending':
        return {
          label: 'Aguardando',
          color:
            'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200',
          icon: <Clock className="h-3 w-3 mr-1" />,
        }
      default:
        return {
          label: msg.status,
          color: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200',
          icon: <AlertCircle className="h-3 w-3 mr-1" />,
        }
    }
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-8 w-8 ml-auto" />
                </TableCell>
              </TableRow>
            ))
          ) : messages.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-48 text-center">
                <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <MessageSquareOff className="h-8 w-8 opacity-50" />
                  <p>Nenhuma mensagem encontrada para esta campanha.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            messages.map((msg) => {
              const statusInfo = getStatusInfo(msg)
              const isFailed = msg.status === 'failed' || msg.status === 'error'

              return (
                <TableRow key={msg.id}>
                  <TableCell className="font-medium">
                    {msg.contacts?.name || 'Desconhecido'}
                  </TableCell>
                  <TableCell>{msg.contacts?.phone || '-'}</TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className={`cursor-help ${statusInfo.color}`}
                          >
                            {statusInfo.icon}
                            {statusInfo.label}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          {msg.status === 'sent' && msg.sent_at ? (
                            <p>
                              Enviado em:{' '}
                              {format(
                                new Date(msg.sent_at),
                                'dd/MM/yyyy HH:mm:ss',
                                { locale: ptBR },
                              )}
                            </p>
                          ) : isFailed && msg.error_message ? (
                            <div className="text-sm">
                              <p className="font-semibold mb-1">Erro:</p>
                              <p className="text-red-300 break-words">
                                {msg.error_message}
                              </p>
                            </div>
                          ) : (
                            <p>Status atual: {msg.status}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-right">
                    {isFailed && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs"
                        onClick={() => onRetry(msg.id)}
                        disabled={loadingId === msg.id}
                      >
                        {loadingId === msg.id ? (
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        Tentar Novamente
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
