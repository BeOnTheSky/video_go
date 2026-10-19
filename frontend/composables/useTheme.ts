type Theme = 'dark' | 'light'

const THEME_KEY = 'xilixili-theme'

const currentTheme = ref<Theme>('dark')
let initialized = false

export function useTheme() {
  if (!initialized && typeof window !== 'undefined') {
    initialized = true
    const stored = localStorage.getItem(THEME_KEY) as Theme | null
    if (stored === 'light' || stored === 'dark') {
      currentTheme.value = stored
    } else {
      // VISIO 使用深色作为首次访问的默认主题；仍尊重用户手动保存的主题偏好。
      currentTheme.value = 'dark'
    }
    applyTheme(currentTheme.value)
  }

  function applyTheme(theme: Theme) {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }

  function setTheme(theme: Theme) {
    currentTheme.value = theme
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_KEY, theme)
      applyTheme(theme)
    }
  }

  function toggleTheme() {
    setTheme(currentTheme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    currentTheme: readonly(currentTheme),
    setTheme,
    toggleTheme,
  }
}
