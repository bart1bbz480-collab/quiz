import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// iOS 15 PWA: toetsenbord verschijnt niet bij tap op input in standalone-modus.
// Fix: focus eerst een verborgen input (triggert keyboard-initialisatie in WKWebView),
// verschuif dan naar de echte input.
const isIosPwa = 'standalone' in window.navigator &&
  (window.navigator as unknown as { standalone: boolean }).standalone === true
if (isIosPwa) {
  const dummy = document.createElement('input')
  dummy.setAttribute('type', 'text')
  dummy.setAttribute('inputmode', 'text')
  dummy.style.cssText = 'position:fixed;top:-200px;left:0;width:1px;height:1px;opacity:0;pointer-events:none;'
  document.body.prepend(dummy)

  document.addEventListener('touchend', (e) => {
    const target = e.target as HTMLElement
    if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') return
    if (target === dummy) return
    dummy.focus()
    setTimeout(() => { target.focus() }, 50)
  }, { passive: true })
}

// Persistente opslag aanvragen (US-00)
if (navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {
    // Stille fout: werkt niet op alle browsers/contexten
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
