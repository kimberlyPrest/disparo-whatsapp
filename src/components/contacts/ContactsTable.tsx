import { useState } from 'react'
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
import { Contact, contactsService } from '@/services/contacts'
import { Trash2, Pencil, Send, AlertCircle, Loader2 } from 'lucide-react'
import { EditContactDialog } from './EditContactDialog'
import { BulkSendModal } from '@/components/campaigns/BulkSendModal'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
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

interface ContactsTableProps {
  contacts: Contact[]
  onRefresh: () => void
}

export function ContactsTable({ contacts, onRefresh }: ContactsTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isBulkSendModalOpen, setIsBulkSendModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sendingIds, setSendingIds] = useState<string[]>([])
  const [sentTimestamps, setSentTimestamps] = useState<number[]>([])

  const toggleSelectAll = () => {
    if (selectedIds.length === contacts.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(contacts.map((c) => c.id))
    }
  }

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await contactsService.delete(id)
      toast.success('Contato removido')
      if (selectedIds.includes(id)) {
        setSelectedIds(selectedIds.filter((item) => item !== id))
      }
      onRefresh()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao remover contato')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setIsDeleting(true)
    try {
      await contactsService.deleteBulk(selectedIds)
      toast.success(`${selectedIds.length} contatos removidos`)
      setSelectedIds([])
      onRefresh()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao remover contatos')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkSendClick = () => {
    if (selectedIds.length === 0) {
      toast.warning('Selecione pelo menos um contato para enviar mensagens.')
      return
    }
    setIsBulkSendModalOpen(true)
  }

  const handleSendOne = async (contact: Contact) => {
    if (sendingIds.includes(contact.id)) return

    // Rate Limit Check
    const now = Date.now()
    const timeWindow = 30000 // 30 seconds
    const threshold = 5

    // Filter keeps only recent timestamps from the current state
    const recentSends = sentTimestamps.filter((t) => now - t < timeWindow)

    if (recentSends.length >= threshold) {
      toast.warning(
        "Cuidado! Envios rápidos podem derrubar seu WhatsApp. Aguarde alguns segundos ou use 'Enviar em Massa'",
        {
          duration: 5000,
        },
      )
    }

    setSendingIds((prev) => [...prev, contact.id])
    try {
      await contactsService.sendWhatsappMessage(contact)
      await contactsService.update(contact.id, { status: 'enviado' })

      // Record successful send timestamp
      setSentTimestamps((prev) => {
        const currentTime = Date.now()
        // Keep only timestamps within the window + current one
        return [
          ...prev.filter((t) => currentTime - t < timeWindow),
          currentTime,
        ]
      })

      toast.success(`Mensagem enviada para ${contact.name}`)
      onRefresh()
    } catch (error) {
      console.error(error)
      toast.error(`Erro ao enviar para ${contact.name}`)
      try {
        await contactsService.update(contact.id, { status: 'falha' })
        onRefresh()
      } catch (e) {
        console.error('Failed to update status', e)
      }
    } finally {
      setSendingIds((prev) => prev.filter((id) => id !== contact.id))
    }
  }

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || 'pending'
    switch (normalizedStatus) {
      case 'enviado':
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            Enviado
          </Badge>
        )
      case 'falha':
        return <Badge variant="destructive">Falha</Badge>
      case 'pending':
      case 'pendente':
        return <Badge variant="secondary">Pendente</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-muted/30 p-4 rounded-lg border">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-medium">
            {selectedIds.length} de {contacts.length} selecionados
          </span>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={selectedIds.length === 0 || isDeleting}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Excluir todos
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente{' '}
                  {selectedIds.length} contatos selecionados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDelete}>
                  Sim, excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            variant="default"
            size="sm"
            onClick={handleBulkSendClick}
            disabled={selectedIds.length === 0}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Enviar em Massa
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={
                    contacts.length > 0 &&
                    selectedIds.length === contacts.length
                  }
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="min-w-[200px]">Mensagem</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="h-6 w-6 opacity-50" />
                    <p>
                      Nenhum contato encontrado. Faça upload de uma planilha.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow
                  key={contact.id}
                  data-state={
                    selectedIds.includes(contact.id) ? 'selected' : undefined
                  }
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(contact.id)}
                      onCheckedChange={() => toggleSelectOne(contact.id)}
                      aria-label={`Select ${contact.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>{contact.phone}</TableCell>
                  <TableCell>{getStatusBadge(contact.status)}</TableCell>
                  <TableCell
                    className="max-w-[300px] truncate"
                    title={contact.message}
                  >
                    {contact.message}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleSendOne(contact)}
                        disabled={sendingIds.includes(contact.id)}
                        title="Enviar mensagem"
                      >
                        {sendingIds.includes(contact.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <Send className="h-4 w-4 text-blue-500 hover:text-blue-700" />
                        )}
                        <span className="sr-only">Enviar</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingContact(contact)
                          setIsEditDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(contact.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        <span className="sr-only">Excluir</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EditContactDialog
        contact={editingContact}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={onRefresh}
      />

      <BulkSendModal
        open={isBulkSendModalOpen}
        onOpenChange={setIsBulkSendModalOpen}
        selectedContactIds={selectedIds}
        onSuccess={() => {
          setSelectedIds([]) // Clear selection after creating campaign
          onRefresh() // Refresh list if needed (though status update happens via campaigns not contacts usually, but good to refresh)
        }}
      />
    </div>
  )
}
