import { useState, useRef } from 'react'
import {
  FileSpreadsheet,
  Upload as UploadIcon,
  Code as CodeIcon,
  ArrowRight,
  Loader2,
  FileIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { parseCSV, ParsedContact } from '@/lib/csv'

interface Step1ImportProps {
  onNext: (contacts: ParsedContact[], filename: string) => void
  isProcessing: boolean
}

export function Step1Import({ onNext, isProcessing }: Step1ImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (selectedFile: File) => {
    const fileExtension =
      '.' + selectedFile.name.split('.').pop()?.toLowerCase()
    const validExtensions = ['.xlsx', '.xls', '.csv']

    if (validExtensions.includes(fileExtension)) {
      if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        // Show as selected but warn about processing
        setFile(selectedFile)
        toast.warning('Suporte a Excel em desenvolvimento', {
          description:
            'No momento, recomendamos o uso de arquivos .csv para melhor compatibilidade.',
        })
      } else {
        setFile(selectedFile)
        toast.success('Arquivo selecionado!')
      }
    } else {
      toast.error('Formato inválido', {
        description: 'Por favor, use arquivos .csv ou .xlsx',
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

  const handleProcess = async () => {
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Formato não suportado para processamento imediato', {
        description:
          'Por favor, converta para CSV ou aguarde a atualização do sistema.',
      })
      return
    }

    try {
      const contacts = await parseCSV(file)
      if (contacts.length === 0) {
        toast.warning('Arquivo vazio ou formato incorreto')
        return
      }
      onNext(contacts, file.name)
    } catch (error: any) {
      toast.error('Erro ao processar arquivo', {
        description: error.message,
      })
    }
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* File Dropzone */}
      <Card className="bg-white border-dashed border-2 shadow-sm hover:border-primary/50 transition-colors">
        <CardContent className="p-0">
          <div
            className={cn(
              'flex flex-col items-center justify-center min-h-[300px] p-8 cursor-pointer transition-all duration-300 group',
              isDragging ? 'bg-primary/5' : 'hover:bg-slate-50',
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
              accept=".csv,.xlsx,.xls"
              onChange={handleFileInput}
            />

            {!file ? (
              <>
                <div
                  className={cn(
                    'mb-6 p-4 rounded-full bg-slate-100 transition-all duration-300 group-hover:scale-110 group-hover:bg-[#13ec5b]/10',
                    isDragging && 'scale-110 bg-[#13ec5b]/10',
                  )}
                >
                  <FileSpreadsheet
                    className={cn(
                      'h-10 w-10 text-slate-400 transition-colors duration-300 group-hover:text-[#13ec5b]',
                      isDragging && 'text-[#13ec5b]',
                    )}
                  />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2 text-center">
                  Arraste e solte sua planilha aqui
                </h3>
                <p className="text-slate-500 mb-6">
                  ou{' '}
                  <span className="text-[#13ec5b] font-medium">
                    clique para buscar
                  </span>{' '}
                  no seu computador
                </p>
                <div className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-sm font-medium">
                  Suporta .CSV ou .XLSX
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center animate-fade-in-up">
                <div className="bg-[#13ec5b]/10 p-4 rounded-full mb-4">
                  <FileIcon className="h-10 w-10 text-[#13ec5b]" />
                </div>
                <p className="font-semibold text-lg text-slate-900 mb-1">
                  {file.name}
                </p>
                <p className="text-sm text-slate-500 mb-6">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                  }}
                  className="hover:text-destructive"
                >
                  Remover arquivo
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Format Reference & Action */}
      <div className="grid lg:grid-cols-3 gap-8 items-end">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-slate-600 font-semibold text-sm uppercase tracking-wider">
            <CodeIcon className="h-4 w-4" />
            <span>Formato obrigatório da planilha</span>
          </div>
          <Card className="bg-slate-50/50 border shadow-none">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-slate-200 hover:bg-transparent">
                    <TableHead className="text-xs font-bold text-slate-500 uppercase h-10 bg-slate-100/50">
                      Nome
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase h-10 bg-slate-100/50">
                      Telefone
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase h-10 bg-slate-100/50">
                      Mensagem
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableCell className="py-3 text-sm font-medium text-slate-900">
                      João
                    </TableCell>
                    <TableCell className="py-3 text-sm text-slate-600">
                      5511999999999
                    </TableCell>
                    <TableCell className="py-3 text-sm text-slate-600">
                      Olá, tudo bem?
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="text-xs text-slate-400">
            Certifique-se de que os cabeçalhos das colunas correspondam
            exatamente ao exemplo acima (nome, telefone, mensagem).
          </p>
        </div>

        <div className="flex justify-end lg:justify-end w-full">
          <Button
            size="lg"
            className="w-full lg:w-auto bg-[#13ec5b] hover:bg-[#0da540] text-slate-900 font-bold px-8 h-12 shadow-md shadow-green-500/10 transition-all duration-300 hover:-translate-y-1"
            disabled={!file || isProcessing}
            onClick={handleProcess}
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <>
                Enviar Planilha
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
