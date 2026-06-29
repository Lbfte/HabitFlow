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
  const boardId = searchParams.get("id") || ""
  const [boardName, setBoardName] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (!boardId) {
      router.push("/whiteboards")
      return
    }

    const fetchBoard = async () => {
      try {
        const { data, error } = await supabase
          .from("habit_boards")
          .select("*")
          .eq("id", boardId)
          .single()

        if (error || !data) {
          console.error("Erro ao buscar quadro:", error)
          router.push("/whiteboards")
          return
        }

        const contentObj = (data as any).content && typeof (data as any).content === "object" ? (data as any).content : {}
        setBoardName((data as any).name || contentObj.name || "Quadro de Estudos")
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchBoard()
  }, [boardId, supabase, router])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="w-8 h-8 text-indigo animate-spin" />
        <p className="text-muted animate-pulse font-medium">Verificando informações do quadro...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-28 sm:pb-8 pt-10 sm:pt-0">
      <Whiteboard boardId={boardId} boardName={boardName} />
    </div>
  )
}

// Em exportações estáticas, useSearchParams deve ser embrulhado em Suspense
export default function WhiteboardDetailPage() {
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
