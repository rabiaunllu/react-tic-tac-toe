import { createContext, useContext } from 'react'

export const LanguageContext = createContext({
  language: 'tr',
  setLanguage: () => {},
  t: (key) => key,
})

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider')
  }
  return context
}
