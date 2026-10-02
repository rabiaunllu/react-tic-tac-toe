import { useState, useEffect, useCallback, useMemo } from 'react'
import { LanguageContext } from './context.js'
import tr from './tr.js'
import en from './en.js'

const STORAGE_KEY = 'xo-arena-lang'
const dictionaries = { tr, en }

function getCrazyGamesLocale() {
  try {
    // CrazyGames SDK v3: user.systemInfo provides locale info
    if (!window.CrazyGames?.SDK?.initialized) return null
    const systemInfo = window.CrazyGames.SDK.user?.systemInfo
    if (systemInfo?.countryCode?.toLowerCase() === 'tr') return 'tr'
    if (systemInfo?.language?.toLowerCase()?.startsWith('tr')) return 'tr'
    if (systemInfo?.language?.toLowerCase()?.startsWith('en')) return 'en'
    if (systemInfo?.language) return 'en' // Known locale but not TR → default EN
  } catch {
    // SDK not available
  }
  return null
}

function getInitialLanguage() {
  if (typeof window === 'undefined') return 'tr'

  try {
    // 0. CrazyGames SDK locale (highest priority on CG platform)
    const cgLocale = getCrazyGamesLocale()
    if (cgLocale) return cgLocale

    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved && (saved === 'tr' || saved === 'en')) {
      return saved
    }

    // 1. URL parameter override: ?lang=tr or ?lang=en
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const urlLang = urlParams.get('lang')
      if (urlLang === 'tr' || urlLang === 'en') {
        return urlLang
      }
    } catch {
      // Ignored if URL parsing fails
    }

    // 2. Check if running on CrazyGames portal (always default to EN for global portal)
    const isCrazyGames =
      (typeof window.location !== 'undefined' && window.location.hostname.includes('crazygames')) ||
      (typeof document !== 'undefined' && document.referrer.includes('crazygames'))

    if (isCrazyGames) {
      return 'en'
    }

    // 3. Check browser language list (any Turkish preference in list, e.g. ['en-US', 'tr-TR', 'tr'])
    const allLangs = window.navigator?.languages?.length
      ? Array.from(window.navigator.languages)
      : [window.navigator?.language || '']
    const hasTurkish = allLangs.some((lang) => typeof lang === 'string' && lang.toLowerCase().startsWith('tr'))
    if (hasTurkish) {
      return 'tr'
    }

    // 4. Timezone detection: Users in Turkey have Europe/Istanbul or Turkey timezone
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
      if (
        timeZone.includes('Istanbul') ||
        timeZone === 'Turkey'
      ) {
        return 'tr'
      }
    } catch {
      // Timezone detection optional
    }

    // 5. Global fallback for users outside Turkey
    return 'en'
  } catch {
    return 'tr'
  }
}

function resolveNestedKey(obj, path) {
  if (!obj || typeof obj !== 'object') return undefined
  const parts = path.split('.')
  let current = obj

  for (const part of parts) {
    if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
      return undefined
    }
    if (current && Object.prototype.hasOwnProperty.call(current, part)) {
      current = current[part]
    } else {
      return undefined
    }
  }

  return current
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage)

  const setLanguage = useCallback((newLang) => {
    if (newLang !== 'tr' && newLang !== 'en') return
    setLanguageState(newLang)
    try {
      window.localStorage.setItem(STORAGE_KEY, newLang)
    } catch {
      // Ignored if storage is blocked
    }
  }, [])

  // Sync document html lang & title
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.lang = language
    const currentDict = dictionaries[language] || dictionaries.en
    if (currentDict?.meta?.title) {
      document.title = currentDict.meta.title
    }
  }, [language])

  const t = useCallback(
    (key, params = {}) => {
      const activeDict = dictionaries[language] || dictionaries.en
      const fallbackDict = dictionaries.en

      let text = resolveNestedKey(activeDict, key)
      if (text === undefined && activeDict !== fallbackDict) {
        text = resolveNestedKey(fallbackDict, key)
      }

      if (text === undefined || typeof text !== 'string') {
        return key
      }

      // Safe parameter interpolation: {{param}}
      if (params && typeof params === 'object') {
        return text.replace(/\{\{(\w+)\}\}/g, (_, match) => {
          return params[match] !== undefined ? String(params[match]) : `{{${match}}}`
        })
      }

      return text
    },
    [language]
  )

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
