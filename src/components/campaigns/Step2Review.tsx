import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Trash2,
  Send,
  Pencil,
  ArrowLeft,
  Users,
  Loader2,
  Trash,
} from 'lucide-react'
import { campaignsService, CampaignMessage } from '@/services/campaigns'
import { contactsService, Contact } from '@/services/contacts'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { EditContactDialog } from '@/components/contacts/EditContactDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Step2ReviewProps {
  campaignId: string
  onBack: () => void
  onNext: () => void
}

export function Step2Review({ campaignId, onBack, onNext }: Step2ReviewProps) {
  const [messages, setMessages] = useState<CampaignMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  // Edit Dialog State
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  useEffect(() => {
    fetchMessages()
  }, [campaignId])

  const fetchMessages = async () => {
    try {
      setIsLoading(true)
      const data = await campaignsService.getMessages(campaignId)
      setMessages(data)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar contatos')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === messages.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(messages.map((m) => m.id))
    }
  }

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleDelete = async (messageId: string) => {
    try {
      await campaignsService.deleteMessage(messageId)
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
      setSelectedIds((prev) => prev.filter((id) => id !== messageId))
      toast.success('Contato removido da campanha')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao remover contato')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setIsDeleting(true)
    try {
      await campaignsService.deleteMessagesBulk(selectedIds)
      setMessages((prev) => prev.filter((m) => !selectedIds.includes(m.id)))
      setSelectedIds([])
      toast.success(`${selectedIds.length} contatos removidos`)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao remover contatos')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditClick = (message: CampaignMessage) => {
    // Construct a Contact object from the joined data to pass to EditContactDialog
    if (message.contacts) {
      const contact: Contact = {
        id: message.contact_id,
        name: message.contacts.name,
        phone: message.contacts.phone,
        message: (message.contacts as any).message || '',
        created_at: '',
        user_id: '',
        status: 'pendente',
      }
      setEditingContact(contact)
      setIsEditDialogOpen(true)
    }
  }

  const handleSendOne = async (message: CampaignMessage) => {
    if (!message.contacts) return

    // Simulate send or actual send? Step 2 is Review.
    // User story: "hoverable actions (individual Send, Edit, and Delete)"
    // We can use contactsService to send immediately.

    try {
      // Re-construct minimal contact for sending
      const contact: Contact = {
        id: message.contact_id,
        name: message.contacts.name,
        phone: message.contacts.phone,
        message: (message.contacts as any).message || '',
        created_at: '',
        user_id: '',
        status: 'pendente',
      }

      await contactsService.sendWhatsappMessage(contact)
      toast.success(`Mensagem enviada para ${contact.name}`)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao enviar mensagem')
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <div className="space-y-6 animate-fade-in-up font-noto">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/upload"
              onClick={(e) => {
                e.preventDefault()
                onBack()
              }}
            >
              Novo Disparo
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-primary font-medium">
              Revisão
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-manrope font-bold text-foreground">
          Revisar Contatos Importados
        </h1>
        <p className="text-muted-foreground text-lg">
          Passo 2 de 3: Confirme os dados da lista antes de prosseguir com o
          envio.
        </p>
      </div>

      {/* Table Container */}
      <Card className="border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-4 bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold text-foreground">
              {messages.length} contatos carregados
            </span>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-2 group transition-all"
                disabled={messages.length === 0 || isDeleting}
              >
                <Trash className="h-5 w-5 transition-transform group-hover:scale-110" />
                Excluir todos
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir todos os contatos?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação removerá todos os contatos desta campanha. Você terá
                  que importar a planilha novamente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => setSelectedIds(messages.map((m) => m.id))} // Select all internally just in case handleBulkDelete uses it
                  className="bg-destructive hover:bg-destructive/90"
                >
                  <div onClick={handleBulkDelete}>Sim, excluir tudo</div>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Table */}
        <div className="relative">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-subtle">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        messages.length > 0 &&
                        selectedIds.length === messages.length
                      }
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Nome do Cliente</TableHead>
                  <TableHead>Telefone do Cliente</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="h-8 w-24 ml-auto rounded bg-muted animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : messages.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-32 text-center text-muted-foreground"
                    >
                      Nenhum contato encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  messages.map((message) => (
                    <TableRow
                      key={message.id}
                      className="group transition-colors hover:bg-muted/30"
                      data-state={
                        selectedIds.includes(message.id)
                          ? 'selected'
                          : undefined
                      }
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(message.id)}
                          onCheckedChange={() => toggleSelectOne(message.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-border">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                              {getInitials(message.contacts?.name || '?')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">
                            {message.contacts?.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-muted-foreground">
                          {message.contacts?.phone}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-20 group-hover:opacity-100 transition-opacity duration-200">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSendOne(message)}
                            className="hover:text-primary hover:bg-primary/10"
                            title="Enviar agora"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(message)}
                            className="hover:text-blue-500 hover:bg-blue-50"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(message.id)}
                            className="hover:text-red-500 hover:bg-red-50"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </Card>

      {/* Selected Action Bar (Optional but good UX) */}
      {selectedIds.length > 0 && (
        <div className="bg-foreground text-background px-4 py-2 rounded-lg flex justify-between items-center animate-fade-in-up shadow-lg">
          <span className="text-sm font-medium">
            {selectedIds.length} selecionados
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="text-red-400 hover:text-red-300 hover:bg-white/10"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Excluir Selecionados'
            )}
          </Button>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 pt-4">
        <Button
          variant="ghost"
          size="lg"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground gap-2"
        >
          <ArrowLeft className="h-5 w-5" />
          Voltar para Upload
        </Button>
        <Button
          onClick={onNext}
          size="lg"
          className="bg-[#13ec5b] text-foreground font-bold hover:bg-[#13ec5b]/90 hover:-translate-y-1 transition-all duration-300 shadow-lg shadow-green-500/20 gap-2 px-8"
          disabled={messages.length === 0}
        >
          Enviar em massa
          <Send className="h-5 w-5" />
        </Button>
      </div>

      <EditContactDialog
        contact={editingContact}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={fetchMessages}
      />
    </div>
  )
}
