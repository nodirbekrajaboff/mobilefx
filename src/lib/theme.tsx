import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'

import { getLocale, overwriteGetLocale, setLocale as setParaglideLocale } from '#/paraglide/runtime'

export type ThemeMode = 'light' | 'dark' | 'system'
export type AppLanguage = 'uz' | 'ru' | 'en'

interface ThemeContextValue {
  theme: ThemeMode
  resolvedTheme: 'light' | 'dark'
  setTheme: (next: ThemeMode) => void
  language: AppLanguage
  setLanguage: (next: AppLanguage) => void
}

const THEME_STORAGE_KEY = 'mf_theme_mode'
const LANG_STORAGE_KEY = 'mf_app_language'

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [language, setLanguageState] = useState<AppLanguage>('uz')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
      setThemeState(savedTheme)
    }

    const savedLang = window.localStorage.getItem(LANG_STORAGE_KEY) as AppLanguage | null
    if (savedLang === 'uz' || savedLang === 'ru' || savedLang === 'en') {
      overwriteGetLocale(() => savedLang)
      try {
        setParaglideLocale(savedLang, { reload: false })
      } catch {
        // Ignore if Paraglide runtime does not need reload
      }
      setLanguageState(savedLang)
      document.documentElement.setAttribute('lang', savedLang)
    } else {
      const initial = getLocale()
      if (initial === 'en' || initial === 'uz' || initial === 'ru') {
        overwriteGetLocale(() => initial)
        setLanguageState(initial)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const root = document.documentElement

    const applyTheme = (mode: ThemeMode) => {
      const effective = mode === 'system' ? getSystemTheme() : mode
      setResolvedTheme(effective)
      root.classList.remove('light', 'dark')
      root.classList.add(effective)
      root.setAttribute('data-theme', effective)
    }

    applyTheme(theme)

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = () => applyTheme('system')
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    }
  }, [theme])

  const setTheme = (next: ThemeMode) => {
    setThemeState(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    }
  }

  const setLanguage = (next: AppLanguage) => {
    overwriteGetLocale(() => next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANG_STORAGE_KEY, next)
      document.documentElement.setAttribute('lang', next)
    }
    try {
      setParaglideLocale(next, { reload: false })
    } catch {
      // Ignore if Paraglide runtime does not need reload
    }
    setLanguageState(next)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        language,
        setLanguage,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
