export interface ParsedContact {
  name: string
  phone: string
  message: string
}

export const parseCSV = async (file: File): Promise<ParsedContact[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        if (!text) {
          resolve([])
          return
        }

        // Split lines handling various line endings
        const lines = text
          .split(/\r\n|\n|\r/)
          .filter((line) => line.trim() !== '')

        if (lines.length < 2) {
          reject(
            new Error(
              'O arquivo deve conter cabeçalho e pelo menos um contato.',
            ),
          )
          return
        }

        const headerLine = lines[0]

        // Detect delimiter: comma or semicolon
        // We count occurrences in the header line to decide
        let delimiter = ','
        const semicolonCount = (headerLine.match(/;/g) || []).length
        const commaCount = (headerLine.match(/,/g) || []).length
        if (semicolonCount > commaCount) {
          delimiter = ';'
        }

        const headers = headerLine
          .split(delimiter)
          .map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''))

        // Find indices for required columns
        // Requirements say exactly: "nome", "telefone", "mensagem"
        const nameIndex = headers.indexOf('nome')
        const phoneIndex = headers.indexOf('telefone')
        const messageIndex = headers.indexOf('mensagem')

        // We also check for English fallbacks for better UX, but prioritize exact matches
        const finalNameIndex =
          nameIndex !== -1 ? nameIndex : headers.indexOf('name')
        const finalPhoneIndex =
          phoneIndex !== -1
            ? phoneIndex
            : headers.findIndex((h) => h === 'phone' || h === 'celular')
        const finalMessageIndex =
          messageIndex !== -1 ? messageIndex : headers.indexOf('message')

        if (
          finalNameIndex === -1 ||
          finalPhoneIndex === -1 ||
          finalMessageIndex === -1
        ) {
          reject(
            new Error(
              'Cabeçalho inválido. O arquivo deve conter exatamente as colunas: nome, telefone, mensagem.',
            ),
          )
          return
        }

        const contacts: ParsedContact[] = []

        // Start from 1 to skip header
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue

          const row: string[] = []
          let inQuotes = false
          let currentValue = ''

          // Parse CSV line character by character to handle quoted values containing delimiters
          for (let j = 0; j < line.length; j++) {
            const char = line[j]
            if (char === '"') {
              if (inQuotes && line[j + 1] === '"') {
                // Handle escaped quotes
                currentValue += '"'
                j++
              } else {
                inQuotes = !inQuotes
              }
            } else if (char === delimiter && !inQuotes) {
              row.push(currentValue)
              currentValue = ''
            } else {
              currentValue += char
            }
          }
          row.push(currentValue)

          // Clean up values (remove surrounding quotes)
          const cleanRow = row.map((val) =>
            val.trim().replace(/^"|"$/g, '').replace(/""/g, '"'),
          )

          const maxIndex = Math.max(
            finalNameIndex,
            finalPhoneIndex,
            finalMessageIndex,
          )

          // Only add if we have enough columns for the data
          if (cleanRow.length > maxIndex) {
            const name = cleanRow[finalNameIndex]
            const phone = cleanRow[finalPhoneIndex]
            const message = cleanRow[finalMessageIndex]

            // Only add if essential data is present
            if (name || phone) {
              contacts.push({
                name: name || '',
                phone: phone || '',
                message: message || '',
              })
            }
          }
        }

        if (contacts.length === 0) {
          reject(new Error('Nenhum contato válido encontrado.'))
          return
        }

        resolve(contacts)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'))
    reader.readAsText(file)
  })
}
