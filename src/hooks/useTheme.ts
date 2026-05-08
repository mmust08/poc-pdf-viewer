import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = document.documentElement.getAttribute('data-theme') as Theme | null
    if (stored) return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    const handler = () => {
      setTheme((document.documentElement.getAttribute('data-theme') as Theme) ?? 'light')
    }
    window.addEventListener('theme-changed', handler)
    return () => window.removeEventListener('theme-changed', handler)
  }, [])

  const toggleTheme = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    const html = document.documentElement
    html.classList.add('theme-transitioning')
    html.setAttribute('data-theme', next)
    try { localStorage.setItem('theme', next) } catch { /* storage unavailable */ }
    setTheme(next)
    window.dispatchEvent(new Event('theme-changed'))
    setTimeout(() => html.classList.remove('theme-transitioning'), 500)
  }

  return { theme, toggleTheme, isDark: theme === 'dark' }
}
