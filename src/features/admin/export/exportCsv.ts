import type { ExportData } from './exportData'

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('nl-BE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function csvField(value: string | number): string {
  const s = String(value)
  // Quotes als het veld een ; " of newline bevat
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function csvRow(fields: (string | number)[]): string {
  return fields.map(csvField).join(';')
}

export function exportCsv(data: ExportData): void {
  const questionHeaders = data.questions.map(
    (q) => `${q.position}. ${q.text_nl}`,
  )

  const lines: string[] = [
    csvRow(['Enquête-ID', 'Datum/tijd', 'Interviewer', 'Taal', 'Status', ...questionHeaders]),
  ]

  for (const row of data.rawRows) {
    lines.push(csvRow([
      row.id,
      formatDate(row.started_at),
      row.interviewer,
      row.language.toUpperCase(),
      row.status,
      ...data.questions.map((q) => row.answers[q.id] ?? ''),
    ]))
  }

  // UTF-8 BOM zodat Excel het correct opent
  const bom = '\uFEFF'
  const content = bom + lines.join('\r\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${data.quizTitle.replace(/[^a-zA-Z0-9]/g, '_')}_v${data.quizVersion}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
