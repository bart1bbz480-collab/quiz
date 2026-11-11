import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUp, ArrowDown, Trash2, Plus, Image, X, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/lib/supabase'
import { uploadImage, getPublicImageUrl } from '@/lib/image'
import { cn } from '@/lib/utils'
import type { Quiz, QuestionType } from '@/types'
import { MAX_QUESTIONS, MAX_OPTIONS, MIN_OPTIONS } from '@/types'
import { QuizPreview } from './QuizPreview'
import type { PreviewData } from './QuizPreview'

// ─── Local draft types ─────────────────────────────────────────────────────────

interface OptionDraft {
  id?: string
  label_nl: string
  label_fr: string
  label_en: string
  image_path: string | null
  _localImageFile?: File
}

interface QuestionDraft {
  id?: string
  type: QuestionType
  text_nl: string
  text_fr: string
  text_en: string
  image_path: string | null
  _localImageFile?: File
  options: OptionDraft[]
}

interface QuizDraft {
  title: string
  campaign_url: string
  thanks_text_nl: string
  thanks_text_fr: string
  thanks_text_en: string
  thanks_image_path: string | null
  _localThanksImageFile?: File
  questions: QuestionDraft[]
}

// ─── ImageUpload ───────────────────────────────────────────────────────────────

interface ImageUploadProps {
  value: string | null
  localFile?: File
  onChange: (path: string | null, file?: File) => void
  disabled?: boolean
  label?: string
}

