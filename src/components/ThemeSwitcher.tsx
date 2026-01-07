"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeSwitcher() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const activeTheme = React.useMemo(() => {
    if (!mounted) return undefined
    if (!theme || theme === "system") return resolvedTheme
    return theme
  }, [mounted, resolvedTheme, theme])

  if (!mounted) {
    return (
      <button className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800">
        <Sun className="h-4 w-4" />
        <span className="sr-only">Toggle theme</span>
      </button>
    )
  }

  return (
    <button
      onClick={() => {
        document.body.classList.add("theme-transitioning")
        const nextTheme = activeTheme === "dark" ? "light" : "dark"
        setTheme(nextTheme)
        setTimeout(() => {
          document.body.classList.remove("theme-transitioning")
        }, 300)
      }}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    >
      {activeTheme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
