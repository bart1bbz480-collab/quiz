import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// iOS PWA: voeg scrollruimte toe zodat het toetsenbord kan verschijnen.
// In standalone-modus weigert iOS 15 het toetsenbord als de pagina niet scrollbaar is.
const isIosPwa = 'standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true
if (isIosPwa) {
  const spacer = document.createElement('div')
  spacer.style.cssText = 'position:fixed;bottom:0;left:0;width:1px;height:1px;pointer-events:none;'
  document.body.appendChild(spacer)
  document.body.style.paddingBottom = '1px'

  // Bij focus op input/textarea: scroll even zodat iOS keyboard kan openen
  document.addEventListener('focusin', (e) => {
    const el = e.target as HTMLElement
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      window.scrollTo({ top: 1, behavior: 'instant' as ScrollBehavior })
      setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50)
    }
  })
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
