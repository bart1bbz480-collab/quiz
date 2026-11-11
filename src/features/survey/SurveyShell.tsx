import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { getActiveQuiz, getCachedImage } from '@/lib/db'
import { submitInterview } from '@/lib/sync'
import { t, languageLabels, languageFlags } from '@/i18n'
import type { Quiz, Question, Option, Language, InterviewPayload } from '@/types'
import { ABORT_HOLD_MS, ANSWER_FEEDBACK_MS } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type SurveyStep = 'lang' | 'question' | 'thanks'

interface SurveyState {
  quiz: Quiz | null
  loading: boolean
  step: SurveyStep
  lang: Language
  currentQuestionIdx: number
  answers: Array<{ question_id: string; option_id: string }>
  startedAt: string | null
  interviewId: string | null
  aborted: boolean
  abortedAtPosition: number | null
}

// ─── Kleine hulpfuncties ──────────────────────────────────────────────────────

function getQuestionText(q: Question, lang: Language): string {
  if (lang === 'fr' && q.text_fr) return q.text_fr
  if (lang === 'en' && q.text_en) return q.text_en
  return q.text_nl
}

function getOptionLabel(o: Option, lang: Language): string {
  if (lang === 'fr' && o.label_fr) return o.label_fr
  if (lang === 'en' && o.label_en) return o.label_en
  return o.label_nl
}

function getThanksText(quiz: Quiz, lang: Language): string {
  if (lang === 'fr' && quiz.thanks_text_fr) return quiz.thanks_text_fr
  if (lang === 'en' && quiz.thanks_text_en) return quiz.thanks_text_en
  if (quiz.thanks_text_nl) return quiz.thanks_text_nl
  return t(lang, 'thanks')
}

function hasAllTranslations(quiz: Quiz, lang: Language): boolean {
  if (lang === 'nl') return true
  return quiz.questions.every((q) => {
    const hasQ = lang === 'fr' ? !!q.text_fr : !!q.text_en
    if (!hasQ) return false
    return q.options.every((o) => (lang === 'fr' ? !!o.label_fr : !!o.label_en))
  })
}

// ─── Hook: blob URL voor gecachte afbeeldingen ────────────────────────────────

function useBlobUrl(path: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!path) {
      setUrl(null)
      return
    }
    let objectUrl: string | null = null
    getCachedImage(path).then((blob) => {
      if (blob) {
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      }
    })
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path])

  return url
}

// ─── Initiële state ───────────────────────────────────────────────────────────

const INITIAL_STATE: SurveyState = {
  quiz: null,
  loading: true,
  step: 'lang',
  lang: 'nl',
  currentQuestionIdx: 0,
  answers: [],
  startedAt: null,
  interviewId: null,
  aborted: false,
  abortedAtPosition: null,
}

// ─── Hoofd-component ──────────────────────────────────────────────────────────

