"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { DailyTask } from "@/types/database"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { CheckCircle2, Circle, Plus, Trash2, Loader2, Calendar } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

export default function TasksPage() {
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [loading, setLoading] = useState(true)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [adding, setAdding] = useState(false)
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="w-8 h-8 text-indigo animate-spin" />
      <p className="text-gray-500 animate-pulse">Organizando sua lista...</p>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Minhas Tarefas</h1>
          <p className="text-gray-500">Mantenha o foco no que realmente importa hoje.</p>
        </div>
        <div className="bg-indigo/5 px-4 py-2 rounded-2xl flex items-center gap-2 text-indigo">
          <Calendar className="w-4 h-4" />
          <span className="text-sm font-bold uppercase tracking-wider">
            {format(new Date(), "d 'de' MMMM", { locale: ptBR })}
          </span>
        </div>
      </header>

      <Card className="border-none shadow-xl shadow-indigo/5 ring-1 ring-gray-100 overflow-hidden">
        <CardContent className="p-0">
          <form onSubmit={handleAddTask} className="p-6 border-b border-gray-50 flex gap-4 bg-gray-50/30">
            <Input 
              placeholder="Adicionar uma nova tarefa..." 
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              className="bg-white border-gray-200"
            />
            <Button type="submit" disabled={adding || !newTaskTitle.trim()}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Adicionar
            </Button>
          </form>

          <div className="divide-y divide-gray-50">
            {tasks.map((task) => (
              <div 
                key={task.id}
                className="flex items-center justify-between p-6 hover:bg-gray-50/50 transition-colors group"
              >
                <div className="flex items-center gap-4 flex-1">
                  <button 
                    onClick={() => toggleTask(task)}
                    className="transition-transform active:scale-90"
                  >
                    {task.is_completed ? (
                      <CheckCircle2 className="w-6 h-6 text-green" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-200 group-hover:text-indigo/40" />
                    )}
                  </button>
                  <span className={cn(
                    "text-lg font-medium transition-all",
                    task.is_completed ? "text-gray-400 line-through" : "text-gray-700"
                  )}>
                    {task.title}
                  </span>
                </div>
                <button 
                  onClick={() => handleDeleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {tasks.length === 0 && (
              <div className="text-center py-20">
                <div className="bg-indigo/5 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-indigo/20" />
                </div>
                <h3 className="font-bold text-gray-900">Tudo limpo por aqui!</h3>
                <p className="text-gray-500 text-sm mt-1">
                  Você não tem tarefas pendentes. Que tal planejar o resto do seu dia?
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <section className="bg-surface rounded-3xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="font-bold text-lg mb-2">Resumo da Produtividade</h3>
          <div className="flex gap-8 mt-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Pendentes</p>
              <p className="text-2xl font-black text-gray-700">{tasks.filter(t => !t.is_completed).length}</p>
            </div>
            <div className="h-10 w-px bg-gray-100" />
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Concluídas</p>
              <p className="text-2xl font-black text-green">{tasks.filter(t => t.is_completed).length}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
