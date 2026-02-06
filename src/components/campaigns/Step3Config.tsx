import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar as CalendarIcon,
  Clock,
  Shield,
  Pause,
  ArrowLeft,
  Loader2,
  Rocket,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { campaignsService, Campaign } from '@/services/campaigns'
import { toast } from 'sonner'

const formSchema = z
  .object({
    name: z.string().min(1, 'Nome da campanha é obrigatório'),
    minInterval: z.coerce
      .number()
      .min(1, 'Mínimo de 1 segundo')
      .max(3600, 'Máximo de 1 hora'),
    maxInterval: z.coerce
      .number()
      .min(1, 'Mínimo de 1 segundo')
      .max(3600, 'Máximo de 1 hora'),
    scheduleType: z.enum(['immediate', 'scheduled']),
    scheduledDate: z.date().optional(),
    scheduledTime: z.string().optional(),

    useBatching: z.boolean().default(false),
    batchSize: z.coerce.number().optional(),
    batchPauseMin: z.coerce.number().optional(),
    batchPauseMax: z.coerce.number().optional(),

    businessHoursStrategy: z.enum(['ignore', 'pause']).default('ignore'),
  })
  .refine((data) => data.maxInterval >= data.minInterval, {
    message: 'Intervalo máximo deve ser maior ou igual ao mínimo',
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
      message: 'Configuração de lote inválida',
      path: ['batchSize'],
    },
  )

export interface Step3ConfigValues {
  name: string
  minInterval: number
  maxInterval: number
  scheduleType: 'immediate' | 'scheduled'
  scheduledDate?: Date
  scheduledTime?: string
  useBatching: boolean
  batchSize?: number
  batchPauseMin?: number
  batchPauseMax?: number
  businessHoursStrategy: 'ignore' | 'pause'
}

interface Step3ConfigProps {
  campaignId: string
  onBack: () => void
  onFinish: (values: Step3ConfigValues) => Promise<void>
}