export function SurveyShell() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [state, setState] = useState<SurveyState>(INITIAL_STATE)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)

  // Abort hold state
  const [abortProgress, setAbortProgress] = useState(0) // 0–1
  const abortTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const abortStartRef = useRef<number | null>(null)

  // Wake Lock ref
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  // ─── Quiz laden bij mount ───────────────────────────────────────────────────

  useEffect(() => {
    getActiveQuiz()
      .then((quiz) => {
        if (!quiz) {
          setLoadError(true)
          setState((s) => ({ ...s, loading: false }))
        } else {
          setState((s) => ({ ...s, quiz, loading: false }))
        }
      })
      .catch(() => {
        setLoadError(true)
        setState((s) => ({ ...s, loading: false }))
      })
  }, [])

  // ─── Wake Lock beheer bij stap 'question' ──────────────────────────────────

  useEffect(() => {
    if (state.step !== 'question') {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => null)
        wakeLockRef.current = null
      }
      return
    }

    const requestWakeLock = async () => {
      try {
        if (navigator.wakeLock) {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        }
      } catch {
        // Wake Lock niet beschikbaar; stil falen
      }
    }

    void requestWakeLock()

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        void requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => null)
        wakeLockRef.current = null
      }
    }
  }, [state.step])

  // ─── Terug-knop blokkeren bij stap 'question' ─────────────────────────────

  useEffect(() => {
    if (state.step !== 'question') return

    history.pushState(null, '', window.location.href)

    const onPopState = () => {
      history.pushState(null, '', window.location.href)
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [state.step])

  // ─── Synchroniseren na voltooien / afbreken ────────────────────────────────

  const saveInterview = useCallback(
    async (
      overrideState?: Partial<
        Pick<SurveyState, 'answers' | 'aborted' | 'abortedAtPosition' | 'startedAt' | 'interviewId' | 'lang'>
      > & { quiz?: Quiz }
    ) => {
      const merged = { ...state, ...overrideState }
      const { quiz, interviewId, startedAt, lang, answers, aborted, abortedAtPosition } = merged

      if (!quiz || !interviewId || !startedAt) return

      const payload: Omit<InterviewPayload, 'app_version' | 'user_agent'> = {
        id: interviewId,
        quiz_id: quiz.id,
        language: lang,
        status: aborted ? 'aborted' : 'completed',
        aborted_at_position: abortedAtPosition ?? null,
        started_at: startedAt,
        ended_at: new Date().toISOString(),
        answers,
      }

      try {
        await submitInterview(payload)
      } catch {
        toast({ title: 'Synchronisatiefout', description: 'Enquête opgeslagen in wachtrij.', variant: 'destructive' })
      }
    },
    [state, toast]
  )

  // ─── Taalkeuze handlers ────────────────────────────────────────────────────

  const handleSelectLanguage = (lang: Language) => {
    setState((s) => ({
      ...s,
      step: 'question',
      lang,
      currentQuestionIdx: 0,
      answers: [],
      interviewId: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      aborted: false,
      abortedAtPosition: null,
    }))
  }

  const handleAbortFromLang = () => {
    navigate('/home', { replace: true })
  }

  // ─── Antwoord selecteren ───────────────────────────────────────────────────

  const handleSelectOption = useCallback(
    (option: Option) => {
      if (selectedOptionId !== null) return // Blokkeer extra tikken

      const { quiz, currentQuestionIdx, answers, lang, interviewId, startedAt } = state
      if (!quiz) return

      const question = quiz.questions[currentQuestionIdx]
      setSelectedOptionId(option.id)

      const newAnswers = [...answers, { question_id: question.id, option_id: option.id }]
      const isLast = currentQuestionIdx === quiz.questions.length - 1

      setTimeout(async () => {
        setSelectedOptionId(null)

        if (isLast) {
          // Bewaar de finale state voor submitInterview
          const finalState = {
            ...state,
            answers: newAnswers,
            aborted: false,
            abortedAtPosition: null,
          }
          setState({ ...finalState, step: 'thanks' })
          await saveInterview({
            answers: newAnswers,
            aborted: false,
            abortedAtPosition: null,
            startedAt: startedAt,
            interviewId: interviewId,
            lang,
            quiz,
          })
        } else {
          setState((s) => ({
            ...s,
            answers: newAnswers,
            currentQuestionIdx: s.currentQuestionIdx + 1,
          }))
        }
      }, ANSWER_FEEDBACK_MS)
    },
    [selectedOptionId, state, saveInterview]
  )

  // ─── Abort hold handlers ───────────────────────────────────────────────────

  const handleAbortPointerDown = useCallback(() => {
    if (abortTimerRef.current) return
    abortStartRef.current = Date.now()

    abortTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - (abortStartRef.current ?? Date.now())
      const progress = Math.min(elapsed / ABORT_HOLD_MS, 1)
      setAbortProgress(progress)

      if (progress >= 1) {
        // Stop interval direct
        clearInterval(abortTimerRef.current!)
        abortTimerRef.current = null
        abortStartRef.current = null
        setAbortProgress(0)

        // Sla op en ga terug
        const { answers, currentQuestionIdx, lang, startedAt, interviewId, quiz } = state
        setState((s) => ({ ...s, aborted: true, abortedAtPosition: s.currentQuestionIdx }))

        void saveInterview({
          answers,
          aborted: true,
          abortedAtPosition: currentQuestionIdx,
          startedAt,
          interviewId,
          lang,
          quiz: quiz ?? undefined,
        }).then(() => {
          navigate('/home', { replace: true })
        })
      }
    }, 50)
  }, [state, saveInterview, navigate])

  const handleAbortPointerUp = useCallback(() => {
    if (abortTimerRef.current) {
      clearInterval(abortTimerRef.current)
      abortTimerRef.current = null
    }
    abortStartRef.current = null
    setAbortProgress(0)
  }, [])

  // ─── Bedankpagina: tik om opnieuw te beginnen ──────────────────────────────

  const handleThanksClick = () => {
    setState((s) => ({
      ...INITIAL_STATE,
      quiz: s.quiz,
      loading: false,
      step: 'lang',
    }))
  }

  // ─── Loading / Error ───────────────────────────────────────────────────────

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Laden…</p>
      </div>
    )
  }

  if (loadError || !state.quiz) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="text-base font-medium text-destructive text-center">
          Geen actieve vragenlijst gevonden.
        </p>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Synchroniseer de app via het startscherm en probeer opnieuw.
        </p>
        <Button variant="outline" onClick={() => navigate('/home', { replace: true })}>
          Terug naar startscherm
        </Button>
      </div>
    )
  }

  const { quiz, step, lang, currentQuestionIdx } = state

  // ─── Stap 1: Taalkeuze ─────────────────────────────────────────────────────

  if (step === 'lang') {
    const availableLanguages: Language[] = (['nl', 'fr', 'en'] as Language[]).filter((l) =>
      hasAllTranslations(quiz, l)
    )

    return (
      <div className="min-h-screen overflow-y-auto flex flex-col bg-background">
        {/* Discrete terug-knop linksboven */}
        <div className="p-4">
          <button
            onClick={handleAbortFromLang}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Terug naar startscherm"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-4">
          <h1 className="text-2xl font-semibold text-center text-foreground">
            {t('nl', 'chooseLanguage')} / {t('fr', 'chooseLanguage')} / {t('en', 'chooseLanguage')}
          </h1>

          <div className="flex flex-col gap-4 w-full max-w-sm">
            {availableLanguages.map((l) => (
              <button
                key={l}
                onClick={() => handleSelectLanguage(l)}
                className="flex items-center justify-center gap-4 w-full min-h-20 rounded-2xl border-2 border-border bg-card text-card-foreground text-xl font-semibold shadow-sm hover:bg-accent hover:border-primary active:scale-95 transition-all touch-manipulation select-none"
              >
                <span className="text-3xl">{languageFlags[l]}</span>
                <span>{languageLabels[l]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── Stap 2: Vraagscherm ───────────────────────────────────────────────────

  if (step === 'question') {
    const question = quiz.questions[currentQuestionIdx]
    const total = quiz.questions.length
    const progressPct = ((currentQuestionIdx) / total) * 100

    return (
      <QuestionScreen
        question={question}
        lang={lang}
        currentIdx={currentQuestionIdx}
        total={total}
        progressPct={progressPct}
        selectedOptionId={selectedOptionId}
        abortProgress={abortProgress}
        onSelectOption={handleSelectOption}
        onAbortPointerDown={handleAbortPointerDown}
        onAbortPointerUp={handleAbortPointerUp}
      />
    )
  }

  // ─── Stap 3: Bedankpagina ─────────────────────────────────────────────────

  if (step === 'thanks') {
    return (
      <ThanksScreen
        quiz={quiz}
        lang={lang}
        onRestart={handleThanksClick}
      />
    )
  }

  return null
}

// ─── QuestionScreen ────────────────────────────────────────────────────────

interface QuestionScreenProps {
  question: Question
  lang: Language
  currentIdx: number
  total: number
  progressPct: number
  selectedOptionId: string | null
  abortProgress: number
  onSelectOption: (option: Option) => void
  onAbortPointerDown: () => void
  onAbortPointerUp: () => void
}

function QuestionScreen({
  question,
  lang,
  currentIdx,
  total,
  progressPct,
  selectedOptionId,
  abortProgress,
  onSelectOption,
  onAbortPointerDown,
  onAbortPointerUp,
}: QuestionScreenProps) {
  const questionImageUrl = useBlobUrl(question.image_path)

  // Cirkel-SVG afmetingen
  const CIRCLE_SIZE = 36
  const STROKE = 3
  const RADIUS = (CIRCLE_SIZE - STROKE) / 2
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS

  return (
    <div
      className="min-h-screen flex flex-col bg-background"
      style={{
        userSelect: 'none',
        touchAction: 'manipulation',
        overscrollBehavior: 'none',
      }}
    >
      {/* Voortgangsbalk */}
      <div className="h-1 bg-muted w-full">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-sm font-medium text-muted-foreground">
          {t(lang, 'question')} {currentIdx + 1} {t(lang, 'of')} {total}
        </span>

        {/* Abort-knop met voortgangsring */}
        <button
          className="relative flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
          style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
          onPointerDown={onAbortPointerDown}
          onPointerUp={onAbortPointerUp}
          onPointerLeave={onAbortPointerUp}
          onPointerCancel={onAbortPointerUp}
          aria-label="Enquête afbreken (2 seconden ingedrukt houden)"
        >
          {/* SVG voortgangsring */}
          <svg
            width={CIRCLE_SIZE}
            height={CIRCLE_SIZE}
            className="absolute inset-0"
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              strokeOpacity={0.15}
            />
            <circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              strokeOpacity={abortProgress > 0 ? 0.9 : 0}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - abortProgress)}
              strokeLinecap="round"
              className="transition-none"
            />
          </svg>
          <X className="h-4 w-4 relative z-10" />
        </button>
      </div>

      {/* Vraaginhoud */}
      <div className="flex-1 flex flex-col px-4 pb-4 gap-4 overflow-y-auto">
        {/* Vraagafbeelding */}
        {questionImageUrl && (
          <div className="w-full rounded-xl overflow-hidden max-h-48">
            <img
              src={questionImageUrl}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        )}

        {/* Vraagtekst */}
        <h2 className="text-lg font-semibold text-foreground leading-snug">
          {getQuestionText(question, lang)}
        </h2>

        {/* Antwoordopties */}
        <div className="flex flex-col gap-3">
          {question.options.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              lang={lang}
              isSelected={selectedOptionId === option.id}
              isDisabled={selectedOptionId !== null}
              onSelect={onSelectOption}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── OptionCard ────────────────────────────────────────────────────────────

interface OptionCardProps {
  option: Option
  lang: Language
  isSelected: boolean
  isDisabled: boolean
  onSelect: (option: Option) => void
}

function OptionCard({ option, lang, isSelected, isDisabled, onSelect }: OptionCardProps) {
  const imageUrl = useBlobUrl(option.image_path)

  return (
    <button
      onClick={() => !isDisabled && onSelect(option)}
      disabled={isDisabled}
      className={[
        'w-full min-h-16 flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left',
        'font-medium text-base transition-all duration-150',
        'touch-manipulation select-none',
        isSelected
          ? 'border-primary bg-primary text-white scale-[0.98]'
          : 'border-border bg-card text-card-foreground hover:border-primary/50 hover:bg-accent active:scale-[0.98]',
        isDisabled && !isSelected ? 'opacity-50 cursor-not-allowed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {imageUrl && (
        <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden">
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      )}
      <span className="flex-1">{getOptionLabel(option, lang)}</span>
    </button>
  )
}

// ─── ThanksScreen ──────────────────────────────────────────────────────────

interface ThanksScreenProps {
  quiz: Quiz
  lang: Language
  onRestart: () => void
}

function ThanksScreen({ quiz, lang, onRestart }: ThanksScreenProps) {
  const thanksImageUrl = useBlobUrl(quiz.thanks_image_path)

  return (
    <div
      className="min-h-screen overflow-y-auto flex flex-col items-center justify-center bg-background px-6 py-8 gap-8"
      onClick={onRestart}
    >
      <div
        className="flex flex-col items-center gap-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bedankafbeelding */}
        {thanksImageUrl && (
          <div className="w-full rounded-2xl overflow-hidden max-h-56">
            <img
              src={thanksImageUrl}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        )}

        {/* Bedanktekst */}
        <p className="text-2xl font-semibold text-center text-foreground leading-snug">
          {getThanksText(quiz, lang)}
        </p>

        {/* QR-code */}
        {quiz.campaign_url && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground text-center">
              {t(lang, 'scanQr')}
            </p>
            <div className="p-3 bg-white rounded-xl shadow-sm border border-border">
              <QRCodeSVG value={quiz.campaign_url} size={180} />
            </div>
          </div>
        )}

        {/* Herstart-knop */}
        <Button
          size="lg"
          className="w-full h-14 text-base"
          onClick={onRestart}
        >
          {t(lang, 'restart')}
        </Button>
      </div>

      {/* Tik-hint */}
      <p className="text-xs text-muted-foreground/60 text-center select-none">
        {lang === 'nl' && 'Tik ergens om de volgende deelnemer te starten'}
        {lang === 'fr' && 'Touchez n\'importe où pour démarrer le prochain participant'}
        {lang === 'en' && 'Tap anywhere to start the next participant'}
      </p>
    </div>
  )
}
