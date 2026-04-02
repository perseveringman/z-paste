/**
 * Minimal RFC 4180-compliant CSV parser.
 * Handles quoted fields, embedded commas, newlines inside quotes, and escaped quotes ("").
 */
export function parseCSV(raw: string): string[][] {
  const rows: string[][] = []
  let i = 0
  const len = raw.length

  while (i < len) {
    const row: string[] = []
    while (i < len) {
      let field: string
      if (raw[i] === '"') {
        // Quoted field
        i++ // skip opening quote
        let value = ''
        while (i < len) {
          if (raw[i] === '"') {
            if (i + 1 < len && raw[i + 1] === '"') {
              value += '"'
              i += 2
            } else {
              i++ // skip closing quote
              break
            }
          } else {
            value += raw[i]
            i++
          }
        }
        field = value
      } else {
        // Unquoted field
        const start = i
        while (i < len && raw[i] !== ',' && raw[i] !== '\n' && raw[i] !== '\r') {
          i++
        }
        field = raw.substring(start, i)
      }

      row.push(field)

      if (i < len && raw[i] === ',') {
        i++ // skip comma
        continue
      }
      // End of row
      if (i < len && raw[i] === '\r') i++
      if (i < len && raw[i] === '\n') i++
      break
    }

    // Skip completely empty rows (trailing newlines)
    if (row.length === 1 && row[0] === '' && i >= len) break
    rows.push(row)
  }

  return rows
}
