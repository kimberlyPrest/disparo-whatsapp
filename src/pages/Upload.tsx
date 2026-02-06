import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { campaignsService } from '@/services/campaigns'
import { Step1Import } from '@/components/campaigns/Step1Import'
import { Step2Review } from '@/components/campaigns/Step2Review'
import {
  Step3Config,
  Step3ConfigValues,
} from '@/components/campaigns/Step3Config'

export default function Upload() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null)

  // Handlers
  const handleStep1Next = async (parsedContacts: any[], filename: string) => {
    setIsProcessing(true)
    try {
      // Create campaign draft immediately
      const defaultName = `Campanha ${filename} - ${new Date().toLocaleDateString()}`

      const newCampaign = await campaignsService.createDraft(
        defaultName,
        parsedContacts,
      )
      setCampaignId(newCampaign.id)

      // Move to Step 2: Review
      setCurrentStep(2)
      toast.success('Rascunho criado! Revise os contatos.')
    } catch (error: any) {
      console.error(error)
      toast.error('Erro ao processar', { description: error.message })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStep2Next = () => {
    setCurrentStep(3)
  }

  const handleStep3Finish = async (values: Step3ConfigValues) => {
    if (!campaignId) return
    setIsProcessing(true)
    try {
      let scheduledAt = new Date().toISOString()

      if (
        values.scheduleType === 'scheduled' &&
        values.scheduledDate &&
        values.scheduledTime
      ) {
        const [hours, minutes] = values.scheduledTime.split(':').map(Number)
        const date = new Date(values.scheduledDate)
        date.setHours(hours, minutes, 0, 0)
        scheduledAt = date.toISOString()
      } else {
        // Immediate - ensure it's "now"
        scheduledAt = new Date().toISOString()
      }

      // Prepare config JSON
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
          pause_at: '18:00', // Default hardcoded for now or we could add inputs if needed
          resume_at: '08:00',
        },
      }

      // Update campaign in DB
      await campaignsService.update(campaignId, {
        name: values.name,
        config: config as any,
        scheduled_at: scheduledAt,
        status: values.scheduleType === 'scheduled' ? 'scheduled' : 'active',
      })

      // If immediate, execute post-update actions like resuming and triggering queue
      if (values.scheduleType === 'immediate') {
        await campaignsService.resume(campaignId)
        try {
          await campaignsService.triggerQueue(campaignId)
        } catch (e) {
          console.warn('Queue trigger warning:', e)
        }
      }

      toast.success('Campanha iniciada com sucesso!')
      navigate(`/disparos/${campaignId}`)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao salvar e iniciar campanha')
    } finally {
      setIsProcessing(false)
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
    navigate('/login')
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl bg-[#f6f8f6] dark:bg-[#102216] min-h-[calc(100vh-4rem)]">
      {/* Header - Only show for Step 1, Step 2 and 3 have their own headers or layout needs */}
      {currentStep === 1 && (
        <div className="mb-8 space-y-1">
          <span className="text-[#13ec5b] font-medium text-sm tracking-wide uppercase">
            Novo Disparo
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Importar Lista de Contatos
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Passo 1 de 3: Carregue sua base de clientes para começar.
          </p>
        </div>
      )}

      {/* Content */}
      <div className="w-full">
        {currentStep === 1 && (
          <Step1Import onNext={handleStep1Next} isProcessing={isProcessing} />
        )}

        {currentStep === 2 && campaignId && (
          <Step2Review
            campaignId={campaignId}
            onBack={() => setCurrentStep(1)}
            onNext={handleStep2Next}
          />
        )}

        {currentStep === 3 && campaignId && (
          <Step3Config
            campaignId={campaignId}
            onBack={() => setCurrentStep(2)}
            onFinish={handleStep3Finish}
          />
        )}
      </div>
    </div>
  )
}
