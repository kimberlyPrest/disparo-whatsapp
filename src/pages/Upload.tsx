import { useState, useRef, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Upload as UploadIcon,
  FileSpreadsheet,
  X,
  Loader2,
  FileCheck,
  LogOut,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { Navigate } from 'react-router-dom'
import { parseCSV } from '@/lib/csv'
import { contactsService, Contact } from '@/services/contacts'
import { ContactsTable } from '@/components/contacts/ContactsTable'

export default function Upload() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoadingContacts, setIsLoadingContacts] = useState(true)
  const [contacts, setContacts] = useState<Contact[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      fetchContacts()
    }
  }, [user])

  const fetchContacts = async () => {
    setIsLoadingContacts(true)
    try {
      const data = await contactsService.getAll()
      setContacts(data)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar contatos')
    } finally {
      setIsLoadingContacts(false)
    }
  }

  const validateFile = (selectedFile: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ]
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const fileExtension =
      '.' + selectedFile.name.split('.').pop()?.toLowerCase()

    if (
      validTypes.includes(selectedFile.type) ||
      validExtensions.includes(fileExtension)
    ) {
      if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        toast.warning('Suporte limitado a CSV', {
          description:
            'No momento, recomendamos o uso de arquivos .csv para processamento direto.',
        })
        // Still set file, but processing might fail if we don't have xlsx parser
        setFile(selectedFile)
      } else {
        setFile(selectedFile)
        toast.success('Arquivo selecionado!', {
          description: `${selectedFile.name} pronto para processamento.`,
        })
      }
    } else {
      toast.error('Formato de arquivo inválido', {
        description: 'Por favor, use arquivos .xlsx ou .csv.',
      })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      validateFile(droppedFile)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      validateFile(selectedFile)
    }
    e.target.value = ''
  }

  const handleProcessFile = async () => {
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Erro de Processamento', {
        description:
          'Por favor, converta seu arquivo Excel para CSV antes de enviar.',
      })
      return
    }

    setIsProcessing(true)
    try {
      const parsedContacts = await parseCSV(file)
      if (parsedContacts.length === 0) {
        toast.warning('Arquivo vazio ou formato incorreto')
        return
      }

      toast.info(`Processando ${parsedContacts.length} contatos...`)

      await contactsService.createBulk(parsedContacts)

      toast.success('Sucesso!', {
        description: `${parsedContacts.length} contatos importados com sucesso.`,
      })

      setFile(null)
      fetchContacts()
    } catch (error: any) {
      console.error(error)
      toast.error('Erro ao processar arquivo', {
        description: error.message || 'Verifique o formato das colunas.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const removeFile = () => {
    setFile(null)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gerenciador de Contatos
          </h1>
          <p className="text-muted-foreground">
            Importe e gerencie sua lista de disparos.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        {/* Upload Section */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload de Arquivo</CardTitle>
              <CardDescription>Importe seus contatos via CSV.</CardDescription>
            </CardHeader>
            <CardContent>
              {!file ? (
                <div
                  className={cn(
                    'flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 transition-all duration-200 cursor-pointer h-48 bg-slate-50/50 hover:bg-slate-50',
                    isDragging
                      ? 'border-primary bg-primary/5 scale-[1.02]'
                      : 'border-slate-200',
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    accept=".csv"
                    onChange={handleFileInput}
                  />
                  <div
                    className={cn(
                      'p-3 rounded-full bg-slate-100 mb-3 transition-colors',
                      isDragging && 'bg-primary/10',
                    )}
                  >
                    <UploadIcon
                      className={cn(
                        'h-6 w-6 text-slate-400 transition-colors',
                        isDragging && 'text-primary animate-pulse',
                      )}
                    />
                  </div>
                  <p className="font-semibold text-sm text-foreground">
                    Clique ou arraste CSV
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 border rounded-xl p-6 bg-slate-50/50 relative group">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive transition-colors"
                    onClick={removeFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="bg-primary/10 p-3 rounded-full mb-3">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                  </div>
                  <p className="font-semibold text-sm text-foreground truncate max-w-[200px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}

              <Button
                className="w-full mt-4"
                disabled={!file || isProcessing}
                onClick={handleProcessFile}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Processar Arquivo'
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Estrutura Exigida (CSV)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="h-8 text-xs">Nome</TableHead>
                      <TableHead className="h-8 text-xs">Telefone</TableHead>
                      <TableHead className="h-8 text-xs text-right">
                        Mensagem
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="py-2 text-xs font-medium">
                        Ana
                      </TableCell>
                      <TableCell className="py-2 text-xs">5511...</TableCell>
                      <TableCell className="py-2 text-xs text-right">
                        Olá...
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table Section */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Contatos Importados</CardTitle>
              <CardDescription>
                Revise e selecione os contatos para disparo.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {isLoadingContacts ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ContactsTable contacts={contacts} onRefresh={fetchContacts} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
