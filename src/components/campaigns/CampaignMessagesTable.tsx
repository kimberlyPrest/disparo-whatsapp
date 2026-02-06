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
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CampaignMessagesTableProps {
  messages: CampaignMessage[]
  onRetry: (id: string) => void
  loadingId: string | null
}

export function CampaignMessagesTable({
  messages,
  onRetry,
  loadingId,
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
          {messages.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                Nenhuma mensagem encontrada.
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
