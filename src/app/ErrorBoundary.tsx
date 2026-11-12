import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 480, margin: '40px auto' }}>
          <h2 style={{ color: '#dc2626', marginBottom: 12 }}>Er is een fout opgetreden</h2>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
            Sluit de app volledig af en open hem opnieuw. Als dit blijft gebeuren, verwijder de app
            van het beginscherm en installeer hem opnieuw via de browser.
          </p>
          <details style={{ fontSize: 12, color: '#9ca3af' }}>
            <summary style={{ cursor: 'pointer', marginBottom: 8 }}>Technische details</summary>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16, padding: '10px 20px', background: '#2563eb',
              color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
            }}
          >
            Opnieuw proberen
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
