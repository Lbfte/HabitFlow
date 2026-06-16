/**
 * useUserStorage
 *
 * Encapsula o localStorage com prefixo por userId, garantindo que as
 * preferências (tema, cor, banner, etc.) sejam individuais por conta.
 *
 * Chaves ficam no formato: `hf:{userId}:{key}`
 * Enquanto o userId não estiver disponível, as chaves ficam globais
 * como fallback transitório.
 */

"use client"

import { useCallback } from "react"

export function useUserStorage(userId: string | null | undefined) {
  const prefix = userId ? `hf:${userId}:` : "hf:anon:"

  const getItem = useCallback(
    (key: string): string | null => {
      if (typeof window === "undefined") return null
      return localStorage.getItem(`${prefix}${key}`)
    },
    [prefix]
  )

  const setItem = useCallback(
    (key: string, value: string): void => {
      if (typeof window === "undefined") return
      localStorage.setItem(`${prefix}${key}`, value)
    },
    [prefix]
  )

  const removeItem = useCallback(
    (key: string): void => {
      if (typeof window === "undefined") return
      localStorage.removeItem(`${prefix}${key}`)
    },
    [prefix]
  )

  return { getItem, setItem, removeItem }
}
