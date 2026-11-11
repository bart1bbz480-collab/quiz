import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ExportData } from './exportData'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('nl-BE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function exportPdf(data: ExportData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 14
  const pageW = doc.internal.pageSize.getWidth()

  // ─── Titel ────────────────────────────────────────────────────────────────

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(data.quizTitle, margin, 20)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Versie ${data.quizVersion}  ·  ${new Date().toLocaleDateString('nl-BE')}`, margin, 27)
  doc.setTextColor(0)

  // ─── Kerncijfers ──────────────────────────────────────────────────────────

  let y = 36

  autoTable(doc, {
    startY: y,
    head: [['Afgewerkt', 'Afgebroken', 'Eerste enquête', 'Laatste enquête']],
    body: [[
      String(data.completed),
      String(data.aborted),
      formatDate(data.first_at),
      formatDate(data.last_at),
    ]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: margin, right: margin },
  })

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  // ─── Resultaten per vraag ─────────────────────────────────────────────────

  for (const q of data.results) {
    // Nieuwe pagina als er te weinig ruimte is
    if (y > 240) {
      doc.addPage()
      y = 16
    }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`${q.question_position}. ${q.question_text_nl}`, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text(`n = ${q.total_n}`, margin, y + 5)
    doc.setTextColor(0)

    autoTable(doc, {
      startY: y + 8,
      head: [['Antwoordoptie', 'Aantal', 'Percentage']],
      body: q.options.map((o) => [o.label_nl, String(o.count), `${o.percentage.toFixed(1)}%`]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [71, 85, 105] },
      columnStyles: {
        1: { halign: 'right', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 24 },
      },
      margin: { left: margin, right: margin },
    })

    // Simpele staafvisualisatie als tekst (breedte proportioneel aan %)
    const afterTable = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3
    const barMaxW = pageW - margin * 2 - 50
    let barY = afterTable

    if (q.total_n > 0) {
      const maxPct = Math.max(...q.options.map((o) => o.percentage))
      for (const o of q.options) {
        const barW = maxPct > 0 ? (o.percentage / maxPct) * barMaxW : 0
        doc.setFillColor(37, 99, 235)
        doc.rect(margin, barY, barW, 4, 'F')
        doc.setFontSize(8)
        doc.setTextColor(60)
        doc.text(`${o.percentage.toFixed(1)}%`, margin + barW + 2, barY + 3.5)
        doc.setTextColor(0)
        barY += 7
      }
    }

    y = barY + 6
  }

  // ─── Interviewer-ranglijst ────────────────────────────────────────────────

  if (data.ranking.length > 0) {
    if (y > 220) {
      doc.addPage()
      y = 16
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Interviewers', margin, y)
    doc.setFont('helvetica', 'normal')

    autoTable(doc, {
      startY: y + 5,
      head: [['Interviewer', 'Afgewerkt', 'Afgebroken']],
      body: data.ranking.map((r) => [r.name, String(r.completed), String(r.aborted)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [71, 85, 105] },
      columnStyles: {
        1: { halign: 'right', cellWidth: 24 },
        2: { halign: 'right', cellWidth: 24 },
      },
      margin: { left: margin, right: margin },
    })
  }

  // ─── Downloaden ───────────────────────────────────────────────────────────

  const filename = `${data.quizTitle.replace(/[^a-zA-Z0-9]/g, '_')}_v${data.quizVersion}.pdf`
  doc.save(filename)
}
