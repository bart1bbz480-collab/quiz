import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { getPublicImageUrl } from '@/lib/image'
import { cn } from '@/lib/utils'
import type { QuestionType } from '@/types'

// ─── Public types ──────────────────────────────────────────────────────────────

export interface PreviewData {
  thanks_text_nl: string
  thanks_text_fr: string
  thanks_text_en: string
  thanks_image_url: string | null
  campaign_url: string
  questions: Array<{
    type: QuestionType
    text_nl: string
    text_fr: string
    text_en: string
    image_path: string | null
    options: Array<{
      label_nl: string
      label_fr: string
      label_en: string
      image_path: string | null
    }>
  }>
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

type Lang = 'nl' | 'fr' | 'en'

function t(nl: string, fr: string, en: string, lang: Lang): string {
  if (lang === 'fr') return fr.trim() || nl
  if (lang === 'en') return en.trim() || nl
  return nl
}

const FIXED_YES_NO: Array<{ nl: string; fr: string; en: string }> = [
  { nl: 'Ja', fr: 'Oui', en: 'Yes' },
  { nl: 'Nee', fr: 'Non', en: 'No' },
  { nl: 'Weet ik niet', fr: 'Je ne sais pas', en: "I don't know" },
]

const FLAG: Record<Lang, string> = { nl: '🇧🇪', fr: '🇫🇷', en: '🇬🇧' }
const LANG_LABEL: Record<Lang, string> = { nl: 'NL', fr: 'FR', en: 'EN' }

// ─── QuizPreview ───────────────────────────────────────────────────────────────

export function QuizPreview({ data }: { data: PreviewData }) {
  const [lang, setLang] = useState<Lang | null>(null)
  const [step, setStep] = useState<number>(0)

  const { questions } = data
  const totalSteps = questions.length

  const isLangComplete = (l: Lang): boolean => {
    if (l === 'nl') return true
    return questions.every((q) => {
      const text = l === 'fr' ? q.text_fr : q.text_en
      return text.trim() !== ''
    })
  }

  const startLang = (l: Lang) => {
    setLang(l)
    setStep(1)
  }

  const reset = () => {
    setLang(null)
    setStep(0)
  }

  const goNext = () => setStep((s) => s + 1)
  const goPrev = () => setStep((s) => Math.max(1, s - 1))

  const currentQuestion = lang !== null && step >= 1 && step <= totalSteps
    ? questions[step - 1]
    : null

  const isThanksPage = lang !== null && step > totalSteps

  const getOptions = (q: typeof questions[number]) => {
    if (q.type === 'yes_no_unknown') {
      return FIXED_YES_NO.map((o) => ({
        label: lang ? t(o.nl, o.fr, o.en, lang) : o.nl,
        image_path: null,
      }))
    }
    return q.options.map((o) => ({
      label: lang ? t(o.label_nl, o.label_fr, o.label_en, lang) : o.label_nl,
      image_path: o.image_path,
    }))
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Preview banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 mb-6 text-xs font-medium text-blue-700 text-center tracking-wide">
        VOORBEELDWEERGAVE — geen data wordt opgeslagen
      </div>

      <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden">
        {/* ── Taalkeuze scherm ── */}
        {lang === null && (
          <div className="p-8 flex flex-col items-center gap-6">
            <h2 className="text-lg font-semibold text-center">Kies je taal / Choisissez votre langue / Choose your language</h2>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              {(['nl', 'fr', 'en'] as Lang[]).map((l) => {
                const complete = isLangComplete(l)
                return (
                  <button
                    key={l}
                    type="button"
                    disabled={!complete}
                    onClick={() => startLang(l)}
                    className={cn(
                      'flex items-center justify-center gap-3 rounded-lg border-2 px-6 py-4 text-base font-medium transition-colors',
                      complete
                        ? 'border-border hover:border-primary hover:bg-primary/5 cursor-pointer'
                        : 'border-border opacity-40 cursor-not-allowed'
                    )}
                  >
                    <span className="text-2xl">{FLAG[l]}</span>
                    <span>{LANG_LABEL[l]}</span>
                  </button>
                )
              })}
            </div>
            {questions.length === 0 && (
              <p className="text-sm text-muted-foreground">Nog geen vragen toegevoegd.</p>
            )}
          </div>
        )}

        {/* ── Vraagscherm ── */}
        {currentQuestion !== null && lang !== null && (
          <div className="p-6 flex flex-col gap-5">
            {/* Voortgang */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Vraag {step} van {totalSteps}
              </span>
              <div className="flex gap-1">
                {questions.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1.5 rounded-full transition-colors',
                      i < step ? 'bg-primary' : 'bg-muted',
                      totalSteps <= 5 ? 'w-8' : 'w-4'
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Vraagtekst */}
            <div>
              <p className="text-base font-semibold leading-snug">
                {t(currentQuestion.text_nl, currentQuestion.text_fr, currentQuestion.text_en, lang) || (
                  <span className="text-muted-foreground italic">Geen vraagtekst ingevoerd</span>
                )}
              </p>
            </div>

            {/* Vraagafbeelding */}
            {currentQuestion.image_path && (
              <img
                src={getPublicImageUrl(currentQuestion.image_path)}
                alt="Vraagafbeelding"
                className="w-full max-h-48 object-cover rounded-lg border border-border"
              />
            )}

            {/* Opties */}
            <div className="flex flex-col gap-2">
              {getOptions(currentQuestion).map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={goNext}
                  className="flex items-center gap-3 min-h-16 rounded-lg border-2 border-border px-4 py-3 text-left text-sm font-medium transition-colors hover:border-primary hover:bg-primary/5 cursor-pointer"
                >
                  {opt.image_path && (
                    <img
                      src={getPublicImageUrl(opt.image_path)}
                      alt=""
                      className="w-10 h-10 object-cover rounded flex-shrink-0"
                    />
                  )}
                  <span>{opt.label || <span className="text-muted-foreground italic">Geen label</span>}</span>
                </button>
              ))}
            </div>

            {/* Navigatie */}
            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={step <= 1}
                onClick={goPrev}
              >
                ← Vorige
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={reset}
                className="text-muted-foreground"
              >
                Opnieuw beginnen
              </Button>
            </div>
          </div>
        )}

        {/* ── Bedankpagina ── */}
        {isThanksPage && lang !== null && (
          <div className="p-8 flex flex-col items-center gap-6 text-center">
            {data.thanks_image_url && (
              <img
                src={data.thanks_image_url}
                alt="Bedankafbeelding"
                className="w-full max-h-56 object-cover rounded-lg border border-border"
              />
            )}
            <p className="text-base font-medium leading-relaxed whitespace-pre-line">
              {t(data.thanks_text_nl, data.thanks_text_fr, data.thanks_text_en, lang) ||
                <span className="text-muted-foreground italic">Geen bedanktekst ingevoerd</span>
              }
            </p>
            {data.campaign_url && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground">Scan de QR-code</p>
                <div className="p-3 bg-white rounded-xl shadow-sm border border-border">
                  <QRCodeSVG value={data.campaign_url} size={160} />
                </div>
              </div>
            )}
            <Button type="button" onClick={reset}>
              Opnieuw beginnen
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