export function Step3Config({
  campaignId,
  onBack,
  onFinish,
}: Step3ConfigProps) {
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [campaign, setCampaign] = useState<Campaign | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      minInterval: 15,
      maxInterval: 30,
      scheduleType: 'immediate',
      useBatching: false,
      batchSize: 20,
      batchPauseMin: 60,
      batchPauseMax: 120,
      businessHoursStrategy: 'ignore',
    },
  })

  // Load campaign data
  useEffect(() => {
    async function loadCampaign() {
      try {
        const data = await campaignsService.getById(campaignId)
        setCampaign(data)
        form.setValue('name', data.name)

        // Populate form if config exists (e.g. going back and forth)
        if (data.config) {
          // Logic to map existing config to form can be added here
          // For now we trust defaults or user input preservation if not persisted
        }
      } catch (error) {
        console.error(error)
        toast.error('Erro ao carregar dados da campanha')
      } finally {
        setLoading(false)
      }
    }
    loadCampaign()
  }, [campaignId, form])

  const watchedValues = form.watch()
  const { minInterval, maxInterval } = watchedValues

  // Estimate Time Calculation
  const calculateEstimatedTime = () => {
    if (!campaign?.total_messages) return 'Calculando...'

    const count = campaign.total_messages
    const avgInterval = (Number(minInterval) + Number(maxInterval)) / 2
    const totalSeconds = avgInterval * count

    // Convert to readable format
    if (totalSeconds < 60) return `${Math.ceil(totalSeconds)} seg`

    const minutes = Math.floor(totalSeconds / 60)
    const seconds = Math.ceil(totalSeconds % 60)

    if (minutes > 60) {
      const hours = Math.floor(minutes / 60)
      const remMinutes = minutes % 60
      return `~ ${hours}h ${remMinutes}m`
    }

    return `~ ${minutes.toString().padStart(2, '0')} min ${seconds.toString().padStart(2, '0')} seg`
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    try {
      await onFinish(values as Step3ConfigValues)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-20">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              onClick={onBack}
              href="#"
              className="hover:text-primary"
            >
              Novo Disparo
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-primary font-medium">
              Configuração
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Configurar Disparo
        </h1>
        <p className="text-muted-foreground">
          Passo 3 de 3: Defina os intervalos de segurança e agendamento.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Safety Alert */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                <Shield className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                  Safety First
                </h4>
                <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                  <p className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Para evitar bloqueios do WhatsApp, recomendamos intervalos
                    maiores que 15 segundos.
                  </p>
                  <p className="flex items-center gap-2">
                    <Info className="h-4 w-4 shrink-0" />O disparo será enviado
                    para os{' '}
                    <strong className="font-semibold">
                      {campaign?.total_messages || 0} contatos
                    </strong>{' '}
                    selecionados no passo anterior.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Campaign Name */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nome da Campanha</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Ex: Promoção Dia das Mães - Lista VIP"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Interval Config */}
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Intervalo de Envio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase text-muted-foreground">
                          Mínimo (s)
                        </FormLabel>
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
                        <FormLabel className="text-xs uppercase text-muted-foreground">
                          Máximo (s)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormDescription className="text-xs">
                  Tempo de espera aleatório entre cada mensagem (em segundos).
                </FormDescription>

                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <span className="text-sm text-muted-foreground">
                    Tempo médio estimado:
                  </span>
                  <div className="mt-1 font-mono text-lg font-medium text-foreground">
                    {calculateEstimatedTime()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scheduling */}
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  Agendamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="scheduleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-2 gap-4"
                        >
                          <FormItem>
                            <FormControl>
                              <RadioGroupItem
                                value="immediate"
                                className="peer sr-only"
                                id="immediate"
                              />
                            </FormControl>
                            <Label
                              htmlFor="immediate"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all"
                            >
                              <Rocket className="mb-2 h-5 w-5" />
                              Imediato
                            </Label>
                          </FormItem>
                          <FormItem>
                            <FormControl>
                              <RadioGroupItem
                                value="scheduled"
                                className="peer sr-only"
                                id="scheduled"
                              />
                            </FormControl>
                            <Label
                              htmlFor="scheduled"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all"
                            >
                              <CalendarIcon className="mb-2 h-5 w-5" />
                              Agendar
                            </Label>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch('scheduleType') === 'scheduled' && (
                  <div className="grid grid-cols-2 gap-4 animate-fade-in-down">
                    <FormField
                      control={form.control}
                      name="scheduledDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
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
                                    <span>Selecione</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date <
                                  new Date(new Date().setHours(0, 0, 0, 0))
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
                        <FormItem>
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
              </CardContent>
            </Card>
          </div>

          {/* Periodic Pauses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Pause className="h-4 w-4 text-muted-foreground" />
                  Pausas Periódicas
                </CardTitle>
                <CardDescription>
                  Pausar o envio após um certo número de mensagens para simular
                  comportamento humano.
                </CardDescription>
              </div>
              <FormField
                control={form.control}
                name="useBatching"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardHeader>
            {form.watch('useBatching') && (
              <CardContent className="pt-4 animate-fade-in-down">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="batchSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase text-muted-foreground">
                          Mensagens por grupo
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="batchPauseMin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase text-muted-foreground">
                          Pausa Mín (s)
                        </FormLabel>
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
                        <FormLabel className="text-xs uppercase text-muted-foreground">
                          Pausa Máx (s)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Business Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Horário Comercial (08:00 - 18:00)
              </CardTitle>
              <CardDescription>
                Defina o comportamento caso o envio ultrapasse o horário
                comercial.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="businessHoursStrategy"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col md:flex-row gap-4"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="ignore" id="ignore" />
                          </FormControl>
                          <FormLabel htmlFor="ignore" className="font-normal">
                            Extrapolar horário (Continuar enviando)
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="pause" id="pause" />
                          </FormControl>
                          <FormLabel htmlFor="pause" className="font-normal">
                            Agendar pausa automática
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    {field.value === 'ignore' && (
                      <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Risco aumentado de bloqueio ao enviar mensagens fora do
                        horário comercial.
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 pt-6">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground gap-2"
              disabled={isSubmitting}
            >
              <ArrowLeft className="h-5 w-5" />
              Voltar
            </Button>
            <Button
              type="submit"
              size="lg"
              className="bg-primary text-primary-foreground font-bold hover:bg-primary/90 hover:-translate-y-1 transition-all duration-300 shadow-lg shadow-green-500/20 gap-2 px-8"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Rocket className="h-5 w-5" />
              )}
              Finalizar e Disparar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
