"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { createClient } from "@/utils/supabase/client"
import { Loader2 } from "lucide-react"

// Importar o Whiteboard dinamicamente desativando SSR
const Whiteboard = dynamic(() => import("@/components/Whiteboard"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-[650px] bg-surface rounded-3xl border border-border shadow-soft gap-4">
      <Loader2 className="w-8 h-8 text-indigo animate-spin" />
      <p className="text-muted animate-pulse font-medium">Carregando quadro de estudos...</p>
    </div>
  ),
})

function BoardContent() {
  const searchParams = useSearchParams()
  const habitId = searchParams.get("id") || ""
  const [habitName, setHabitName] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (!habitId) {
      router.push("/habits")
      return
    }

    const fetchHabit = async () => {
      try {
        const { data, error } = await supabase
          .from("habits")
          .select("name")
          .eq("id", habitId)
          .single()

        if (error || !data) {
          console.error("Erro ao buscar hábito:", error)
          router.push("/habits")
          return
        }

        setHabitName(data.name)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchHabit()
  }, [habitId, supabase, router])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="w-8 h-8 text-indigo animate-spin" />
        <p className="text-muted animate-pulse font-medium">Verificando informações do hábito...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Whiteboard habitId={habitId} habitName={habitName} />
    </div>
  )
}

// Em exportações estáticas, useSearchParams deve ser embrulhado em Suspense
export default function HabitBoardPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="w-8 h-8 text-indigo animate-spin" />
        <p className="text-muted animate-pulse font-medium">Preparando ambiente...</p>
      </div>
    }>
      <BoardContent />
    </Suspense>
  )
}
