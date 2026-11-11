import * as XLSX from 'xlsx'
import type { ExportData } from './exportData'

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('nl-BE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function exportExcel(data: ExportData): void {
  const wb = XLSX.utils.book_new()

  // ─── Tab 1: Samenvatting ──────────────────────────────────────────────────

  const summaryRows: (string | number)[][] = [
    [`${data.quizTitle} — v${data.quizVersion}`],
    [],
    ['Afgewerkt', data.completed],
    ['Afgebroken', data.aborted],
    ['Eerste enquête', formatDate(data.first_at)],
    ['Laatste enquête', formatDate(data.last_at)],
    [],
    ['Vraag', 'Antwoordoptie', 'Aantal', 'Percentage'],
  ]

  for (const q of data.results) {
    for (const o of q.options) {
      summaryRows.push([
        `${q.question_position}. ${q.question_text_nl}`,
        o.label_nl,
        o.count,
        `${o.percentage.toFixed(1)}%`,
      ])
    }
    summaryRows.push([]) // lege rij tussen vragen
  }

  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows)
  ws1['!cols'] = [{ wch: 50 }, { wch: 30 }, { wch: 10 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'Samenvatting')

  // ─── Tab 2: Ruwe data ─────────────────────────────────────────────────────

  const questionHeaders = data.questions.map(
    (q) => `${q.position}. ${q.text_nl}`,
  )
  const rawHeader = ['Enquête-ID', 'Datum/tijd', 'Interviewer', 'Taal', 'Status', ...questionHeaders]
  const rawRows: (string | number)[][] = [rawHeader]

  for (const row of data.rawRows) {
    rawRows.push([
      row.id,
      formatDate(row.started_at),
      row.interviewer,
      row.language.toUpperCase(),
      row.status,
      ...data.questions.map((q) => row.answers[q.id] ?? ''),
    ])
  }

  const ws2 = XLSX.utils.aoa_to_sheet(rawRows)
  ws2['!cols'] = [
    { wch: 38 }, { wch: 18 }, { wch: 16 }, { wch: 6 }, { wch: 12 },
    ...data.questions.map(() => ({ wch: 24 })),
  ]
  XLSX.utils.book_append_sheet(wb, ws2, 'Ruwe data')

  // ─── Tab 3: Interviewers ──────────────────────────────────────────────────

  const ivRows: (string | number)[][] = [
    ['Interviewer', 'Afgewerkt', 'Afgebroken'],
    ...data.ranking.map((r) => [r.name, r.completed, r.aborted]),
  ]
  const ws3 = XLSX.utils.aoa_to_sheet(ivRows)
  ws3['!cols'] = [{ wch: 24 }, { wch: 12 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, ws3, 'Interviewers')

  // ─── Downloaden ───────────────────────────────────────────────────────────

  const filename = `${data.quizTitle.replace(/[^a-zA-Z0-9]/g, '_')}_v${data.quizVersion}.xlsx`
  XLSX.writeFile(wb, filename)
}
