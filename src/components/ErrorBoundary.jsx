import { Component } from 'react'

/**
 * ErrorBoundary — catches unexpected React render errors.
 * Without this, any unhandled JS exception in the component tree
 * causes a total White Screen of Death with zero user feedback.
 *
 * Wraps <App /> at the root level (main.jsx).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
    this.handleReset = this.handleReset.bind(this)
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message ?? 'Bilinmeyen bir hata oluştu.',
    }
  }

  componentDidCatch(error, info) {
    // In production we avoid console.log, but this is a legitimate
    // diagnostic channel for the developer (not sensitive user data).
    if (typeof window !== 'undefined' && !import.meta.env.PROD) {
      console.error('[ErrorBoundary]', error, info?.componentStack)
    }
  }

  handleReset() {
    this.setState({ hasError: false, errorMessage: '' })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    const isTr = typeof document !== 'undefined' && document.documentElement.lang === 'tr'

    return (
      <main className="app-shell" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <section
          className="game-card setup-card"
          style={{ textAlign: 'center', padding: '2.5rem 2rem', maxWidth: 420 }}
        >
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-primary, #e2e8f0)' }}>
            {isTr ? 'Beklenmeyen Bir Hata' : 'Unexpected Error'}
          </h2>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', marginBottom: '2rem', lineHeight: 1.6 }}>
            {isTr ? 'Uygulama beklenmedik bir sorunla karşılaştı.' : 'The game encountered an unexpected issue.'}
            <br />
            {isTr ? 'Sayfayı yenileyerek veya menüye dönerek devam edebilirsin.' : 'You can continue by reloading or continuing.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="start-game-button"
              onClick={() => window.location.reload()}
            >
              🔄 {isTr ? 'Sayfayı Yenile' : 'Reload Page'}
            </button>
            <button
              type="button"
              className="viral-btn-secondary"
              onClick={this.handleReset}
            >
              ← {isTr ? 'Devam Et' : 'Continue'}
            </button>
          </div>
        </section>
      </main>
    )
  }
}
