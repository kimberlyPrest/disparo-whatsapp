export interface ParsedContact {
  name: string
  phone: string
  message: string
}

export const parseCSV = async (file: File): Promise<ParsedContact[]> => {
  return new Promise((resolve, reject) => {
    // Check for Excel files to provide specific feedback
    if (file.name.match(/\.xlsx?$|\.xls$/i)) {
      reject(
        new Error(
          'Para processar arquivos Excel, por favor salve sua planilha como .CSV (Valores Separados por Vírgula) e tente novamente.',
        ),
      )
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        if (!text || text.trim().length === 0) {
          resolve([])
          return
        }

        // Robust CSV Parsing using State Machine
        // This handles:
        // 1. Quoted fields containing delimiters
        // 2. Quoted fields containing newlines
        // 3. Escaped quotes ("")
        const rows: string[][] = []
        let currentRow: string[] = []
        let currentCell = ''
        let inQuotes = false

        // 1. Detect delimiter based on the first line
        let firstLineEnd = text.indexOf('\n')
        if (firstLineEnd === -1) firstLineEnd = text.length
        const firstLine = text.substring(0, firstLineEnd)

        const semicolonCount = (firstLine.match(/;/g) || []).length
        const commaCount = (firstLine.match(/,/g) || []).length
        const delimiter = semicolonCount > commaCount ? ';' : ','

        // 2. Parse character by character
        for (let i = 0; i < text.length; i++) {
          const char = text[i]
          const nextChar = text[i + 1]

          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              // Handle escaped quote: "" -> "
              currentCell += '"'
              i++ // Skip the next quote
            } else {
              // Toggle quote mode
              inQuotes = !inQuotes
            }
          } else if (char === delimiter && !inQuotes) {
            // End of cell
            currentRow.push(currentCell)
            currentCell = ''
          } else if ((char === '\r' || char === '\n') && !inQuotes) {
            // End of row
            // Handle CRLF: if \r, check if next is \n and skip it
            if (char === '\r' && nextChar === '\n') {
              i++
            }

            currentRow.push(currentCell)
            rows.push(currentRow)

            currentRow = []
            currentCell = ''
          } else {
            currentCell += char
          }
        }

        // Add the last cell/row if not empty
        if (currentCell || currentRow.length > 0) {
          currentRow.push(currentCell)
          rows.push(currentRow)
        }

        // 3. Filter out empty rows
        const cleanRows = rows.filter(
          (r) => r.length > 0 && r.some((c) => c.trim() !== ''),
        )

        if (cleanRows.length < 2) {
          reject(
            new Error(
              'O arquivo deve conter cabeçalho e pelo menos um contato.',
            ),
          )
          return
        }

        // 4. Header Row Recognition & Exclusion
        // We take the first row as header and normalize it
        const headers = cleanRows[0].map((h) => h.trim().toLowerCase())

        // 5. Field Mapping
        // Identify indexes for required columns
        const nameIndex = headers.findIndex((h) => h === 'nome' || h === 'name')
        const phoneIndex = headers.findIndex(
          (h) =>
            h === 'telefone' ||
            h === 'phone' ||
            h === 'celular' ||
            h === 'whatsapp' ||
            h === 'mobile',
        )
        const messageIndex = headers.findIndex(
          (h) => h === 'mensagem' || h === 'message',
        )

        // Error Handling for missing columns
        if (nameIndex === -1 || phoneIndex === -1 || messageIndex === -1) {
          const missing = []
          if (nameIndex === -1) missing.push('nome')
          if (phoneIndex === -1) missing.push('telefone')
          if (messageIndex === -1) missing.push('mensagem')

          reject(
            new Error(
              `Colunas obrigatórias ausentes: ${missing.join(', ')}. Verifique o cabeçalho da planilha.`,
            ),
          )
          return
        }

        const contacts: ParsedContact[] = []

        // 6. Dynamic Row Parsing
        // Start from index 1 to exclude header
        for (let i = 1; i < cleanRows.length; i++) {
          const row = cleanRows[i]
          const name = row[nameIndex]?.trim()
          const phone = row[phoneIndex]?.trim()
          const message = row[messageIndex]?.trim()

          // Only add valid contacts (must have name OR phone, and message)
          if ((name || phone) && message !== undefined) {
            contacts.push({
              name: name || '',
              phone: phone || '',
              message: message || '',
            })
          }
        }

        if (contacts.length === 0) {
          reject(new Error('Nenhum contato válido encontrado para importação.'))
          return
        }

        resolve(contacts)
      } catch (error) {
        console.error(error)
        reject(new Error('Falha ao processar o arquivo. Verifique o formato.'))
      }
    }
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'))
    reader.readAsText(file)
  })
}
