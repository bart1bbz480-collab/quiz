import { useEffect, useState } from 'react'

export type InstallState = 'loading' | 'installed' | 'not-installed' | 'dev-bypass'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null

export function useInstallPrompt() {
  const [installState, setInstallState] = useState<InstallState>('loading')
  const [canPrompt, setCanPrompt] = useState(false)

  useEffect(() => {
    // Dev bypass via ?dev=1
    if (new URLSearchParams(window.location.search).get('dev') === '1') {
      setInstallState('dev-bypass')
      return
    }

    // Detecteer standalone modus (geïnstalleerd)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)

    if (isStandalone) {
      setInstallState('installed')
      return
    }

    setInstallState('not-installed')

    // Android: vang beforeinstallprompt op
    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt = e as BeforeInstallPromptEvent
      setCanPrompt(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const triggerInstall = async (): Promise<void> => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setInstallState('installed')
    }
    deferredPrompt = null
    setCanPrompt(false)
  }

  // Detecteer iOS
  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  return { installState, canPrompt, triggerInstall, isIos }
}
