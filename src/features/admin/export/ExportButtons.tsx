import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fetchExportData } from './exportData'
import { exportExcel } from './exportExcel'
import { exportCsv } from './exportCsv'
import { exportPdf } from './exportPdf'

interface ExportButtonsProps {
  quizId: string
  includeAborted: boolean
}

type ExportType = 'xlsx' | 'csv' | 'pdf'

export function ExportButtons({ quizId, includeAborted }: ExportButtonsProps) {
  const [loading, setLoading] = useState<ExportType | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (type: ExportType) => {
    setLoading(type)
    setError(null)
    try {
      const data = await fetchExportData(quizId, includeAborted)
      if (type === 'xlsx') exportExcel(data)
      else if (type === 'csv') exportCsv(data)
      else exportPdf(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={loading !== null}
          onClick={() => handleExport('xlsx')}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          {loading === 'xlsx' ? 'Bezig…' : 'Excel (.xlsx)'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={loading !== null}
          onClick={() => handleExport('csv')}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          {loading === 'csv' ? 'Bezig…' : 'CSV'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={loading !== null}
          onClick={() => handleExport('pdf')}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          {loading === 'pdf' ? 'Bezig…' : 'PDF'}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
