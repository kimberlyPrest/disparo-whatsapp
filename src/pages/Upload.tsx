import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { campaignsService } from '@/services/campaigns'
import { Step1Import } from '@/components/campaigns/Step1Import'
import { ScheduleConfig } from '@/lib/campaign-utils'
import { CampaignConfig } from '@/components/campaigns/CampaignConfig'
import { CampaignConfirmationStep } from '@/components/campaigns/CampaignConfirmationStep'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

export default function Upload() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [campaignName, setCampaignName] = useState('')
  const [contacts, setContacts] = useState<any[]>([])

  // Config state for Step 2
  const [config, setConfig] = useState<ScheduleConfig>({
    minInterval: 30,
    maxInterval: 60,
    useBatching: false,
    businessHoursStrategy: 'ignore',
    startTime: new Date(),
  })

  // Handlers
  const handleStep1Next = async (parsedContacts: any[], filename: string) => {
    setIsProcessing(true)
    try {
      // Set default campaign name based on file + date
      const defaultName = `Campanha ${filename} - ${new Date().toLocaleDateString()}`
      setCampaignName(defaultName)
      setContacts(parsedContacts)

      // We don't save to DB yet, we wait for confirmation in step 3 or explicit save?
      // User story says: "Upon clicking 'Enviar Planilha', the system must ... saving contacts associated with a new campaign draft"

      const newCampaign = await campaignsService.createDraft(
        defaultName,
        parsedContacts,
      )
      setCampaignId(newCampaign.id)
      setCurrentStep(2)
      toast.success('Rascunho criado com sucesso!')
    } catch (error: any) {
      console.error(error)
      toast.error('Erro ao processar', { description: error.message })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStep2Next = async () => {
    // Update campaign config in DB
    if (!campaignId) return
    setIsProcessing(true)
    try {
      await campaignsService.update(campaignId, {
        name: campaignName,
        config: config as any, // Cast for simplicity in this implementation
        scheduled_at: config.startTime.toISOString(),
      })
      setCurrentStep(3)
    } catch (error) {
      toast.error('Erro ao salvar configurações')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStep3Confirm = async () => {
    if (!campaignId) return
    setIsProcessing(true)
    try {
      // Activate campaign
      await campaignsService.resume(campaignId)
      // Trigger queue
      try {
        await campaignsService.triggerQueue(campaignId)
      } catch (e) {
        console.warn('Queue trigger warning:', e)
      }

      toast.success('Campanha iniciada com sucesso!')
      navigate(`/disparos/${campaignId}`)
    } catch (error) {
      toast.error('Erro ao iniciar campanha')
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
    <div className="container mx-auto px-4 py-8 max-w-5xl bg-[#f6f8f6] min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="mb-8 space-y-1">
        <span className="text-[#13ec5b] font-medium text-sm tracking-wide uppercase">
          Novo Disparo
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
          {currentStep === 1
            ? 'Importar Lista de Contatos'
            : currentStep === 2
              ? 'Configurar Disparo'
              : 'Confirmar e Disparar'}
        </h1>
        <p className="text-slate-500 text-lg">
          Passo {currentStep} de 3:{' '}
          {currentStep === 1
            ? 'Carregue sua base de clientes para começar.'
            : currentStep === 2
              ? 'Defina as regras de envio.'
              : 'Revise os detalhes antes de enviar.'}
        </p>
      </div>

      {/* Content */}
      <div className="w-full">
        {currentStep === 1 && (
          <Step1Import onNext={handleStep1Next} isProcessing={isProcessing} />
        )}

        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in-up">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes da Campanha</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Campanha</Label>
                  <Input
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.useBatching}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({ ...prev, useBatching: checked }))
                    }
                  />
                  <Label>Ativar envio em lotes (pausas automáticas)</Label>
                </div>
                {/* Basic config UI for demonstration - Reuse CampaignConfig for preview */}
                <div className="pt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Configuração Atual (Padrão):
                  </p>
                  <CampaignConfig
                    config={config}
                    scheduledAt={config.startTime.toISOString()}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Voltar
              </Button>
              <Button onClick={handleStep2Next} disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                ) : null}
                Continuar para Confirmação
              </Button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="animate-fade-in-up">
            <Card className="mb-6">
              <CardContent className="pt-6">
                <CampaignConfirmationStep
                  schedule={[]} // We could calculate preview here
                  contacts={contacts.slice(0, 5)} // Show first 5 as preview
                  config={config}
                  isLoading={isProcessing}
                  onBack={() => setCurrentStep(2)}
                  onConfirm={handleStep3Confirm}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
