"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Plus, Palette, Loader2, Trash2, Edit2, Flame, CheckSquare, Sparkles } from "lucide-react"
import { CreateWhiteboardModal } from "@/components/CreateWhiteboardModal"
import { cn, parseTaskTitle } from "@/lib/utils"
import Link from "next/link"

interface WhiteboardRecord {
  id: string
  name: string
  habit_id: string | null
  task_id: string | null
  updated_at: string
  habits?: {
    name: string
  } | null
  daily_tasks?: {
    title: string
  } | null
}

export default function WhiteboardsPage() {
  const [boards, setBoards] = useState<WhiteboardRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBoard, setEditingBoard] = useState<WhiteboardRecord | null>(null)
  const [hideHabits, setHideHabits] = useState(false)
  const [hideTasks, setHideTasks] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchBoards()
    setHideHabits(localStorage.getItem('hideHabits') === 'true')
    setHideTasks(localStorage.getItem('hideTasks') === 'true')
  }, [])

  const fetchBoards = async () => {
    setLoading(true)
    try {
      // 1. Buscar os quadros diretamente
      const { data: boardsData, error: boardsError } = await supabase
        .from("habit_boards")
        .select("*")
        .order("updated_at", { ascending: false })

      if (boardsError) throw boardsError

      if (!boardsData || boardsData.length === 0) {
        setBoards([])
        setLoading(false)
        return
      }

      // 2. Buscar hábitos separadamente
      const { data: habitsData } = await supabase
        .from("habits")
        .select("id, name")

      // 3. Buscar tarefas separadamente
      const { data: tasksData } = await supabase
        .from("daily_tasks")
        .select("id, title")

      // 4. Juntar as informações em memória para evitar erros de cache de relacionamentos no Supabase
      const mapped = boardsData.map((board: any) => {
        const habit = habitsData?.find(h => h.id === board.habit_id) || null
        const task = tasksData?.find(t => t.id === board.task_id) || null
        
        return {
          id: board.id,
          name: board.name || "Quadro de Estudos",
          habit_id: board.habit_id,
          task_id: board.task_id,
          updated_at: board.updated_at,
          habits: habit ? { name: habit.name } : null,
          daily_tasks: task ? { title: task.title } : null
        }
      })

      setBoards(mapped)
    } catch (err) {
      console.error("Erro ao carregar os quadros:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveBoard = async (name: string, habitId: string | null, taskId: string | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (editingBoard) {
        // Modo Edição / Atualização
        let { error } = await supabase
          .from("habit_boards")
          .update({
            name,
            habit_id: habitId,
            task_id: taskId,
            updated_at: new Date().toISOString()
          })
          .eq("id", editingBoard.id)

        // Fallback: se 'name' ou 'task_id' falharem por falta de coluna no cache da API
        if (error && (error.code === "PGRST204" || String(error.message).includes("name") || String(error.message).includes("task_id"))) {
          console.warn("Coluna ausente detectada no cache ao atualizar. Usando fallback resiliente...")
          const { error: fallbackError } = await supabase
            .from("habit_boards")
            .update({
              habit_id: habitId,
              updated_at: new Date().toISOString()
            })
            .eq("id", editingBoard.id)
          
          if (fallbackError) throw fallbackError
        } else if (error) {
          throw error
        }
      } else {
        // Modo Criação
        let { error } = await supabase
          .from("habit_boards")
          .insert({
            name,
            habit_id: habitId,
            task_id: taskId,
            user_id: user.id,
            content: { elements: [], appState: { theme: "light" }, files: {} },
            updated_at: new Date().toISOString()
          })

        // Fallback: se 'name' ou 'task_id' falharem por falta de coluna no cache da API
        if (error && (error.code === "PGRST204" || String(error.message).includes("name") || String(error.message).includes("task_id"))) {
          console.warn("Coluna ausente detectada no cache ao criar. Usando fallback resiliente...")
          const { error: fallbackError } = await supabase
            .from("habit_boards")
            .insert({
              habit_id: habitId,
              user_id: user.id,
              content: { elements: [], appState: { theme: "light" }, files: {} },
              updated_at: new Date().toISOString()
            })
          
          if (fallbackError) throw fallbackError
        } else if (error) {
          throw error
        }
      }
      
      // Recarregar os quadros brancos do banco
      await fetchBoards()
      setEditingBoard(null)
    } catch (err) {
      console.error("Erro ao salvar quadro branco:", err)
    }
  }

  const handleDeleteBoard = async (id: string) => {
    if (!confirm("Excluir este quadro? Todos os desenhos, prints e anotações deste quadro serão excluídos permanentemente da nuvem.")) return
    
    try {
      const { error } = await supabase
        .from("habit_boards")
        .delete()
        .eq("id", id)

      if (error) throw error
      setBoards(boards.filter(b => b.id !== id))
    } catch (err) {
      console.error("Erro ao excluir quadro branco:", err)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="w-8 h-8 text-indigo animate-spin" />
      <p className="text-muted animate-pulse">Carregando seus quadros visuais...</p>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-28 sm:pb-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-10 sm:pt-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Quadros Visuais</h1>
          <p className="text-muted">Seus painéis infinitos de estudos vinculados aos seus hábitos e tarefas.</p>
        </div>
        <Button onClick={() => { setEditingBoard(null); setIsModalOpen(true); }} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Novo Quadro
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {boards.map((board) => (
          <Card key={board.id} className="shadow-soft dark:shadow-xl dark:shadow-indigo/5 bg-surface hover:shadow-lg dark:hover:shadow-indigo/20 transition-all group overflow-hidden border border-border flex flex-col justify-between h-[220px]">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="bg-indigo/5 p-2.5 rounded-2xl text-indigo group-hover:bg-indigo group-hover:text-white transition-all duration-300">
                <Palette className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button 
                  onClick={() => { setEditingBoard(board); setIsModalOpen(true); }}
                  className="p-1.5 text-muted hover:text-indigo hover:bg-indigo/10 rounded-lg transition-all"
                  title="Configurar conexões e título"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleDeleteBoard(board.id)}
                  className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  title="Excluir quadro permanentemente"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-indigo transition-colors duration-200">
                  {board.name}
                </h3>

                {/* Vínculos / Tags de Conexão */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {board.habits && (
                    <div className={cn("flex items-center gap-1 text-orange bg-orange/5 dark:bg-orange/10 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ring-1 ring-orange/10", hideHabits && "filter blur-[3px] select-none opacity-80")}>
                      <Flame className="w-3.5 h-3.5" />
                      <span>{hideHabits ? "Hábito Oculto" : board.habits.name}</span>
                    </div>
                  )}
                  {board.daily_tasks && (
                    <div className={cn("flex items-center gap-1 text-green bg-green/5 dark:bg-green/10 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ring-1 ring-green/10", hideTasks && "filter blur-[3px] select-none opacity-80")}>
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>{hideTasks ? "Tarefa Oculta" : parseTaskTitle(board.daily_tasks.title).cleanTitle}</span>
                    </div>
                  )}
                  {!board.habit_id && !board.task_id && (
                    <div className="flex items-center gap-1 text-muted bg-muted/5 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ring-1 ring-border">
                      <Sparkles className="w-3.5 h-3.5 text-indigo" />
                      <span>Quadro Livre</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-border mt-auto">
                <Link href={`/whiteboards/board/?id=${board.id}`} className="w-full">
                  <Button variant="secondary" size="sm" className="w-full text-[10px] font-black py-2 uppercase tracking-widest flex items-center justify-center gap-2 rounded-xl h-9 hover:bg-indigo hover:text-white transition-all duration-300">
                    <Palette className="w-4 h-4" />
                    Abrir Quadro Visual
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}

        {boards.length === 0 && (
          <div className="col-span-full text-center py-20 bg-surface rounded-3xl border-2 border-dashed border-border p-6 shadow-soft">
            <div className="bg-indigo/5 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Palette className="w-10 h-10 text-muted" />
            </div>
            <h3 className="font-bold text-xl text-foreground">Estudos Infinitos</h3>
            <p className="text-muted mt-2 max-w-sm mx-auto font-medium">
              Crie seu primeiro quadro visual! Cole prints, use marca-textos e conecte-os aos seus hábitos ou tarefas de foco.
            </p>
            <Button className="mt-8" onClick={() => { setEditingBoard(null); setIsModalOpen(true); }}>
              Começar Estudos
            </Button>
          </div>
        )}
      </div>

      <CreateWhiteboardModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingBoard(null); }} 
        onSave={handleSaveBoard}
        initialData={editingBoard ? {
          name: editingBoard.name,
          habit_id: editingBoard.habit_id,
          task_id: editingBoard.task_id
        } : undefined}
      />
    </div>
  )
}
