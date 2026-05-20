"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card"
import { X, Palette, Flame, CheckSquare, Loader2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

interface HabitOption {
  id: string
  name: string
}

interface TaskOption {
  id: string
  title: string
}

export function CreateWhiteboardModal({ 
  isOpen, 
  onClose, 
  onSave,
  initialData
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (name: string, habitId: string | null, taskId: string | null) => void,
  initialData?: { name: string, habit_id: string | null, task_id: string | null }
}) {
  const [name, setName] = useState("")
  const [habitId, setHabitId] = useState<string>("")
  const [taskId, setTaskId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [fetchingOptions, setFetchingOptions] = useState(false)
  const [habits, setHabits] = useState<HabitOption[]>([])
  const [tasks, setTasks] = useState<TaskOption[]>([])

  const supabase = createClient()

  // Buscar opções disponíveis de hábitos e tarefas ativos
  useEffect(() => {
    if (!isOpen) return

    const fetchOptions = async () => {
      try {
        setFetchingOptions(true)
        
        // 1. Buscar hábitos
        const { data: habitsData } = await supabase
          .from("habits")
          .select("id, name")
          .order("name", { ascending: true })

        if (habitsData) setHabits(habitsData)

        // 2. Buscar tarefas diárias não concluídas
        const { data: tasksData } = await supabase
          .from("daily_tasks")
          .select("id, title")
          .eq("is_completed", false)
          .order("created_at", { ascending: false })

        if (tasksData) setTasks(tasksData)

      } catch (err) {
        console.error("Erro ao buscar opções para o modal:", err)
      } finally {
        setFetchingOptions(false)
      }
    }

    fetchOptions()
  }, [isOpen, supabase])

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "")
      setHabitId(initialData.habit_id || "")
      setTaskId(initialData.task_id || "")
    } else {
      setName("")
      setHabitId("")
      setTaskId("")
    }
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await onSave(name, habitId || null, taskId || null)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md shadow-2xl border-none bg-surface">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
          <CardTitle className="flex items-center gap-2 font-bold text-foreground">
            <Palette className="w-5 h-5 text-indigo" />
            {initialData ? "Editar Quadro" : "Novo Quadro de Estudos"}
          </CardTitle>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-6">
            {/* Campo: Nome do Quadro */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted">Título do Quadro</label>
              <Input 
                placeholder="Ex: Resumo de Anatomia, Estudo de Inglês..." 
                value={name} 
                onChange={e => setName(e.target.value)}
                required
                className="font-semibold"
              />
            </div>
            
            {fetchingOptions ? (
              <div className="flex items-center justify-center py-4 gap-2 text-xs text-muted">
                <Loader2 className="w-4 h-4 animate-spin text-indigo" />
                <span>Buscando conexões de hábitos e tarefas...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Seleção de Hábito */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange" />
                    Vincular a um Micro-Hábito (Opcional)
                  </label>
                  <select 
                    className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo/20 transition-all cursor-pointer"
                    value={habitId}
                    onChange={e => setHabitId(e.target.value)}
                  >
                    <option value="">Nenhum hábito vinculado</option>
                    {habits.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>

                {/* Seleção de Tarefa */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-green" />
                    Vincular a uma Tarefa Ativa (Opcional)
                  </label>
                  <select 
                    className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo/20 transition-all cursor-pointer"
                    value={taskId}
                    onChange={e => setTaskId(e.target.value)}
                  >
                    <option value="">Nenhuma tarefa vinculada</option>
                    {tasks.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-end gap-2 border-t border-border pt-6">
            <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                initialData ? "Salvar Alterações" : "Criar Quadro"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
