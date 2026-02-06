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
import { Trash2, Pencil, Send, AlertCircle } from 'lucide-react'
import { EditContactDialog } from './EditContactDialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
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
  const [isDeleting, setIsDeleting] = useState(false)

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

  const handleBulkSend = () => {
    if (selectedIds.length === 0) return
    toast.success('Iniciando envio em massa', {
      description: `Preparando envio para ${selectedIds.length} contatos selecionados.`,
    })
    // Implementation of actual sending would go here
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
            onClick={handleBulkSend}
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
              <TableHead className="min-w-[200px]">Mensagem</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
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
                  <TableCell
                    className="max-w-[300px] truncate"
                    title={contact.message}
                  >
                    {contact.message}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
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
    </div>
  )
}
