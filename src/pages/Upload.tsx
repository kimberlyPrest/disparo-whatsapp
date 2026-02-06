import { useState, useRef } from 'react'
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
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function Upload() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (selectedFile: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ]
    // Also check extension as fallback
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const fileExtension =
      '.' + selectedFile.name.split('.').pop()?.toLowerCase()

    if (
      validTypes.includes(selectedFile.type) ||
      validExtensions.includes(fileExtension)
    ) {
      setFile(selectedFile)
      toast.success('Arquivo enviado com sucesso!', {
        description: `${selectedFile.name} pronto para processamento.`,
      })
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
    // Reset input so the same file can be selected again if needed
    e.target.value = ''
  }

  const handleSubmit = async () => {
    if (!file) return

    setIsLoading(true)
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsLoading(false)

    toast.success('Processamento iniciado!', {
      description: 'Sua planilha está sendo processada para envio.',
    })
    // Here you would typically navigate to a dashboard or reset
  }

  const removeFile = () => {
    setFile(null)
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl animate-fade-in-up">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Upload de Planilha
          </h1>
          <p className="text-muted-foreground">
            Carregue seus contatos para iniciar o disparo.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Instructions Column */}
          <div className="md:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estrutura do Arquivo</CardTitle>
                <CardDescription>
                  Seu arquivo deve conter as seguintes colunas exatas:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[80px]">Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead className="text-right">Mensagem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium text-xs">
                          João
                        </TableCell>
                        <TableCell className="text-xs">551199...</TableCell>
                        <TableCell className="text-right text-xs">
                          Olá...
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium text-xs">
                          Maria
                        </TableCell>
                        <TableCell className="text-xs">552198...</TableCell>
                        <TableCell className="text-right text-xs">
                          Promo...
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  * Formatos aceitos: .xlsx, .csv
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Upload Column */}
          <div className="md:col-span-3">
            <Card className="h-full flex flex-col">
              <CardContent className="flex-1 p-6 flex flex-col justify-center">
                {!file ? (
                  <div
                    className={cn(
                      'flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 transition-all duration-200 cursor-pointer h-64 bg-slate-50/50 hover:bg-slate-50',
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
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileInput}
                    />
                    <div
                      className={cn(
                        'p-4 rounded-full bg-slate-100 mb-4 transition-colors',
                        isDragging && 'bg-primary/10',
                      )}
                    >
                      <UploadIcon
                        className={cn(
                          'h-8 w-8 text-slate-400 transition-colors',
                          isDragging && 'text-primary animate-pulse',
                        )}
                      />
                    </div>
                    <p className="font-semibold text-lg text-foreground">
                      Clique para upload
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 text-center">
                      ou arraste e solte seu arquivo aqui
                    </p>
                    <p className="text-xs text-muted-foreground mt-4 px-3 py-1 bg-slate-100 rounded-full">
                      XLSX ou CSV
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 border rounded-xl p-8 bg-slate-50/50 relative group">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                      onClick={removeFile}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                    <div className="bg-primary/10 p-4 rounded-full mb-4">
                      <FileSpreadsheet className="h-10 w-10 text-primary" />
                    </div>
                    <p className="font-semibold text-lg text-foreground truncate max-w-[250px]">
                      {file.name}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                    <div className="flex items-center gap-2 mt-4 text-sm text-green-600 font-medium">
                      <FileCheck className="h-4 w-4" />
                      Arquivo válido
                    </div>
                  </div>
                )}
              </CardContent>

              <div className="p-6 pt-0 mt-auto">
                <Button
                  className="w-full h-12 text-base shadow-sm hover:shadow-md transition-all"
                  disabled={!file || isLoading}
                  onClick={handleSubmit}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Enviar Planilha'
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
