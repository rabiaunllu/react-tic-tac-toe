import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { LanguageProvider } from './i18n'

if (typeof window !== 'undefined') {
  const savedSkin = window.localStorage.getItem('xo-arena-skin') || 'neon'
  document.body.setAttribute('data-skin', savedSkin)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>
  </StrictMode>,
)

