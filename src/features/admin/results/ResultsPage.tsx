import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, BarChart2, PieChart, RefreshCw } from 'lucide-react'
import {
  BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { calculateResults, type QuestionResult } from '@/lib/results'
import type { QuizResultRow } from '@/lib/supabase'
import { ExportButtons } from '../export/ExportButtons'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizMeta {
  id: string
  title: string
  version: number
  include_aborted: boolean
}

interface SummaryStats {
  completed: number
  aborted: number
  first_at: string | null
  last_at: string | null
  lang_nl: number
  lang_fr: number
  lang_en: number
}

interface InterviewerRank {
  first_name: string
  completed: number
  aborted: number
}

// ─── Kleuren voor grafieken ───────────────────────────────────────────────────

const CHART_COLORS = [
  '#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('nl-BE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── QuestionCard ─────────────────────────────────────────────────────────────

function QuestionCard({ question }: { question: QuestionResult }) {
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar')

  const chartData = question.options.map((o) => ({
    name: o.label_nl.length > 20 ? o.label_nl.slice(0, 18) + '…' : o.label_nl,
    fullName: o.label_nl,
    count: o.count,
    pct: o.percentage,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Vraag {question.question_position}
            </p>
            <CardTitle className="text-base font-semibold leading-snug">
              {question.question_text_nl}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              n = {question.total_n}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              size="sm"
              variant={chartType === 'bar' ? 'default' : 'ghost'}
              className="h-7 w-7 p-0"
              onClick={() => setChartType('bar')}
              title="Staafdiagram"
            >
              <BarChart2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant={chartType === 'pie' ? 'default' : 'ghost'}
              className="h-7 w-7 p-0"
              onClick={() => setChartType('pie')}
              title="Taartdiagram"
            >
              <PieChart className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Tabel */}
        <div className="mb-4 space-y-1.5">
          {question.options.map((o, i) => (
            <div key={o.option_id} className="flex items-center gap-3">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className="text-sm flex-1 text-foreground">{o.label_nl}</span>
              <span className="text-sm font-medium tabular-nums w-8 text-right">{o.count}</span>
              <span className="text-sm text-muted-foreground tabular-nums w-14 text-right">
                {o.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>

        {/* Grafiek */}
        {question.total_n > 0 && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value, _, props) => [`${value} (${props.payload.pct.toFixed(1)}%)`, props.payload.fullName]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                    <LabelList dataKey="count" position="top" style={{ fontSize: 11 }} />
                  </Bar>
                </BarChart>
              ) : (
                <RechartsPie>
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(props) => `${props.name} ${typeof props.pct === 'number' ? props.pct.toFixed(1) : 0}%`}
                    labelLine={false}
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </RechartsPie>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── InterviewerRanking ───────────────────────────────────────────────────────

function InterviewerRanking({ ranking }: { ranking: InterviewerRank[] }) {
  if (ranking.length === 0) return null

  const chartData = ranking.map((r) => ({
    name: r.first_name,
    Afgewerkt: r.completed,
    Afgebroken: r.aborted,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Interviewers</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="mb-4 space-y-1.5">
          {ranking.map((r, i) => (
            <div key={r.first_name} className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-5 shrink-0">{i + 1}.</span>
              <span className="text-sm flex-1">{r.first_name}</span>
              <span className="text-sm font-medium tabular-nums">{r.completed}</span>
              {r.aborted > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">({r.aborted} afgebr.)</span>
              )}
            </div>
          ))}
        </div>

        {ranking.length > 1 && (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="Afgewerkt" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── ResultsPage ──────────────────────────────────────────────────────────────

export function ResultsPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()

  const [meta, setMeta] = useState<QuizMeta | null>(null)
  const [summary, setSummary] = useState<SummaryStats | null>(null)
  const [results, setResults] = useState<QuestionResult[]>([])
  const [ranking, setRanking] = useState<InterviewerRank[]>([])
  const [includeAborted, setIncludeAborted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ─── Data ophalen ───────────────────────────────────────────────────────────

  const fetchData = useCallback(async (currentIncludeAborted: boolean) => {
    if (!quizId) return

    try {
      const [quizRes, interviewRes, resultsRes] = await Promise.all([
        supabase.from('quizzes').select('id, title, version, include_aborted').eq('id', quizId).single(),
        supabase.from('interviews').select('id, status, language, started_at, ended_at, interviewer_id').eq('quiz_id', quizId),
        supabase.rpc('quiz_results', { quiz_id: quizId, include_aborted: currentIncludeAborted }),
      ])

      if (quizRes.error) throw new Error(quizRes.error.message)
      if (interviewRes.error) throw new Error(interviewRes.error.message)
      if (resultsRes.error) throw new Error(resultsRes.error.message)

      setMeta(quizRes.data)

      // Samenvatting berekenen
      const interviews = interviewRes.data ?? []
      const completed = interviews.filter((i) => i.status === 'completed').length
      const aborted = interviews.filter((i) => i.status === 'aborted').length
      const dates = interviews.map((i) => i.started_at).sort()
      setSummary({
        completed,
        aborted,
        first_at: dates[0] ?? null,
        last_at: dates[dates.length - 1] ?? null,
        lang_nl: interviews.filter((i) => i.language === 'nl').length,
        lang_fr: interviews.filter((i) => i.language === 'fr').length,
        lang_en: interviews.filter((i) => i.language === 'en').length,
      })

      // Resultaten
      setResults(calculateResults(resultsRes.data as QuizResultRow[]))

      // Ranking: interviewer_id ophalen en koppelen aan naam
      const interviewerIds = [...new Set(interviews.map((i) => i.interviewer_id))]
      if (interviewerIds.length > 0) {
        const { data: interviewers } = await supabase
          .from('interviewers')
          .select('id, first_name')
          .in('id', interviewerIds)

        const nameMap = new Map((interviewers ?? []).map((iv) => [iv.id, iv.first_name]))

        const rankMap = new Map<string, { completed: number; aborted: number }>()
        for (const iv of interviews) {
          const existing = rankMap.get(iv.interviewer_id) ?? { completed: 0, aborted: 0 }
          if (iv.status === 'completed') existing.completed++
          else existing.aborted++
          rankMap.set(iv.interviewer_id, existing)
        }

        const rank: InterviewerRank[] = [...rankMap.entries()]
          .map(([id, stats]) => ({ first_name: nameMap.get(id) ?? id, ...stats }))
          .sort((a, b) => b.completed - a.completed)

        setRanking(rank)
      } else {
        setRanking([])
      }

      setLastRefreshed(new Date())
    } catch (err) {
      setError((err as Error).message)
    }
  }, [quizId])

  // ─── Initieel laden ─────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true)
    fetchData(includeAborted).finally(() => setLoading(false))
  }, [fetchData, includeAborted])

  // ─── Auto-refresh elke 30 s ─────────────────────────────────────────────────

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      void fetchData(includeAborted)
    }, 30_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchData, includeAborted])

  // ─── Toggle afgebroken + persisteren ────────────────────────────────────────

  const handleToggleAborted = async () => {
    if (!quizId) return
    const next = !includeAborted
    setIncludeAborted(next)
    await supabase.from('quizzes').update({ include_aborted: next }).eq('id', quizId)
  }

  // ─── Handmatig vernieuwen ────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData(includeAborted)
    setRefreshing(false)
  }

  // ─── Initialiseer include_aborted vanuit meta ────────────────────────────────

  useEffect(() => {
    if (meta) setIncludeAborted(meta.include_aborted)
  }, [meta?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">Resultaten laden…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => navigate('/admin/quizzes')}>Terug</Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <button
            onClick={() => navigate('/admin/quizzes')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Overzicht
          </button>
          <h1 className="text-xl font-semibold">{meta?.title}</h1>
          <p className="text-sm text-muted-foreground">v{meta?.version}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Kerncijfers */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{summary.completed}</p>
              <p className="text-xs text-muted-foreground">Afgewerkt</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{summary.aborted}</p>
              <p className="text-xs text-muted-foreground">Afgebroken</p>
            </CardContent>
          </Card>
          <Card className="col-span-2">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Eerste</p>
              <p className="text-sm font-medium">{formatDate(summary.first_at)}</p>
              <p className="text-xs text-muted-foreground mt-1">Laatste</p>
              <p className="text-sm font-medium">{formatDate(summary.last_at)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Taalverdeling */}
      {summary && (summary.lang_nl + summary.lang_fr + summary.lang_en) > 0 && (
        <Card>
          <CardContent className="p-4 flex gap-6">
            {summary.lang_nl > 0 && (
              <div className="text-center">
                <p className="text-lg font-bold">{summary.lang_nl}</p>
                <p className="text-xs text-muted-foreground">NL</p>
              </div>
            )}
            {summary.lang_fr > 0 && (
              <div className="text-center">
                <p className="text-lg font-bold">{summary.lang_fr}</p>
                <p className="text-xs text-muted-foreground">FR</p>
              </div>
            )}
            {summary.lang_en > 0 && (
              <div className="text-center">
                <p className="text-lg font-bold">{summary.lang_en}</p>
                <p className="text-xs text-muted-foreground">EN</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Toggle afgebroken */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Afgebroken enquêtes meetellen</p>
          <p className="text-xs text-muted-foreground">Telt ook gedeeltelijke antwoorden mee in de grafieken</p>
        </div>
        <button
          role="switch"
          aria-checked={includeAborted}
          onClick={handleToggleAborted}
          className={[
            'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors',
            includeAborted ? 'bg-primary' : 'bg-muted',
          ].join(' ')}
        >
          <span
            className={[
              'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
              includeAborted ? 'translate-x-5' : 'translate-x-0',
            ].join(' ')}
          />
        </button>
      </div>

      {/* Geen data */}
      {summary && summary.completed === 0 && summary.aborted === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nog geen enquêtes afgenomen voor deze vragenlijst.
          </CardContent>
        </Card>
      )}

      {/* Resultaten per vraag */}
      {results.map((q) => (
        <QuestionCard key={q.question_id} question={q} />
      ))}

      {/* Exporteren */}
      {(summary && (summary.completed > 0 || summary.aborted > 0)) && quizId && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">Exporteren</p>
            <ExportButtons quizId={quizId} includeAborted={includeAborted} />
          </CardContent>
        </Card>
      )}

      {/* Interviewer-ranglijst */}
      <InterviewerRanking ranking={ranking} />

      {/* Laatste verversing */}
      <p className="text-xs text-muted-foreground text-center">
        Vernieuwd om {lastRefreshed.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · elke 30 s automatisch
      </p>
    </div>
  )
}
