"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { DailyTask } from "@/types/database"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { CheckCircle2, Circle, Plus, Trash2, Loader2, Calendar, Edit2, Save, X } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

export default function TasksPage() {
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [loading, setLoading] = useState(true)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const supabase = createClient()

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('daily_tasks')
      .select('*')
      .order('is_completed', { ascending: true })
      .order('created_at', { ascending: false })

    if (data) setTasks(data)
    setLoading(false)
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('daily_tasks')
      .insert({
        title: newTaskTitle,
        user_id: user?.id,
        due_date: format(new Date(), 'yyyy-MM-dd'),
        is_completed: false,
        priority: 1
      })
      .select()
      .single()

    if (!error && data) {
      setTasks([data, ...tasks])
      setNewTaskTitle("")
    }
    setAdding(false)
  }

  const toggleTask = async (task: DailyTask) => {
    const { error } = await supabase
      .from('daily_tasks')
      .update({ is_completed: !task.is_completed })
      .eq('id', task.id)

    if (!error) {
      setTasks(tasks.map(t => t.id === task.id ? { ...t, is_completed: !task.is_completed } : t))
    }
  }

  const handleDeleteTask = async (id: string) => {
    const { error } = await supabase
      .from('daily_tasks')
      .delete()
      .eq('id', id)

    if (!error) {
      setTasks(tasks.filter(t => t.id !== id))
    }
  }

  const startEditing = (task: DailyTask) => {
    setEditingId(task.id)
    setEditingTitle(task.title)
  }

  const saveEdit = async (id: string) => {
    if (!editingTitle.trim()) return
    const { error } = await supabase
      .from('daily_tasks')
      .update({ title: editingTitle })
      .eq('id', id)

    if (!error) {
      setTasks(tasks.map(t => t.id === id ? { ...t, title: editingTitle } : t))
      setEditingId(null)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="w-8 h-8 text-indigo animate-spin" />
      <p className="text-muted animate-pulse">Organizando sua lista...</p>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-700 pb-28 sm:pb-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-10 sm:pt-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Minhas Tarefas</h1>
          <p className="text-muted">Mantenha o foco no que realmente importa hoje.</p>
        </div>
        <div className="bg-indigo/10 px-4 py-2 rounded-2xl flex items-center gap-2 text-indigo w-fit self-start sm:self-auto">
          <Calendar className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">
            {format(new Date(), "d 'de' MMMM", { locale: ptBR })}
          </span>
        </div>
      </header>

      <Card className="shadow-soft dark:shadow-xl dark:shadow-indigo/5 bg-surface overflow-hidden">
        <CardContent className="p-0">
          <form onSubmit={handleAddTask} className="p-6 border-b border-border flex gap-4 bg-muted/5">
            <Input
              placeholder="Adicionar uma nova tarefa..."
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              className="bg-surface border-border flex-1"
            />
            <Button type="submit" disabled={adding || !newTaskTitle.trim()}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Adicionar
            </Button>
          </form>

          <div className="divide-y divide-border">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-center justify-between p-6 hover:bg-indigo/[0.02] transition-colors group",
                  task.is_completed && "opacity-40 grayscale-[0.5]"
                )}
              >
                <div className="flex items-center gap-4 flex-1">
                  <button
                    onClick={() => toggleTask(task)}
                    className="transition-transform active:scale-90"
                    disabled={editingId === task.id}
                  >
                    {task.is_completed ? (
                      <CheckCircle2 className="w-6 h-6 text-green" />
                    ) : (
                      <Circle className="w-6 h-6 text-border group-hover:text-indigo/40" />
                    )}
                  </button>

                  {editingId === task.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(task.id)}
                        className="h-10"
                      />
                      <Button size="sm" onClick={() => saveEdit(task.id)} className="h-10 w-10 p-0">
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-10 w-10 p-0">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <span
                      onClick={() => !task.is_completed && startEditing(task)}
                      className={cn(
                        "text-lg font-semibold dark:font-bold transition-all flex-1 cursor-text",
                        task.is_completed ? "text-muted line-through" : "text-foreground hover:text-indigo"
                      )}
                    >
                      {task.title}
                    </span>
                  )}
                </div>

                {editingId !== task.id && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEditing(task)}
                      className="p-2 text-muted hover:text-indigo hover:bg-indigo/10 rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <section className="bg-surface rounded-3xl p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="font-black text-xl mb-2 tracking-tight">Produtividade</h3>
          <div className="flex gap-8 mt-4">
            <div>
              <p className="text-[10px] uppercase font-black text-muted tracking-widest">Pendentes</p>
              <p className="text-3xl font-black text-foreground">{tasks.filter(t => !t.is_completed).length}</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div>
              <p className="text-[10px] uppercase font-black text-muted tracking-widest">Concluídas</p>
              <p className="text-3xl font-black text-green">{tasks.filter(t => t.is_completed).length}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
