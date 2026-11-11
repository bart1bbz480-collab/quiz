import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

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
