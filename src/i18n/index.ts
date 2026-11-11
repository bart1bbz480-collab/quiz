import type { Language } from '@/types'

// Alle vaste teksten in de enquête-flow per taal (NL/FR/EN)
// De rest van de app (interviewer- en admin-schermen) is altijd Nederlands.

export const surveyI18n = {
  nl: {
    chooseLanguage: 'Kies je taal',
    question: 'Vraag',
    of: 'van',
    restart: 'Herstart',
    thanks: 'Bedankt voor je deelname!',
    yes: 'Ja',
    no: 'Nee',
    dontKnow: 'Weet ik niet',
    scanQr: 'Scan de QR-code voor meer info',
  },
  fr: {
    chooseLanguage: 'Choisissez votre langue',
    question: 'Question',
    of: 'sur',
    restart: 'Recommencer',
    thanks: 'Merci de votre participation\u00a0!',
    yes: 'Oui',
    no: 'Non',
    dontKnow: 'Je ne sais pas',
    scanQr: 'Scannez le QR code pour plus d\u2019infos',
  },
  en: {
    chooseLanguage: 'Choose your language',
    question: 'Question',
    of: 'of',
    restart: 'Restart',
    thanks: 'Thank you for your participation!',
    yes: 'Yes',
    no: 'No',
    dontKnow: "I don't know",
    scanQr: 'Scan the QR code for more info',
  },
} as const satisfies Record<Language, Record<string, string>>

export type SurveyI18nKey = keyof (typeof surveyI18n)['nl']

export function t(lang: Language, key: SurveyI18nKey): string {
  return surveyI18n[lang][key]
}

export const languageLabels: Record<Language, string> = {
  nl: 'Nederlands',
  fr: 'Français',
  en: 'English',
}

export const languageFlags: Record<Language, string> = {
  nl: '🇧🇪',
  fr: '🇫🇷',
  en: '🇬🇧',
}