function ImageUpload({ value, localFile, onChange, disabled = false, label = 'Afbeelding' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const previewSrc = localFile
    ? URL.createObjectURL(localFile)
    : value
    ? getPublicImageUrl(value)
    : null

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('Afbeelding mag maximaal 5 MB zijn.')
      return
    }
    onChange(value, file)
    e.target.value = ''
  }

  return (
    <div className="flex items-center gap-3">
      <div className="w-20 h-20 rounded border border-border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
        {previewSrc ? (
          <img src={previewSrc} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <Image className="h-5 w-5" />
            <span className="text-xs text-center leading-tight px-1">Geen afbeelding</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Afbeelding kiezen
        </Button>
        {(localFile || value) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onChange(null, undefined)}
            className="text-destructive hover:text-destructive"
          >
            <X className="h-3 w-3 mr-1" />
            Verwijderen
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

// ─── OptionRow ─────────────────────────────────────────────────────────────────

interface OptionRowProps {
  opt: OptionDraft
  idx: number
  total: number
  locked: boolean
  onChange: (updated: OptionDraft) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function OptionRow({ opt, idx, total, locked, onChange, onRemove, onMoveUp, onMoveDown }: OptionRowProps) {
  return (
    <Card className="mb-2">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Optie {idx + 1}</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={idx === 0}
              onClick={onMoveUp}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={idx === total - 1}
              onClick={onMoveDown}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              disabled={locked || total <= MIN_OPTIONS}
              onClick={onRemove}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="nl">
          <TabsList className="h-8">
            <TabsTrigger value="nl" className="text-xs px-2 py-1">NL</TabsTrigger>
            <TabsTrigger value="fr" className="text-xs px-2 py-1">FR</TabsTrigger>
            <TabsTrigger value="en" className="text-xs px-2 py-1">EN</TabsTrigger>
          </TabsList>
          <TabsContent value="nl" className="mt-2">
            <Input
              placeholder="Label NL"
              value={opt.label_nl}
              disabled={locked}
              onChange={(e) => onChange({ ...opt, label_nl: e.target.value })}
            />
          </TabsContent>
          <TabsContent value="fr" className="mt-2">
            <Input
              placeholder="Label FR"
              value={opt.label_fr}
              disabled={locked}
              onChange={(e) => onChange({ ...opt, label_fr: e.target.value })}
            />
          </TabsContent>
          <TabsContent value="en" className="mt-2">
            <Input
              placeholder="Label EN"
              value={opt.label_en}
              disabled={locked}
              onChange={(e) => onChange({ ...opt, label_en: e.target.value })}
            />
          </TabsContent>
        </Tabs>

        <div className="mt-3">
          <ImageUpload
            value={opt.image_path}
            localFile={opt._localImageFile}
            disabled={locked}
            label={`Optie ${idx + 1} afbeelding`}
            onChange={(path, file) =>
              onChange({ ...opt, image_path: path, _localImageFile: file })
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── QuestionCard ──────────────────────────────────────────────────────────────

interface QuestionCardProps {
  q: QuestionDraft
  idx: number
  total: number
  locked: boolean
  onChange: (updated: QuestionDraft) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function newOption(): OptionDraft {
  return { label_nl: '', label_fr: '', label_en: '', image_path: null }
}

function QuestionCard({ q, idx, total, locked, onChange, onRemove, onMoveUp, onMoveDown }: QuestionCardProps) {
  const addOption = () => {
    if (q.options.length >= MAX_OPTIONS) return
    onChange({ ...q, options: [...q.options, newOption()] })
  }

  const updateOption = (optIdx: number, updated: OptionDraft) => {
    const options = q.options.map((o, i) => (i === optIdx ? updated : o))
    onChange({ ...q, options })
  }

  const removeOption = (optIdx: number) => {
    onChange({ ...q, options: q.options.filter((_, i) => i !== optIdx) })
  }

  const moveOption = (optIdx: number, dir: -1 | 1) => {
    const options = [...q.options]
    const target = optIdx + dir
    if (target < 0 || target >= options.length) return
    ;[options[optIdx], options[target]] = [options[target], options[optIdx]]
    onChange({ ...q, options })
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Vraag {idx + 1}</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={idx === 0}
              onClick={onMoveUp}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={idx === total - 1}
              onClick={onMoveDown}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              disabled={locked}
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="mb-1.5 block text-sm">Type vraag</Label>
          <Select
            value={q.type}
            disabled={locked}
            onValueChange={(val) =>
              onChange({ ...q, type: val as QuestionType })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="multiple_choice">Meerkeuze</SelectItem>
              <SelectItem value="yes_no_unknown">Ja / Nee / Weet ik niet</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block text-sm">Vraagtekst</Label>
          <Tabs defaultValue="nl">
            <TabsList>
              <TabsTrigger value="nl">NL</TabsTrigger>
              <TabsTrigger value="fr">FR</TabsTrigger>
              <TabsTrigger value="en">EN</TabsTrigger>
            </TabsList>
            <TabsContent value="nl" className="mt-2">
              <Textarea
                placeholder="Vraag in het Nederlands"
                value={q.text_nl}
                disabled={locked}
                rows={2}
                onChange={(e) => onChange({ ...q, text_nl: e.target.value })}
              />
            </TabsContent>
            <TabsContent value="fr" className="mt-2">
              <Textarea
                placeholder="Question en français"
                value={q.text_fr}
                disabled={locked}
                rows={2}
                onChange={(e) => onChange({ ...q, text_fr: e.target.value })}
              />
            </TabsContent>
            <TabsContent value="en" className="mt-2">
              <Textarea
                placeholder="Question in English"
                value={q.text_en}
                disabled={locked}
                rows={2}
                onChange={(e) => onChange({ ...q, text_en: e.target.value })}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <Label className="mb-1.5 block text-sm">Vraagafbeelding</Label>
          <ImageUpload
            value={q.image_path}
            localFile={q._localImageFile}
            disabled={locked}
            label={`Vraag ${idx + 1} afbeelding`}
            onChange={(path, file) =>
              onChange({ ...q, image_path: path, _localImageFile: file })
            }
          />
        </div>

        {q.type === 'yes_no_unknown' && (
          <p className="text-sm text-muted-foreground">
            Vaste opties: Ja · Nee · Weet ik niet
          </p>
        )}

        {q.type === 'multiple_choice' && (
          <div>
            <Label className="mb-2 block text-sm">Antwoordopties</Label>
            {q.options.map((opt, optIdx) => (
              <OptionRow
                key={optIdx}
                opt={opt}
                idx={optIdx}
                total={q.options.length}
                locked={locked}
                onChange={(updated) => updateOption(optIdx, updated)}
                onRemove={() => removeOption(optIdx)}
                onMoveUp={() => moveOption(optIdx, -1)}
                onMoveDown={() => moveOption(optIdx, 1)}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={locked || q.options.length >= MAX_OPTIONS}
              onClick={addOption}
              className="mt-1"
            >
              <Plus className="h-3 w-3 mr-1" />
              Optie toevoegen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── QuizEditorPage ────────────────────────────────────────────────────────────

const emptyDraft: QuizDraft = {
  title: '',
  campaign_url: '',
  thanks_text_nl: '',
  thanks_text_fr: '',
  thanks_text_en: '',
  thanks_image_path: null,
  questions: [],
}

function newQuestion(): QuestionDraft {
  return {
    type: 'multiple_choice',
    text_nl: '',
    text_fr: '',
    text_en: '',
    image_path: null,
    options: [
      { label_nl: '', label_fr: '', label_en: '', image_path: null },
      { label_nl: '', label_fr: '', label_en: '', image_path: null },
    ],
  }
}

export function QuizEditorPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [draft, setDraft] = useState<QuizDraft>(emptyDraft)
  const [saving, setSaving] = useState(false)

  const isNew = !id || id === 'new'

  const { data: existing, isLoading, error: loadError } = useQuery({
    queryKey: ['quiz', id],
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*, questions(*, options(*))')
        .eq('id', id!)
        .single()
      if (error) throw error
      const quiz = data as Quiz
      quiz.questions = (quiz.questions ?? [])
        .sort((a, b) => a.position - b.position)
        .map((q) => ({
          ...q,
          options: (q.options ?? []).sort((a, b) => a.position - b.position),
        }))
      return quiz
    },
  })

  useEffect(() => {
    if (!existing) return
    setDraft({
      title: existing.title,
      campaign_url: existing.campaign_url ?? '',
      thanks_text_nl: existing.thanks_text_nl ?? '',
      thanks_text_fr: existing.thanks_text_fr ?? '',
      thanks_text_en: existing.thanks_text_en ?? '',
      thanks_image_path: existing.thanks_image_path,
      questions: existing.questions.map((q) => ({
        id: q.id,
        type: q.type,
        text_nl: q.text_nl,
        text_fr: q.text_fr ?? '',
        text_en: q.text_en ?? '',
        image_path: q.image_path,
        options: q.options.map((o) => ({
          id: o.id,
          label_nl: o.label_nl,
          label_fr: o.label_fr ?? '',
          label_en: o.label_en ?? '',
          image_path: o.image_path,
        })),
      })),
    })
  }, [existing])

  const isLocked = existing?.is_locked ?? false

  const translatedCount = (lang: 'fr' | 'en') =>
    draft.questions.filter((q) =>
      lang === 'fr' ? q.text_fr.trim() !== '' : q.text_en.trim() !== ''
    ).length

  const saveDraft = async () => {
    if (!draft.title.trim()) {
      toast({ title: 'Vul een titel in', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      // 1. Upload thanks image
      let thanksImagePath = draft.thanks_image_path
      if (draft._localThanksImageFile) {
        thanksImagePath = await uploadImage(draft._localThanksImageFile, 'thanks')
      }

      // 2. Upload question images + option images
      const resolvedQuestions = await Promise.all(
        draft.questions.map(async (q) => {
          let questionImagePath = q.image_path
          if (q._localImageFile) {
            questionImagePath = await uploadImage(q._localImageFile, 'questions')
          }
          const resolvedOptions = await Promise.all(
            q.options.map(async (o) => {
              let optionImagePath = o.image_path
              if (o._localImageFile) {
                optionImagePath = await uploadImage(o._localImageFile, 'options')
              }
              return { ...o, image_path: optionImagePath }
            })
          )
          return { ...q, image_path: questionImagePath, options: resolvedOptions }
        })
      )

      // 3. Upsert quiz
      const quizPayload: Record<string, unknown> = {
        title: draft.title,
        campaign_url: draft.campaign_url.trim() || null,
        thanks_text_nl: draft.thanks_text_nl.trim() || null,
        thanks_text_fr: draft.thanks_text_fr.trim() || null,
        thanks_text_en: draft.thanks_text_en.trim() || null,
        thanks_image_path: thanksImagePath,
      }
      if (!isNew) quizPayload.id = id

      const { data: quizRow, error: quizError } = await supabase
        .from('quizzes')
        .upsert(quizPayload)
        .select('id')
        .single()
      if (quizError) throw quizError
      const quizId = quizRow.id as string

      // 4. Upsert questions + options
      for (let qIdx = 0; qIdx < resolvedQuestions.length; qIdx++) {
        const q = resolvedQuestions[qIdx]
        const questionPayload: Record<string, unknown> = {
          quiz_id: quizId,
          position: qIdx + 1,
          type: q.type,
          text_nl: q.text_nl,
          text_fr: q.text_fr.trim() || null,
          text_en: q.text_en.trim() || null,
          image_path: q.image_path,
        }
        if (q.id) questionPayload.id = q.id

        const { data: qRow, error: qError } = await supabase
          .from('questions')
          .upsert(questionPayload)
          .select('id')
          .single()
        if (qError) throw qError
        const questionId = qRow.id as string

        for (let oIdx = 0; oIdx < q.options.length; oIdx++) {
          const o = q.options[oIdx]
          const optionPayload: Record<string, unknown> = {
            question_id: questionId,
            position: oIdx + 1,
            label_nl: o.label_nl,
            label_fr: o.label_fr.trim() || null,
            label_en: o.label_en.trim() || null,
            image_path: o.image_path,
          }
          if (o.id) optionPayload.id = o.id

          const { error: oError } = await supabase.from('options').upsert(optionPayload)
          if (oError) throw oError
        }

        // 5. Delete removed options for this question
        if (existing) {
          const existingQuestion = existing.questions.find((eq) => eq.id === q.id)
          if (existingQuestion) {
            const keptOptionIds = q.options
              .filter((o) => o.id !== undefined)
              .map((o) => o.id as string)
            const removedOptionIds = existingQuestion.options
              .map((o) => o.id)
              .filter((oid) => !keptOptionIds.includes(oid))
            if (removedOptionIds.length > 0) {
              const { error: delOptError } = await supabase
                .from('options')
                .delete()
                .in('id', removedOptionIds)
              if (delOptError) throw delOptError
            }
          }
        }
      }

      // 6. Delete removed questions
      if (existing) {
        const keptQuestionIds = resolvedQuestions
          .filter((q) => q.id !== undefined)
          .map((q) => q.id as string)
        const removedQuestionIds = existing.questions
          .map((q) => q.id)
          .filter((qid) => !keptQuestionIds.includes(qid))
        if (removedQuestionIds.length > 0) {
          const { error: delQError } = await supabase
            .from('questions')
            .delete()
            .in('id', removedQuestionIds)
          if (delQError) throw delQError
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      await queryClient.invalidateQueries({ queryKey: ['quiz', id] })
      toast({ title: 'Opgeslagen', variant: 'success' })
      navigate('/admin/quizzes')
    } catch (e) {
      toast({
        title: 'Opslaan mislukt',
        description: (e as Error).message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const addQuestion = () => {
    if (draft.questions.length >= MAX_QUESTIONS) return
    setDraft((d) => ({ ...d, questions: [...d.questions, newQuestion()] }))
  }

  const updateQuestion = (qIdx: number, updated: QuestionDraft) => {
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q, i) => (i === qIdx ? updated : q)),
    }))
  }

  const removeQuestion = (qIdx: number) => {
    setDraft((d) => ({
      ...d,
      questions: d.questions.filter((_, i) => i !== qIdx),
    }))
  }

  const moveQuestion = (qIdx: number, dir: -1 | 1) => {
    setDraft((d) => {
      const questions = [...d.questions]
      const target = qIdx + dir
      if (target < 0 || target >= questions.length) return d
      ;[questions[qIdx], questions[target]] = [questions[target], questions[qIdx]]
      return { ...d, questions }
    })
  }

  const previewData: PreviewData = {
    thanks_text_nl: draft.thanks_text_nl,
    thanks_text_fr: draft.thanks_text_fr,
    thanks_text_en: draft.thanks_text_en,
    thanks_image_path: draft.thanks_image_path,
    questions: draft.questions.map((q) => ({
      type: q.type,
      text_nl: q.text_nl,
      text_fr: q.text_fr,
      text_en: q.text_en,
      image_path: q.image_path,
      options: q.options.map((o) => ({
        label_nl: o.label_nl,
        label_fr: o.label_fr,
        label_en: o.label_en,
        image_path: o.image_path,
      })),
    })),
  }

  if (!isNew && isLoading) {
    return <p className="text-muted-foreground text-sm">Laden…</p>
  }

  if (!isNew && loadError) {
    return (
      <p className="text-destructive text-sm">
        Fout bij laden: {(loadError as Error).message}
      </p>
    )
  }

  return (
    <div className="max-w-3xl mx-auto pb-16">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/admin/quizzes')}>
          ← Vragenlijsten
        </Button>
        <Button onClick={saveDraft} disabled={saving}>
          {saving ? 'Opslaan…' : 'Opslaan'}
        </Button>
      </div>

      {/* Locked banner */}
      {isLocked && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 mb-6 text-sm text-yellow-800">
          <Lock className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>Vergrendeld</strong> — vragen en opties kunnen niet meer gewijzigd worden.
            Bedanktekst en campagne-URL zijn nog bewerkbaar.
          </span>
        </div>
      )}

      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          <TabsTrigger value="general">Algemeen</TabsTrigger>
          <TabsTrigger value="questions">
            Vragen ({draft.questions.length}/{MAX_QUESTIONS})
          </TabsTrigger>
          <TabsTrigger value="thanks">Bedankpagina</TabsTrigger>
          <TabsTrigger value="preview">Voorbeeldweergave</TabsTrigger>
        </TabsList>

        {/* ── Tab: Algemeen ── */}
        <TabsContent value="general">
          <div className="space-y-5">
            <div>
              <Label htmlFor="quiz-title" className="mb-1.5 block">Titel</Label>
              <Input
                id="quiz-title"
                placeholder="Naam van de vragenlijst"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="campaign-url" className="mb-1.5 block">Campagne-URL</Label>
              <Input
                id="campaign-url"
                placeholder="https://…"
                value={draft.campaign_url}
                onChange={(e) => setDraft((d) => ({ ...d, campaign_url: e.target.value }))}
              />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Vertaalstatus</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">NL ✓</span>
                {'  |  '}
                <span>
                  FR:{' '}
                  <span
                    className={cn(
                      translatedCount('fr') === draft.questions.length && draft.questions.length > 0
                        ? 'text-green-700 font-medium'
                        : 'text-orange-600'
                    )}
                  >
                    {translatedCount('fr')}/{draft.questions.length}
                  </span>
                </span>
                {'  |  '}
                <span>
                  EN:{' '}
                  <span
                    className={cn(
                      translatedCount('en') === draft.questions.length && draft.questions.length > 0
                        ? 'text-green-700 font-medium'
                        : 'text-orange-600'
                    )}
                  >
                    {translatedCount('en')}/{draft.questions.length}
                  </span>
                </span>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab: Vragen ── */}
        <TabsContent value="questions">
          {draft.questions.length === 0 && (
            <p className="text-muted-foreground text-sm mb-4">
              Nog geen vragen. Voeg er een toe.
            </p>
          )}

          {draft.questions.map((q, qIdx) => (
            <QuestionCard
              key={qIdx}
              q={q}
              idx={qIdx}
              total={draft.questions.length}
              locked={isLocked}
              onChange={(updated) => updateQuestion(qIdx, updated)}
              onRemove={() => removeQuestion(qIdx)}
              onMoveUp={() => moveQuestion(qIdx, -1)}
              onMoveDown={() => moveQuestion(qIdx, 1)}
            />
          ))}

          <Button
            type="button"
            variant="outline"
            disabled={draft.questions.length >= MAX_QUESTIONS || isLocked}
            onClick={addQuestion}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Vraag toevoegen
          </Button>
        </TabsContent>

        {/* ── Tab: Bedankpagina ── */}
        <TabsContent value="thanks">
          <div className="space-y-5">
            <div>
              <Label className="mb-1.5 block">Bedanktekst NL</Label>
              <Textarea
                placeholder="Dank u voor uw deelname!"
                value={draft.thanks_text_nl}
                rows={3}
                onChange={(e) => setDraft((d) => ({ ...d, thanks_text_nl: e.target.value }))}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Bedanktekst FR</Label>
              <Textarea
                placeholder="Merci pour votre participation !"
                value={draft.thanks_text_fr}
                rows={3}
                onChange={(e) => setDraft((d) => ({ ...d, thanks_text_fr: e.target.value }))}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Bedanktekst EN</Label>
              <Textarea
                placeholder="Thank you for your participation!"
                value={draft.thanks_text_en}
                rows={3}
                onChange={(e) => setDraft((d) => ({ ...d, thanks_text_en: e.target.value }))}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Bedankafbeelding</Label>
              <ImageUpload
                value={draft.thanks_image_path}
                localFile={draft._localThanksImageFile}
                label="Bedankafbeelding"
                onChange={(path, file) =>
                  setDraft((d) => ({
                    ...d,
                    thanks_image_path: path,
                    _localThanksImageFile: file,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="campaign-url-thanks" className="mb-1.5 block">Campagne-URL</Label>
              <Input
                id="campaign-url-thanks"
                placeholder="https://…"
                value={draft.campaign_url}
                onChange={(e) => setDraft((d) => ({ ...d, campaign_url: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ook in te stellen op het tabblad Algemeen.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab: Voorbeeldweergave ── */}
        <TabsContent value="preview">
          <QuizPreview data={previewData} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
