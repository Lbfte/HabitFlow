"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { DailyTask } from "@/types/database"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { CheckCircle2, Circle, Plus, Trash2, Loader2, Calendar, Edit2, Save, X, Eye, EyeOff, Clock, List } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn, parseTaskTitle, formatTaskTitle, sortTasks } from "@/lib/utils"

export default function TasksPage() {
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [loading, setLoading] = useState(true)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskTime, setNewTaskTime] = useState("")
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [editingTime, setEditingTime] = useState("")
  const [hideTasks, setHideTasks] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list')
  const timelineContainerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchTasks()
    const savedHideTasks = localStorage.getItem('hideTasks')
    if (savedHideTasks) setHideTasks(savedHideTasks === 'true')
    const savedViewMode = localStorage.getItem('tasks_view_mode')
    if (savedViewMode) setViewMode(savedViewMode as 'list' | 'timeline')
  }, [])

  useEffect(() => {
    if (viewMode === 'timeline' && !loading) {
      const timer = setTimeout(() => {
        const currentHour = new Date().getHours()
        const element = document.getElementById(`hour-row-${currentHour}`)
        const container = timelineContainerRef.current
        if (container && element) {
          container.scrollTop = element.offsetTop - 8
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [viewMode, loading])

  const toggleHideTasks = () => {
    const next = !hideTasks
    setHideTasks(next)
    localStorage.setItem('hideTasks', String(next))
  }

  const toggleViewMode = (mode: 'list' | 'timeline') => {
    setViewMode(mode)
    localStorage.setItem('tasks_view_mode', mode)
  }

  const fetchTasks = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('daily_tasks')
      .select('*')

    if (data) setTasks(sortTasks(data))
    setLoading(false)
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    const formattedTitle = formatTaskTitle(newTaskTitle, newTaskTime)

    const { data, error } = await supabase
      .from('daily_tasks')
      .insert({
        title: formattedTitle,
        user_id: user?.id,
        due_date: format(new Date(), 'yyyy-MM-dd'),
        is_completed: false,
        priority: 1
      })
      .select()
      .single()

    if (!error && data) {
      setTasks(sortTasks([data, ...tasks]))
      setNewTaskTitle("")
      setNewTaskTime("")
    }
    setAdding(false)
  }

  const toggleTask = async (task: DailyTask) => {
    const { error } = await supabase
      .from('daily_tasks')
      .update({ is_completed: !task.is_completed })
      .eq('id', task.id)

    if (!error) {
      setTasks(sortTasks(tasks.map(t => t.id === task.id ? { ...t, is_completed: !task.is_completed } : t)))
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
    const { time, cleanTitle } = parseTaskTitle(task.title)
    setEditingId(task.id)
    setEditingTitle(cleanTitle)
    setEditingTime(time || "")
  }

  const saveEdit = async (id: string) => {
    if (!editingTitle.trim()) return
    const formattedTitle = formatTaskTitle(editingTitle, editingTime)
    
    const { error } = await supabase
      .from('daily_tasks')
      .update({ title: formattedTitle })
      .eq('id', id)

    if (!error) {
      setTasks(sortTasks(tasks.map(t => t.id === id ? { ...t, title: formattedTitle } : t)))
      setEditingId(null)
      setEditingTitle("")
      setEditingTime("")
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="w-8 h-8 text-indigo animate-spin" />
      <p className="text-muted animate-pulse">Organizando sua lista...</p>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-28 sm:pb-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-10 sm:pt-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Minhas Tarefas</h1>
            <button 
              onClick={toggleHideTasks} 
              className="mt-1 text-muted hover:text-foreground transition-colors"
              title={hideTasks ? "Mostrar tarefas" : "Ocultar tarefas"}
            >
              {hideTasks ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-muted">Mantenha o foco no que realmente importa hoje.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {/* Seletor de visualização */}
          <div className="bg-surface p-1 rounded-2xl flex border border-border shadow-sm">
            <button
              onClick={() => toggleViewMode('list')}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all",
                viewMode === 'list' ? "bg-indigo text-white shadow-sm" : "text-muted hover:text-foreground"
              )}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
            <button
              onClick={() => toggleViewMode('timeline')}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all",
                viewMode === 'timeline' ? "bg-indigo text-white shadow-sm" : "text-muted hover:text-foreground"
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              Cronograma
            </button>
          </div>

          <div className="bg-indigo/10 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-indigo">
            <Calendar className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {format(new Date(), "d 'de' MMMM", { locale: ptBR })}
            </span>
          </div>
        </div>
      </header>

      {viewMode === 'list' ? (
        <Card className="shadow-soft dark:shadow-xl dark:shadow-indigo/5 bg-surface overflow-hidden">
          <CardContent className="p-0">
            <form onSubmit={handleAddTask} className="p-6 border-b border-border flex flex-col md:flex-row gap-4 bg-muted/5">
              <div className="flex-1 flex gap-4">
                <Input
                  id="task-input"
                  placeholder="Adicionar uma nova tarefa..."
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="bg-surface border-border flex-1"
                />
                <Input
                  type="time"
                  value={newTaskTime}
                  onChange={e => setNewTaskTime(e.target.value)}
                  className="bg-surface border-border w-32 shrink-0 cursor-pointer"
                  title="Horário opcional"
                />
              </div>
              <Button type="submit" disabled={adding || !newTaskTitle.trim()} className="w-full md:w-auto">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Adicionar
              </Button>
            </form>

            <div className="divide-y divide-border">
              {tasks.length === 0 ? (
                <div className="p-12 text-center text-muted">Nenhuma tarefa cadastrada.</div>
              ) : (
                tasks.map((task) => {
                  const { time, cleanTitle } = parseTaskTitle(task.title)
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center justify-between p-6 hover:bg-indigo/[0.02] transition-colors group",
                        task.is_completed && "opacity-40 grayscale-[0.5]"
                      )}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
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
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                            <Input
                              value={editingTitle}
                              onChange={e => setEditingTitle(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && saveEdit(task.id)}
                              className="h-10 flex-1"
                              placeholder="Nome da tarefa"
                            />
                            <Input
                              type="time"
                              value={editingTime}
                              onChange={e => setEditingTime(e.target.value)}
                              className="h-10 w-full sm:w-28 shrink-0 cursor-pointer"
                              title="Horário"
                            />
                            <div className="flex gap-1.5 shrink-0 self-end sm:self-auto">
                              <Button size="sm" onClick={() => saveEdit(task.id)} className="h-10 w-10 p-0">
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-10 w-10 p-0">
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 min-w-0">
                            <span
                              onClick={() => !task.is_completed && startEditing(task)}
                              className={cn(
                                "text-lg font-semibold dark:font-bold transition-all cursor-text truncate",
                                task.is_completed ? "text-muted line-through" : "text-foreground hover:text-indigo",
                                hideTasks && "filter blur-[4px] select-none"
                              )}
                            >
                              {hideTasks ? "Tarefa Oculta" : cleanTitle}
                            </span>
                            {time && !hideTasks && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-indigo/10 text-indigo px-3 py-1 rounded-full w-fit shrink-0">
                                <Clock className="w-3.5 h-3.5" />
                                {time}
                              </span>
                            )}
                          </div>
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
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Formulário no modo cronograma */}
          <Card className="shadow-soft dark:shadow-xl dark:shadow-indigo/5 bg-surface p-6">
            <form onSubmit={handleAddTask} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex gap-4">
                <Input
                  id="task-input"
                  placeholder="Adicionar nova tarefa ao cronograma..."
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="bg-surface border-border flex-1"
                />
                <Input
                  type="time"
                  value={newTaskTime}
                  onChange={e => setNewTaskTime(e.target.value)}
                  className="bg-surface border-border w-32 shrink-0 cursor-pointer"
                  title="Horário opcional"
                />
              </div>
              <Button type="submit" disabled={adding || !newTaskTitle.trim()} className="w-full md:w-auto">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Adicionar
              </Button>
            </form>
          </Card>

          {/* Grid de cronograma e tarefas sem horário */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 shadow-soft dark:shadow-xl dark:shadow-indigo/5 bg-surface p-6">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-700 dark:text-foreground">
                <Clock className="w-5 h-5 text-indigo" />
                Cronograma do Dia
              </h3>
              <div 
                ref={timelineContainerRef}
                className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar space-y-0 relative border-t border-border/40"
              >
                {Array.from({ length: 24 }).map((_, hour) => {
                  const hourStr = String(hour).padStart(2, '0') + ':00'
                  const hourTasks = tasks.filter(task => {
                    const { time } = parseTaskTitle(task.title)
                    if (!time) return false
                    const taskHour = parseInt(time.split(':')[0], 10)
                    return taskHour === hour
                  })

                  const isCurrentHour = new Date().getHours() === hour

                  return (
                    <div 
                      key={hour} 
                      id={`hour-row-${hour}`}
                      className={cn(
                        "flex border-b border-border/40 min-h-[72px] group relative py-3 items-start transition-colors",
                        isCurrentHour && "bg-indigo/[0.03] dark:bg-indigo/[0.05]"
                      )}
                    >
                      <div className="w-16 pr-4 text-right text-xs font-black text-muted group-hover:text-foreground transition-colors pt-1">
                        {hourStr}
                      </div>
                      <div className="flex-1 space-y-2 relative pl-4 border-l border-dashed border-border/60 min-h-[48px]">
                        {/* Botão de adição rápida para aquela hora */}
                        <button
                          onClick={() => {
                            setNewTaskTime(String(hour).padStart(2, '0') + ':00')
                            document.getElementById('task-input')?.focus()
                          }}
                          className="absolute right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted hover:text-indigo hover:bg-indigo/5 rounded"
                          title={`Agendar para as ${hourStr}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>

                        {hourTasks.length === 0 ? (
                          <div className="text-[11px] text-muted/30 italic font-bold pt-1 select-none">
                            Sem tarefas agendadas
                          </div>
                        ) : (
                          <div className="grid gap-2">
                            {hourTasks.map(task => {
                              const { time, cleanTitle } = parseTaskTitle(task.title)
                              return (
                                <div
                                  key={task.id}
                                  className={cn(
                                    "flex items-center justify-between p-3.5 rounded-2xl border border-border/40 bg-muted/5 hover:bg-indigo/[0.02] transition-all",
                                    task.is_completed && "opacity-50"
                                  )}
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <button
                                      onClick={() => toggleTask(task)}
                                      className="transition-transform active:scale-90 shrink-0"
                                      disabled={editingId === task.id}
                                    >
                                      {task.is_completed ? (
                                        <CheckCircle2 className="w-5 h-5 text-green" />
                                      ) : (
                                        <Circle className="w-5 h-5 text-border hover:text-indigo/40" />
                                      )}
                                    </button>
                                    
                                    {editingId === task.id ? (
                                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                                        <Input
                                          value={editingTitle}
                                          onChange={e => setEditingTitle(e.target.value)}
                                          autoFocus
                                          onKeyDown={(e) => e.key === 'Enter' && saveEdit(task.id)}
                                          className="h-10 flex-1"
                                          placeholder="Nome da tarefa"
                                        />
                                        <Input
                                          type="time"
                                          value={editingTime}
                                          onChange={e => setEditingTime(e.target.value)}
                                          className="h-10 w-full sm:w-28 shrink-0 cursor-pointer"
                                          title="Horário"
                                        />
                                        <div className="flex gap-1.5 shrink-0 self-end sm:self-auto">
                                          <Button size="sm" onClick={() => saveEdit(task.id)} className="h-10 w-10 p-0">
                                            <Save className="w-4 h-4" />
                                          </Button>
                                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-10 w-10 p-0">
                                            <X className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="min-w-0 flex-1">
                                        <p className={cn(
                                          "text-sm font-semibold dark:font-bold truncate text-foreground",
                                          task.is_completed && "text-muted line-through"
                                        )}>
                                          {hideTasks ? "Tarefa Oculta" : cleanTitle}
                                        </p>
                                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-indigo">
                                          <Clock className="w-3 h-3" />
                                          {time}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {editingId !== task.id && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => startEditing(task)}
                                        className="p-1.5 text-muted hover:text-indigo hover:bg-indigo/5 rounded-lg transition-all"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card className="shadow-soft dark:shadow-xl dark:shadow-indigo/5 bg-surface p-6 self-start">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-700 dark:text-foreground">
                <List className="w-5 h-5 text-indigo" />
                Sem Horário
              </h3>
              <p className="text-xs text-muted mb-4">Tarefas para o dia sem um horário específico.</p>
              
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {tasks.filter(task => !parseTaskTitle(task.title).time).length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted">
                    Nenhuma tarefa sem horário pendente.
                  </div>
                ) : (
                  tasks.filter(task => !parseTaskTitle(task.title).time).map(task => {
                    const { cleanTitle } = parseTaskTitle(task.title)
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-center justify-between p-3.5 rounded-2xl border border-border/40 hover:bg-indigo/[0.01] transition-all",
                          task.is_completed && "opacity-50"
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button
                            onClick={() => toggleTask(task)}
                            className="transition-transform active:scale-90 shrink-0"
                            disabled={editingId === task.id}
                          >
                            {task.is_completed ? (
                              <CheckCircle2 className="w-5 h-5 text-green" />
                            ) : (
                              <Circle className="w-5 h-5 text-border hover:text-indigo/40" />
                            )}
                          </button>

                          {editingId === task.id ? (
                            <div className="flex flex-col items-stretch gap-2 flex-1">
                              <Input
                                value={editingTitle}
                                onChange={e => setEditingTitle(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && saveEdit(task.id)}
                                className="h-10 text-xs"
                                placeholder="Nome da tarefa"
                              />
                              <div className="flex gap-2">
                                <Input
                                  type="time"
                                  value={editingTime}
                                  onChange={e => setEditingTime(e.target.value)}
                                  className="h-9 text-xs flex-1 cursor-pointer"
                                  title="Horário"
                                />
                                <Button size="sm" onClick={() => saveEdit(task.id)} className="h-9 px-3">
                                  <Save className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-9 px-3">
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <span 
                              onClick={() => !task.is_completed && startEditing(task)}
                              className={cn(
                                "text-sm font-semibold dark:font-bold truncate text-foreground flex-1 cursor-text",
                                task.is_completed && "text-muted line-through"
                              )}
                            >
                              {hideTasks ? "Tarefa Oculta" : cleanTitle}
                            </span>
                          )}
                        </div>

                        {editingId !== task.id && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => startEditing(task)}
                              className="p-1.5 text-muted hover:text-indigo hover:bg-indigo/5 rounded-lg transition-all"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

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
