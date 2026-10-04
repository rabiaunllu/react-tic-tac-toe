import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function getApiOrigin(apiBaseUrl) {
  if (!apiBaseUrl) {
    return null
  }

  const apiUrl = new URL(apiBaseUrl)

  if (!['http:', 'https:'].includes(apiUrl.protocol)) {
    throw new Error('VITE_API_BASE_URL must use http or https.')
  }

  return apiUrl.origin
}

function productionCspPlugin(contentSecurityPolicy) {
  return {
    name: 'production-csp',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: contentSecurityPolicy,
          },
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  const base = env.VITE_BASE_PATH?.trim() || '/'
  const apiOrigin = getApiOrigin(env.VITE_API_BASE_URL?.trim())
  const wsOrigin = apiOrigin ? apiOrigin.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:') : null
  const connectSources = [
    "'self'",
    apiOrigin,
    wsOrigin,
    'https://xotactix.me',
    'wss://xotactix.me',
    'https://*.crazygames.com',
    'https://games.crazygames.com',
    'https://pagead2.googlesyndication.com',
    'https://*.google.com',
    'https://*.googlesyndication.com',
  ]
    .filter(Boolean)
    .join(' ')
  const contentSecurityPolicy =
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://sdk.crazygames.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com; " +
    "worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; frame-src 'self' https://googleads.g.doubleclick.net https://*.google.com https://*.googlesyndication.com; connect-src " +
    `${connectSources}; object-src 'none'; base-uri 'self'; form-action 'self'`

  return {
    base,
    plugins: [react(), productionCspPlugin(contentSecurityPolicy)],
  }
})
