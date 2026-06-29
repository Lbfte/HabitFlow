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
    label: "Vermelho",
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
  customAccentColor: string
  toggleTheme: () => void
  changeAccent: (accentName: string) => void
  setCustomAccent: (colorHex: string) => void
}>({ 
  theme: "dark", 
  accent: "indigo", 
  customAccentColor: "#6366F1", 
  toggleTheme: () => {}, 
  changeAccent: () => {},
  setCustomAccent: () => {}
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark")
  const [accent, setAccent] = useState<string>("indigo")
  const [customAccentColor, setCustomAccentColor] = useState<string>("#6366F1")
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

  const applyAccent = useCallback((accentName: string, currentTheme: Theme, customColor?: string) => {
    const root = document.documentElement
    if (accentName === "custom") {
      const activeCustom = customColor || getStored(userId, "custom-accent-color") || "#6366F1"
      root.style.setProperty("--indigo", activeCustom)
      root.style.setProperty("--indigo-gradient-start", activeCustom)
      root.style.setProperty("--indigo-gradient-end", activeCustom)
      return
    }

    const colorObj = accentColors.find(a => a.name === accentName) || accentColors[0]
    const colorValue = currentTheme === "dark" ? colorObj.dark : colorObj.light
    root.style.setProperty("--indigo", colorValue)
    root.style.setProperty("--indigo-gradient-start", colorObj.gradientStart)
    root.style.setProperty("--indigo-gradient-end", colorObj.gradientEnd)
  }, [userId])

  // Carrega preferências assim que o userId estiver disponível
  useEffect(() => {
    const isLogout = prevUserIdRef.current !== null && userId === null
    
    if (isLogout) {
      // Transição de logout: copia tema e accent do usuário para a sessão anônima para evitar oscilações
      const prevUid = prevUserIdRef.current
      const prevTheme = (getStored(prevUid, "theme") as Theme | null) || "dark"
      const prevAccent = getStored(prevUid, "accent") || "indigo"
      const prevCustomColor = getStored(prevUid, "custom-accent-color") || "#6366F1"
      
      setStored(null, "theme", prevTheme)
      setStored(null, "accent", prevAccent)
      setStored(null, "custom-accent-color", prevCustomColor)
      setTheme(prevTheme)
      setAccent(prevAccent)
      setCustomAccentColor(prevCustomColor)
      applyAccent(prevAccent, prevTheme, prevCustomColor)
      
      // Garante que a classe de tema escuro seja mantida no HTML para evitar o flash claro no logout
      document.documentElement.classList.toggle("dark", prevTheme === "dark")
      
      prevUserIdRef.current = userId
      return
    }

    prevUserIdRef.current = userId

    const savedTheme = getStored(userId, "theme") as Theme | null
    const savedAccent = getStored(userId, "accent") || "indigo"
    const savedCustomAccent = getStored(userId, "custom-accent-color") || "#6366F1"

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

    setCustomAccentColor(savedCustomAccent)
    setAccent(savedAccent)
    applyAccent(savedAccent, activeTheme, savedCustomAccent)
  }, [userId, applyAccent])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    setStored(userId, "theme", newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
    applyAccent(accent, newTheme, customAccentColor)
  }

  const changeAccent = (newAccent: string) => {
    setAccent(newAccent)
    setStored(userId, "accent", newAccent)
    applyAccent(newAccent, theme, customAccentColor)
  }

  const setCustomAccent = (colorHex: string) => {
    setCustomAccentColor(colorHex)
    setStored(userId, "custom-accent-color", colorHex)
    setAccent("custom")
    setStored(userId, "accent", "custom")
    applyAccent("custom", theme, colorHex)
  }

  return (
    <ThemeContext.Provider value={{ theme, accent, customAccentColor, toggleTheme, changeAccent, setCustomAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
