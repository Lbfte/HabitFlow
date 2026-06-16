"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/utils/supabase/client"

export type Theme = "light" | "dark"

export interface AccentColor {
  name: string
  label: string
  light: string
  dark: string
  gradientStart: string
  gradientEnd: string
}

export const accentColors: AccentColor[] = [
  {
    name: "indigo",
    label: "Indigo",
    light: "#4F46E5",
    dark: "#7B61FF",
    gradientStart: "#7B61FF",
    gradientEnd: "#634ACC"
  },
  {
    name: "violet",
    label: "Violeta",
    light: "#7C3AED",
    dark: "#9F67FF",
    gradientStart: "#9F67FF",
    gradientEnd: "#6D28D9"
  },
  {
    name: "emerald",
    label: "Esmeralda",
    light: "#059669",
    dark: "#10B981",
    gradientStart: "#10B981",
    gradientEnd: "#047857"
  },
  {
    name: "rose",
    label: "Rosa",
    light: "#E11D48",
    dark: "#F43F5E",
    gradientStart: "#F43F5E",
    gradientEnd: "#BE123C"
  },
  {
    name: "ocean",
    label: "Oceano",
    light: "#0284C7",
    dark: "#38BDF8",
    gradientStart: "#38BDF8",
    gradientEnd: "#0369A1"
  },
  {
    name: "amber",
    label: "Âmbar",
    light: "#D97706",
    dark: "#F59E0B",
    gradientStart: "#F59E0B",
    gradientEnd: "#B45309"
  }
]

// ---------------------------------------------------------------------------
// Helpers de storage com prefixo por usuário
// Formato da chave: `hf:{userId}:{key}`
// ---------------------------------------------------------------------------
function storageKey(userId: string | null, key: string) {
  return userId ? `hf:${userId}:${key}` : `hf:anon:${key}`
}

function getStored(userId: string | null, key: string): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(storageKey(userId, key))
}

function setStored(userId: string | null, key: string, value: string) {
  if (typeof window === "undefined") return
  localStorage.setItem(storageKey(userId, key), value)
  if (key === "theme") {
    localStorage.setItem("hf:theme-preference", value)
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const ThemeContext = createContext<{
  theme: Theme
  accent: string
  toggleTheme: () => void
  changeAccent: (accentName: string) => void
}>({ theme: "dark", accent: "indigo", toggleTheme: () => {}, changeAccent: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark")
  const [accent, setAccent] = useState<string>("indigo")
  const [userId, setUserId] = useState<string | null>(null)
  const prevUserIdRef = useRef<string | null>(null)

  // Carrega o userId e escuta mudanças de autenticação
  useEffect(() => {
    const supabase = createClient()
    
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const applyAccent = useCallback((accentName: string, currentTheme: Theme) => {
    const colorObj = accentColors.find(a => a.name === accentName) || accentColors[0]
    const root = document.documentElement
    const colorValue = currentTheme === "dark" ? colorObj.dark : colorObj.light
    root.style.setProperty("--indigo", colorValue)
    root.style.setProperty("--indigo-gradient-start", colorObj.gradientStart)
    root.style.setProperty("--indigo-gradient-end", colorObj.gradientEnd)
  }, [])

  // Carrega preferências assim que o userId estiver disponível
  useEffect(() => {
    const isLogout = prevUserIdRef.current !== null && userId === null
    
    if (isLogout) {
      // Transição de logout: copia tema e accent do usuário para a sessão anônima para evitar oscilações
      const prevUid = prevUserIdRef.current
      const prevTheme = (getStored(prevUid, "theme") as Theme | null) || "dark"
      const prevAccent = getStored(prevUid, "accent") || "indigo"
      
      setStored(null, "theme", prevTheme)
      setStored(null, "accent", prevAccent)
      setTheme(prevTheme)
      setAccent(prevAccent)
      applyAccent(prevAccent, prevTheme)
      
      // Garante que a classe de tema escuro seja mantida no HTML para evitar o flash claro no logout
      document.documentElement.classList.toggle("dark", prevTheme === "dark")
      
      prevUserIdRef.current = userId
      return
    }

    prevUserIdRef.current = userId

    const savedTheme = getStored(userId, "theme") as Theme | null
    const savedAccent = getStored(userId, "accent") || "indigo"

    let activeTheme: Theme = "dark"
    if (savedTheme) {
      activeTheme = savedTheme
      setTheme(savedTheme)
      document.documentElement.classList.toggle("dark", savedTheme === "dark")
    } else {
      setTheme("dark")
      document.documentElement.classList.add("dark")
      setStored(userId, "theme", "dark")
    }

    setAccent(savedAccent)
    applyAccent(savedAccent, activeTheme)
  }, [userId, applyAccent])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    setStored(userId, "theme", newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
    applyAccent(accent, newTheme)
  }

  const changeAccent = (newAccent: string) => {
    setAccent(newAccent)
    setStored(userId, "accent", newAccent)
    applyAccent(newAccent, theme)
  }

  return (
    <ThemeContext.Provider value={{ theme, accent, toggleTheme, changeAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
