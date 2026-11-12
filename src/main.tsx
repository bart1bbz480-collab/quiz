import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// iOS PWA: toetsenbord verschijnt niet zonder expliciete focus bij touchend
document.addEventListener('touchend', (e) => {
  const el = e.target as HTMLElement
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    setTimeout(() => (el as HTMLInputElement).focus(), 0)
  }
}, { passive: true })

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
