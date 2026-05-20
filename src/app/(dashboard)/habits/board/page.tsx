"use client"

import { useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Loader2 } from "lucide-react"

function BoardRedirector() {
  const searchParams = useSearchParams()
  const habitId = searchParams.get("id") || ""
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (!habitId) {
      router.push("/habits")
      return
    }

    const checkAndRedirect = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/login")
          return
        }

        // 1. Verificar se já existe um quadro vinculado a este hábito
        const { data: existingBoard } = await supabase
          .from("habit_boards")
          .select("id")
          .eq("habit_id", habitId)
          .maybeSingle()

        if (existingBoard) {
          // Redireciona diretamente para o novo caminho do Excalidraw
          router.replace(`/whiteboards/board?id=${existingBoard.id}`)
          return
        }

        // 2. Buscar o nome do hábito para criar um quadro personalizado
        const { data: habit } = await supabase
          .from("habits")
          .select("name")
          .eq("id", habitId)
          .single()

        if (!habit) {
          router.push("/habits")
          return
        }

        // 3. Criar automaticamente um novo quadro Excalidraw. 
        // Tentamos com o campo 'name'. Se der erro PGRST204 (coluna não existe no cache),
        // tentamos sem o campo 'name' para garantir resiliência total!
        let newBoard = null
        let insertError = null

        try {
          const { data, error } = await supabase
            .from("habit_boards")
            .insert({
              name: `Quadro: ${habit.name}`,
              habit_id: habitId,
              user_id: user.id,
              content: { elements: [], appState: { theme: "light" }, files: {} },
              updated_at: new Date().toISOString()
            })
            .select("id")
            .single()
          
          newBoard = data
          insertError = error
        } catch (e) {
          insertError = e
        }

        // Fallback resiliente: caso a coluna 'name' ainda não esteja no cache do Supabase
        if (insertError && ((insertError as any).code === "PGRST204" || String((insertError as any).message).includes("name"))) {
          console.warn("Coluna 'name' não detectada no cache da API. Utilizando fallback sem nome...")
          const { data, error } = await supabase
            .from("habit_boards")
            .insert({
              habit_id: habitId,
              user_id: user.id,
              content: { elements: [], appState: { theme: "light" }, files: {} },
              updated_at: new Date().toISOString()
            })
            .select("id")
            .single()
          
          newBoard = data
          insertError = error
        }

        if (insertError || !newBoard) {
          console.error("Erro ao gerar quadro automático:", insertError)
          router.push("/habits")
          return
        }

        // Redirecionar para o quadro recém-criado!
        router.replace(`/whiteboards/board?id=${newBoard.id}`)
      } catch (err) {
        console.error(err)
        router.push("/habits")
      }
    }

    checkAndRedirect()
  }, [habitId, supabase, router])

  return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <Loader2 className="w-8 h-8 text-indigo animate-spin" />
      <p className="text-muted animate-pulse font-medium">Sincronizando seu quadro de estudos...</p>
    </div>
  )
}

export default function HabitBoardRedirectPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="w-8 h-8 text-indigo animate-spin" />
        <p className="text-muted animate-pulse font-medium">Preparando ambiente...</p>
      </div>
    }>
      <BoardRedirector />
    </Suspense>
  )
}
