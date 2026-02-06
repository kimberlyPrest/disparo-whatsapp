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
  Clock,
  Users,
  Moon,
  Sun,
  PauseCircle,
  Timer,
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
import { Switch } from '@/components/ui/switch'
import { campaignsService } from '@/services/campaigns'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

const formSchema = z
  .object({
    name: z.string().min(1, 'Nome da campanha é obrigatório'),
    minInterval: z.coerce
      .number()
      .min(5, 'O intervalo mínimo deve ser de pelo menos 5 segundos'),
    maxInterval: z.coerce.number(),
    scheduleType: z.enum(['immediate', 'scheduled']),
    scheduledDate: z.date().optional(),
    scheduledTime: z.string().optional(),

    // Advanced Settings - Batching (Pauses)
    useBatching: z.boolean().default(false),
    batchSize: z.coerce.number().optional(),
    batchPauseMin: z.coerce.number().optional(),
    batchPauseMax: z.coerce.number().optional(),

    // Advanced Settings - Business Hours
    businessHoursStrategy: z.enum(['ignore', 'pause']).default('ignore'),
    businessHoursPauseTime: z.string().default('18:00'),
    businessHoursResumeTime: z.string().default('08:00'),
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
      path: ['scheduledDate'],
    },
  )
  .refine(
    (data) => {
      if (data.useBatching) {
        if (!data.batchSize || data.batchSize < 1) return false
        if (!data.batchPauseMin || data.batchPauseMin < 1) return false
        if (!data.batchPauseMax || data.batchPauseMax < data.batchPauseMin)
          return false
      }
      return true
    },
    {
      message:
        'Configuração de pausas inválida. Verifique o tamanho do lote e os intervalos.',
      path: ['batchSize'],
    },
  )
  .refine(
    (data) => {
      if (data.businessHoursStrategy === 'pause') {
        return !!data.businessHoursPauseTime && !!data.businessHoursResumeTime
      }
      return true
    },
    {
      message: 'Defina os horários de pausa e retomada',
      path: ['businessHoursPauseTime'],
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
      scheduledTime: format(addSeconds(new Date(), 600), 'HH:mm'),
      useBatching: false,
      batchSize: 50,
      batchPauseMin: 300, // 5 min
      batchPauseMax: 600, // 10 min
      businessHoursStrategy: 'ignore',
      businessHoursPauseTime: '18:00',
      businessHoursResumeTime: '08:00',
    },
  })

  const { watch } = form
  const minInterval = watch('minInterval')
  const maxInterval = watch('maxInterval')
  const scheduleType = watch('scheduleType')
  const scheduledDate = watch('scheduledDate')
  const scheduledTime = watch('scheduledTime')
  const useBatching = watch('useBatching')
  const batchSize = watch('batchSize')
  const businessHoursStrategy = watch('businessHoursStrategy')

  const estimatedTime =
    selectedContactIds.length *
    ((Number(minInterval) + Number(maxInterval)) / 2)
  const formattedEstimatedTime = () => {
    if (!estimatedTime) return '0s'
    const minutes = Math.floor(estimatedTime / 60)
    const seconds = Math.floor(estimatedTime % 60)
    if (minutes > 60) {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return `${hours}h ${remainingMinutes}m ${seconds}s`
    }
    return `${minutes} min ${seconds}s`
  }

  const totalGroups =
    useBatching && batchSize && batchSize > 0
      ? Math.ceil(selectedContactIds.length / batchSize)
      : 0

  const getStartTime = () => {
    if (scheduleType === 'scheduled' && scheduledDate && scheduledTime) {
      const [hours, minutes] = scheduledTime.split(':').map(Number)
      const date = new Date(scheduledDate)
      date.setHours(hours, minutes)
      return date
    }
    return new Date()
  }

  const isOutsideBusinessHours = () => {
    const start = getStartTime()
    const hours = start.getHours()
    return hours < 8 || hours >= 18
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
        scheduledAt = new Date().toISOString()
      }

      // Construct advanced config
      const config = {
        min_interval: values.minInterval,
        max_interval: values.maxInterval,
        batch_config: values.useBatching
          ? {
              enabled: true,
              size: values.batchSize,
              pause_min: values.batchPauseMin,
              pause_max: values.batchPauseMax,
            }
          : { enabled: false },
        business_hours: {
          strategy: values.businessHoursStrategy,
          pause_at: values.businessHoursPauseTime,
          resume_at: values.businessHoursResumeTime,
        },
      }

      await campaignsService.create(
        {
          name: values.name,
          user_id: user.id,
          status: values.scheduleType === 'scheduled' ? 'scheduled' : 'active',
          total_messages: selectedContactIds.length,
          scheduled_at: scheduledAt,
          config: config,
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Envio em Massa</DialogTitle>
          <DialogDescription>
            Defina os parâmetros para o envio de mensagens para{' '}
            {selectedContactIds.length} contatos.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Config */}
            <div className="space-y-4">
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
                                Tempo mínimo aleatório entre envios para simular
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
                      <FormLabel>Intervalo Máximo (s)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Tempo Total Estimado:
                </span>
              </div>
              <span className="text-lg font-bold text-primary">
                {formattedEstimatedTime()}
              </span>
            </div>

            {/* Periodic Pauses Section */}
            <div className="space-y-4 border rounded-lg p-4 bg-slate-50/50">
              <FormField
                control={form.control}
                name="useBatching"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-white">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <PauseCircle className="h-4 w-4 text-primary" />
                        Pausas Periódicas (Lotes)
                      </FormLabel>
                      <FormDescription>
                        Fazer pausas longas a cada grupo de mensagens para
                        segurança.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {useBatching && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-down pl-1">
                  <FormField
                    control={form.control}
                    name="batchSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensagens por grupo</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="number" {...field} />
                            <Users className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
                          </div>
                        </FormControl>
                        <FormDescription>
                          {totalGroups > 0 &&
                            `Cálculo: ${totalGroups} grupos necessários`}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="batchPauseMin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pausa Mín (s)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="batchPauseMax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pausa Máx (s)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Business Hours Section */}
            <div className="space-y-4 border rounded-lg p-4 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2">
                <Sun className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold text-sm">Horário Comercial</h3>
              </div>

              {isOutsideBusinessHours() && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-md flex items-start gap-3 mb-4">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800 font-medium">
                    O início do disparo está fora do horário comercial (08h às
                    18h).
                  </p>
                </div>
              )}

              <FormField
                control={form.control}
                name="businessHoursStrategy"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="ignore" />
                          </FormControl>
                          <FormLabel className="font-normal text-sm">
                            Extrapolar horário (Continuar enviando)
                          </FormLabel>
                        </FormItem>

                        {businessHoursStrategy === 'ignore' && (
                          <div className="ml-7 text-xs text-muted-foreground bg-red-50 p-2 rounded border border-red-100 text-red-600">
                            Atenção: Enviar mensagens fora do horário comercial
                            pode aumentar o risco de denúncias e bloqueios.
                          </div>
                        )}

                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="pause" />
                          </FormControl>
                          <FormLabel className="font-normal text-sm">
                            Agendar pausa automática
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {businessHoursStrategy === 'pause' && (
                <div className="flex gap-4 ml-7 animate-fade-in-down">
                  <FormField
                    control={form.control}
                    name="businessHoursPauseTime"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-xs">Pausar às</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="businessHoursResumeTime"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-xs">Retomar às</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Schedule Section */}
            <div className="space-y-4">
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
                        className="flex flex-row gap-6"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="immediate" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Imediato
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="scheduled" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Agendar
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {scheduleType === 'scheduled' && (
                <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-down p-4 border rounded-md bg-muted/20">
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
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
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
