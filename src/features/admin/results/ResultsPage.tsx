import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, BarChart2, Check, PieChart, Pencil, RefreshCw, Smartphone } from 'lucide-react'
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

interface InterviewRow {
  id: string
  status: string
  language: string
  started_at: string
  ended_at: string
  device_id: string | null
  session_id: number | null
}

interface DayStat {
  label: string   // "DD/MM"
  count: number
}

interface DeviceStat {
  device_id: string | null
  session_id: number
  completed: number
  aborted: number
  started_at: string | null
}

function buildTimeline(interviews: InterviewRow[]): DayStat[] {
  const counts: Record<string, number> = {}
  for (const i of interviews) {
    if (i.status !== 'completed') continue
    const sortKey = i.started_at.slice(0, 10)
    if (!counts[sortKey]) counts[sortKey] = 0
    counts[sortKey]++
  }
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iso, count]) => {
      const d = new Date(iso)
      return {
        label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        count,
      }
    })
}

function buildDeviceStats(interviews: InterviewRow[]): DeviceStat[] {
  const map = new Map<string, DeviceStat>()
  for (const i of interviews) {
    const did = i.device_id ?? null
    const sid = i.session_id ?? 1
    const key = `${did ?? '__anon__'}__${sid}`
    if (!map.has(key)) {
      map.set(key, { device_id: did, session_id: sid, completed: 0, aborted: 0, started_at: i.started_at })
    }
    const s = map.get(key)!
    if (i.status === 'completed') s.completed++
    else s.aborted++
    if (s.started_at === null || i.started_at < s.started_at) s.started_at = i.started_at
  }
  return [...map.values()].sort((a, b) => {
    const da = a.device_id ?? ''
    const db = b.device_id ?? ''
    if (da !== db) return da.localeCompare(db)
    return a.session_id - b.session_id
  })
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
                    label={(props) => {
                      const entry = chartData[props.index as number]
                      return entry ? `${entry.name} ${entry.pct.toFixed(1)}%` : ''
                    }}
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


// ─── ResultsPage ──────────────────────────────────────────────────────────────

export function ResultsPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()

  const [meta, setMeta] = useState<QuizMeta | null>(null)
  const [summary, setSummary] = useState<SummaryStats | null>(null)
  const [results, setResults] = useState<QuestionResult[]>([])
  const [timeline, setTimeline] = useState<DayStat[]>([])
  const [deviceStats, setDeviceStats] = useState<DeviceStat[]>([])
  const [deviceNames, setDeviceNames] = useState<Map<string, string>>(new Map())
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null)
  const [draftDeviceName, setDraftDeviceName] = useState('')
  const [questionTypesRef] = useState(() => new Map<string, string>())

  const [filterDevice, setFilterDevice] = useState<string | null>(null)
  const [filterSession, setFilterSession] = useState<number | null>(null)
  const [includeAborted, setIncludeAborted] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Refs zodat de interval altijd de huidige filterwaarden gebruikt
  const paramsRef = useRef({ includeAborted, filterDevice, filterSession })
  useEffect(() => { paramsRef.current = { includeAborted, filterDevice, filterSession } },
    [includeAborted, filterDevice, filterSession])

  // ─── Hulpfunctie: samenvat + tijdlijn uit (gefilterde) interviews ────────────

  function applyFilter(interviews: InterviewRow[], devId: string | null, sesId: number | null) {
    return interviews.filter((i) =>
      (devId === null || i.device_id === devId) &&
      (sesId === null || (i.session_id ?? 1) === sesId)
    )
  }

  function computeSummary(interviews: InterviewRow[]): SummaryStats {
    const completed = interviews.filter((i) => i.status === 'completed').length
    const aborted = interviews.filter((i) => i.status === 'aborted').length
    const dates = interviews.map((i) => i.started_at).sort()
    return {
      completed,
      aborted,
      first_at: dates[0] ?? null,
      last_at: dates[dates.length - 1] ?? null,
      lang_nl: interviews.filter((i) => i.language === 'nl').length,
      lang_fr: interviews.filter((i) => i.language === 'fr').length,
      lang_en: interviews.filter((i) => i.language === 'en').length,
    }
  }

  // ─── Data ophalen ───────────────────────────────────────────────────────────

  const fetchData = useCallback(async (
    currentIncludeAborted: boolean,
    devId: string | null,
    sesId: number | null,
  ) => {
    if (!quizId) return
    try {
      const [quizRes, interviewRes, resultsRes, questionsRes] = await Promise.all([
        supabase.from('quizzes').select('id, title, version, include_aborted').eq('id', quizId).single(),
        supabase.from('interviews').select('id, status, language, started_at, ended_at, device_id, session_id').eq('quiz_id', quizId),
        supabase.rpc('quiz_results', {
          quiz_id: quizId,
          include_aborted: currentIncludeAborted,
          p_device_id: devId,
          p_session_id: sesId,
        }),
        supabase.from('questions').select('id, type').eq('quiz_id', quizId),
      ])

      if (quizRes.error) throw new Error(quizRes.error.message)
      if (interviewRes.error) throw new Error(interviewRes.error.message)
      if (resultsRes.error) throw new Error(resultsRes.error.message)

      // Vraagtypen cachen (veranderen niet)
      for (const q of questionsRes.data ?? []) questionTypesRef.set(q.id, q.type)

      setMeta(quizRes.data)

      const interviews = (interviewRes.data ?? []) as InterviewRow[]
      const stats = buildDeviceStats(interviews)
      setDeviceStats(stats)

      // Apparaatnamen ophalen
      const deviceIds = [...new Set(stats.map((d) => d.device_id).filter(Boolean))] as string[]
      if (deviceIds.length > 0) {
        const { data: namesData } = await supabase
          .from('device_names')
          .select('device_id, name')
          .in('device_id', deviceIds)
        if (namesData) {
          setDeviceNames(new Map(namesData.map((r) => [r.device_id, r.name])))
        }
      }

      // Samenvatting + tijdlijn enkel over gefilterde interviews
      const filtered = applyFilter(interviews, devId, sesId)
      setSummary(computeSummary(filtered))
      setTimeline(buildTimeline(filtered))

      setResults(calculateResults(resultsRes.data as QuizResultRow[], questionTypesRef))
      setLastRefreshed(new Date())
    } catch (err) {
      setError((err as Error).message)
    }
  }, [quizId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Initieel laden ─────────────────────────────────────────────────────────

  const isFirstLoad = useRef(true)
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      setLoading(true)
      fetchData(includeAborted, filterDevice, filterSession).finally(() => setLoading(false))
    } else {
      void fetchData(includeAborted, filterDevice, filterSession)
    }
  }, [fetchData, includeAborted, filterDevice, filterSession])

  // ─── Auto-refresh elke 30 s ─────────────────────────────────────────────────

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const p = paramsRef.current
      void fetchData(p.includeAborted, p.filterDevice, p.filterSession)
    }, 30_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchData])

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
    const p = paramsRef.current
    await fetchData(p.includeAborted, p.filterDevice, p.filterSession)
    setRefreshing(false)
  }

  // ─── Initialiseer include_aborted vanuit meta ────────────────────────────────

  useEffect(() => {
    if (meta) setIncludeAborted(meta.include_aborted)
  }, [meta?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Filter helpers ──────────────────────────────────────────────────────────

  // Unieke apparaten (op volgorde van eerste verschijning)
  const uniqueDevices = (() => {
    const seen = new Set<string>()
    const list: Array<{ id: string | null; label: string }> = []
    for (const d of deviceStats) {
      const key = d.device_id ?? '__null__'
      if (!seen.has(key)) {
        seen.add(key)
        list.push({
          id: d.device_id,
          label: d.device_id
            ? (deviceNames.get(d.device_id) ?? d.device_id.slice(0, 8) + '…')
            : 'Onbekend',
        })
      }
    }
    return list
  })()

  // Sessies voor het gekozen apparaat
  const sessionsForDevice = filterDevice === null
    ? []
    : deviceStats
        .filter((d) => d.device_id === filterDevice)
        .map((d) => d.session_id)
        .sort((a, b) => a - b)

  const hasDeviceFilter = uniqueDevices.length > 1

  const handleSaveDeviceName = async (deviceId: string) => {
    const trimmed = draftDeviceName.trim()
    if (!trimmed) { setEditingDeviceId(null); return }
    await supabase.from('device_names').upsert({
      device_id: deviceId,
      name: trimmed,
      updated_at: new Date().toISOString(),
    })
    setDeviceNames((prev) => new Map(prev).set(deviceId, trimmed))
    setEditingDeviceId(null)
  }
  const isFiltered = filterDevice !== null || filterSession !== null

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

      {/* Filter per apparaat / sessie */}
      {hasDeviceFilter && (
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Apparaat</label>
              <select
                value={filterDevice ?? ''}
                onChange={(e) => {
                  setFilterDevice(e.target.value || null)
                  setFilterSession(null)
                }}
                className="text-sm border border-border rounded-md px-2 py-1 bg-background"
              >
                <option value="">Alle apparaten</option>
                {uniqueDevices.map((d) => (
                  <option key={d.id ?? 'null'} value={d.id ?? ''}>{d.label}</option>
                ))}
              </select>
            </div>
            {filterDevice !== null && sessionsForDevice.length > 1 && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Sessie</label>
                <select
                  value={filterSession ?? ''}
                  onChange={(e) => setFilterSession(e.target.value ? Number(e.target.value) : null)}
                  className="text-sm border border-border rounded-md px-2 py-1 bg-background"
                >
                  <option value="">Alle sessies</option>
                  {sessionsForDevice.map((s) => (
                    <option key={s} value={s}>Sessie {s}</option>
                  ))}
                </select>
              </div>
            )}
            {isFiltered && (
              <button
                onClick={() => { setFilterDevice(null); setFilterSession(null) }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Wis filter
              </button>
            )}
          </CardContent>
        </Card>
      )}

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

      {/* Tijdlijn per dag */}
      {timeline.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart2 className="h-4 w-4" /> Afgewerkt per dag
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeline} margin={{ top: 12, right: 8, left: -24, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, 'Afgewerkt']} />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="count" position="top" style={{ fontSize: 10 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per apparaat — tabel, klikbaar als filter */}
      {deviceStats.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Smartphone className="h-4 w-4" /> Per apparaat
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-1.5 pr-3 font-medium">Apparaat</th>
                    <th className="text-center py-1.5 px-2 font-medium">Sessie</th>
                    <th className="text-left py-1.5 px-2 font-medium">Gestart</th>
                    <th className="text-right py-1.5 px-2 font-medium text-green-700">Afgewerkt</th>
                    <th className="text-right py-1.5 pl-2 font-medium text-amber-700">Afgebroken</th>
                  </tr>
                </thead>
                <tbody>
                  {deviceStats.map((d, i) => {
                    const isActive = filterDevice === d.device_id && filterSession === d.session_id
                    return (
                      <tr
                        key={i}
                        onClick={() => {
                          if (isActive) {
                            setFilterDevice(null)
                            setFilterSession(null)
                          } else {
                            setFilterDevice(d.device_id)
                            setFilterSession(d.session_id)
                          }
                        }}
                        className={[
                          'border-b last:border-0 cursor-pointer transition-colors',
                          isActive ? 'bg-primary/10' : 'hover:bg-muted/50',
                        ].join(' ')}
                      >
                        <td className="py-1.5 pr-3">
                          {d.device_id && editingDeviceId === d.device_id ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                autoFocus
                                value={draftDeviceName}
                                onChange={(e) => setDraftDeviceName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') void handleSaveDeviceName(d.device_id!)
                                  if (e.key === 'Escape') setEditingDeviceId(null)
                                }}
                                onBlur={() => void handleSaveDeviceName(d.device_id!)}
                                maxLength={40}
                                className="text-xs border border-border rounded px-1.5 py-0.5 w-28 bg-background"
                              />
                              <button
                                onMouseDown={(e) => { e.preventDefault(); void handleSaveDeviceName(d.device_id!) }}
                                className="text-primary"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group/name">
                              <span className={deviceNames.get(d.device_id ?? '') ? 'text-sm font-medium' : 'font-mono text-xs text-muted-foreground'}>
                                {d.device_id
                                  ? (deviceNames.get(d.device_id) ?? d.device_id.slice(0, 8) + '…')
                                  : 'Onbekend'}
                              </span>
                              {d.device_id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDraftDeviceName(deviceNames.get(d.device_id!) ?? '')
                                    setEditingDeviceId(d.device_id!)
                                  }}
                                  className="opacity-0 group-hover/name:opacity-50 hover:!opacity-100 transition-opacity"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="text-center py-1.5 px-2 tabular-nums">{d.session_id}</td>
                        <td className="py-1.5 px-2 text-xs text-muted-foreground whitespace-nowrap">
                          {d.started_at ? formatDate(d.started_at) : '—'}
                        </td>
                        <td className="text-right py-1.5 px-2 tabular-nums font-medium text-green-700">{d.completed}</td>
                        <td className="text-right py-1.5 pl-2 tabular-nums text-amber-700">{d.aborted}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {hasDeviceFilter && (
              <p className="text-xs text-muted-foreground mt-2">Tik op een rij om te filteren</p>
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

      {/* Laatste verversing */}
      <p className="text-xs text-muted-foreground text-center">
        Vernieuwd om {lastRefreshed.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · elke 30 s automatisch
      </p>
    </div>
  )
}
