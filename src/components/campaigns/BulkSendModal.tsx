import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format, addSeconds } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar as CalendarIcon,
  Info,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { campaignsService } from '@/services/campaigns'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

const formSchema = z
  .object({
    name: z.string().min(1, 'Nome da campanha é obrigatório'),
    minInterval: z.coerce
      .number()
      .min(30, 'O intervalo mínimo deve ser de pelo menos 30 segundos'),
    maxInterval: z.coerce.number(),
    scheduleType: z.enum(['immediate', 'scheduled']),
    scheduledDate: z.date().optional(),
    scheduledTime: z.string().optional(),
  })
  .refine((data) => data.maxInterval >= data.minInterval, {
    message: 'O intervalo máximo deve ser maior ou igual ao mínimo',
    path: ['maxInterval'],
  })
  .refine(
    (data) => {
      if (data.scheduleType === 'scheduled') {
        return !!data.scheduledDate && !!data.scheduledTime
      }
      return true
    },
    {
      message: 'Data e hora são obrigatórios para agendamento',
      path: ['scheduledDate'], // Highlight date field on error
    },
  )

interface BulkSendModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedContactIds: string[]
  onSuccess: () => void
}

export function BulkSendModal({
  open,
  onOpenChange,
  selectedContactIds,
  onSuccess,
}: BulkSendModalProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      minInterval: 30,
      maxInterval: 60,
      scheduleType: 'immediate',
      scheduledDate: new Date(),
      scheduledTime: format(addSeconds(new Date(), 600), 'HH:mm'), // Default to 10 mins from now
    },
  })

  const { watch } = form
  const minInterval = watch('minInterval')
  const maxInterval = watch('maxInterval')
  const scheduleType = watch('scheduleType')

  const estimatedTime =
    selectedContactIds.length *
    ((Number(minInterval) + Number(maxInterval)) / 2)
  const formattedEstimatedTime = () => {
    if (!estimatedTime) return '0s'
    const minutes = Math.floor(estimatedTime / 60)
    const seconds = Math.floor(estimatedTime % 60)
    return `${minutes} min ${seconds}s`
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast.error('Usuário não autenticado')
      return
    }

    setIsLoading(true)
    try {
      let scheduledAt = null
      if (
        values.scheduleType === 'scheduled' &&
        values.scheduledDate &&
        values.scheduledTime
      ) {
        const [hours, minutes] = values.scheduledTime.split(':').map(Number)
        const date = new Date(values.scheduledDate)
        date.setHours(hours)
        date.setMinutes(minutes)
        scheduledAt = date.toISOString()
      } else {
        scheduledAt = new Date().toISOString() // Immediate implies now effectively for sorting, but execution logic might differ
      }

      await campaignsService.create(
        {
          name: values.name,
          user_id: user.id,
          status: values.scheduleType === 'scheduled' ? 'scheduled' : 'active', // If immediate, it goes to active queue directly (conceptually)
          total_messages: selectedContactIds.length,
          scheduled_at: scheduledAt,
          config: {
            min_interval: values.minInterval,
            max_interval: values.maxInterval,
          },
        },
        selectedContactIds,
      )

      toast.success('Campanha criada com sucesso!')
      onSuccess()
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao criar campanha')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Envio em Massa</DialogTitle>
          <DialogDescription>
            Defina os parâmetros para o envio de mensagens para{' '}
            {selectedContactIds.length} contatos selecionados.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 my-4 rounded-r-md flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>Cuidado!</strong> O envio em massa pode resultar no bloqueio
            da sua conta de WhatsApp. Use intervalos longos para reduzir riscos.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Campanha</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Promoção de Verão" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="minInterval"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>Intervalo Mínimo (s)</FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>
                              O sistema escolherá um tempo aleatório entre o
                              mínimo e o máximo para cada mensagem, simulando
                              comportamento humano.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxInterval"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>Intervalo Máximo (s)</FormLabel>
                    </div>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">
                Tempo Total Estimado:
              </span>
              <span className="text-lg font-bold text-primary">
                {formattedEstimatedTime()}
              </span>
            </div>

            <FormField
              control={form.control}
              name="scheduleType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Início do Disparo</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="immediate" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Imediato (Assim que possível)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="scheduled" />
                        </FormControl>
                        <FormLabel className="font-normal">Agendar</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {scheduleType === 'scheduled' && (
              <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-down">
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col flex-1">
                      <FormLabel>Data</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground',
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: ptBR })
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scheduledTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-col w-full sm:w-32">
                      <FormLabel>Hora</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Disparo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
