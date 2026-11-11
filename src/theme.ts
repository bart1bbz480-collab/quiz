/**
 * Centraal thema-bestand.
 * Pas hier kleuren, lettertypes en iconen aan om de huisstijl toe te passen (Fase 7).
 * De waarden hier worden gesynchroniseerd met de Tailwind @theme in index.css
 * en met de PWA-manifest kleuren in vite.config.ts.
 */

export const theme = {
  colors: {
    primary: '#2563eb',
    primaryForeground: '#ffffff',
    background: '#ffffff',
    foreground: '#0f172a',
    muted: '#f8fafc',
    mutedForeground: '#64748b',
    border: '#e2e8f0',
    destructive: '#ef4444',
  },
  pwa: {
    themeColor: '#2563eb',
    backgroundColor: '#ffffff',
    name: 'Straatinterview Quiz',
    shortName: 'Quiz',
  },
  fonts: {
    sans: 'system-ui, -apple-system, sans-serif',
  },
} as const
