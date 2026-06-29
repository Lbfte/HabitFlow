"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { DailyTask } from "@/types/database"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  Loader2, 
  Calendar, 
  Edit2, 
  Save, 
  X, 
  Eye, 
  EyeOff, 
  Clock, 
  List, 
  ChevronLeft, 
  ChevronRight, 
  Folder
} from "lucide-react"
import { 
  format, 
  addDays, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  isSameDay, 
  isSameMonth, 
  isToday, 
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn, parseTaskTitle, formatTaskTitle, sortTasks } from "@/lib/utils"

export default function TasksPage() {
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estados para data e visualização
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewPeriod, setViewPeriod] = useState<'day' | 'week' | 'month'>('day')
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list') // secundário para 'day'
  
  // Categorias
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  
  // Formulário Inline
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskTime, setNewTaskTime] = useState("")
  const [newTaskCategory, setNewTaskCategory] = useState("")
  const [adding, setAdding] = useState(false)
  
  // Inputs de edição
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [editingTime, setEditingTime] = useState("")
  const [editingCategory, setEditingCategory] = useState("")
  
  const [hideTasks, setHideTasks] = useState(false)
  const timelineContainerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchTasks()
    const savedHideTasks = localStorage.getItem('hideTasks')
    if (savedHideTasks) setHideTasks(savedHideTasks === 'true')
    
    const savedPeriod = localStorage.getItem('tasks_view_period')
    if (savedPeriod) setViewPeriod(savedPeriod as 'day' | 'week' | 'month')
    
    const savedViewMode = localStorage.getItem('tasks_view_mode')
    if (savedViewMode) setViewMode(savedViewMode as 'list' | 'timeline')
  }, [])

  useEffect(() => {
    if (viewPeriod === 'day' && viewMode === 'timeline' && !loading) {
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
  }, [viewPeriod, viewMode, loading])

  const toggleHideTasks = () => {
    const next = !hideTasks
    setHideTasks(next)
    localStorage.setItem('hideTasks', String(next))
  }

  const handlePeriodChange = (period: 'day' | 'week' | 'month') => {
    setViewPeriod(period)
    localStorage.setItem('tasks_view_period', period)
  }

  const toggleViewMode = (mode: 'list' | 'timeline') => {
    setViewMode(mode)
    localStorage.setItem('tasks_view_mode', mode)
  }

  const handlePrevDate = () => {
    if (viewPeriod === 'day' || viewPeriod === 'month') {
      if (viewPeriod === 'day') setSelectedDate(prev => subDays(prev, 1))
      else setSelectedDate(prev => subMonths(prev, 1))
    } else if (viewPeriod === 'week') {
      setSelectedDate(prev => subWeeks(prev, 1))
    }
  }

  const handleNextDate = () => {
    if (viewPeriod === 'day' || viewPeriod === 'month') {
      if (viewPeriod === 'day') setSelectedDate(prev => addDays(prev, 1))
      else setSelectedDate(prev => addMonths(prev, 1))
    } else if (viewPeriod === 'week') {
      setSelectedDate(prev => addWeeks(prev, 1))
    }
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

  const handleAddTask = async (e: React.FormEvent, customDate?: Date) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    const formattedTitle = formatTaskTitle(newTaskTitle, newTaskTime, newTaskCategory)
    const targetDate = customDate || selectedDate

    const { data, error } = await supabase
      .from('daily_tasks')
      .insert({
        title: formattedTitle,
        user_id: user?.id,
        due_date: format(targetDate, 'yyyy-MM-dd'),
        is_completed: false,
        priority: 1
      })
      .select()
      .single()

    if (!error && data) {
      setTasks(sortTasks([data, ...tasks]))
      setNewTaskTitle("")
      setNewTaskTime("")
      setNewTaskCategory("")
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

  const handleDeleteCategory = async (categoryToDelete: string) => {
    setLoading(true)
    const tasksToUpdate = tasks.filter(t => {
      const { category } = parseTaskTitle(t.title)
      return category === categoryToDelete
    })

    try {
      const updates = tasksToUpdate.map(async (task) => {
        const { time, cleanTitle } = parseTaskTitle(task.title)
        const newTitle = formatTaskTitle(cleanTitle, time || "", "")
        
        const { error } = await supabase
          .from('daily_tasks')
          .update({ title: newTitle })
          .eq('id', task.id)
          
        if (error) throw error
        return { ...task, title: newTitle }
      })

      const updatedTasks = await Promise.all(updates)

      setTasks(prevTasks => {
        const updated = prevTasks.map(t => {
          const matched = updatedTasks.find(ut => ut.id === t.id)
          return matched ? matched : t
        })
        return sortTasks(updated)
      })

      if (selectedCategory === categoryToDelete) {
        setSelectedCategory('all')
      }
    } catch (error) {
      console.error("Erro ao deletar categoria:", error)
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (task: DailyTask) => {
    const { time, category, cleanTitle } = parseTaskTitle(task.title)
    setEditingId(task.id)
    setEditingTitle(cleanTitle)
    setEditingTime(time || "")
    setEditingCategory(category || "")
  }

  const saveEdit = async (id: string) => {
    if (!editingTitle.trim()) return
    const formattedTitle = formatTaskTitle(editingTitle, editingTime, editingCategory)

    const { error } = await supabase
      .from('daily_tasks')
      .update({ title: formattedTitle })
      .eq('id', id)

    if (!error) {
      setTasks(sortTasks(tasks.map(t => t.id === id ? { ...t, title: formattedTitle } : t)))
      setEditingId(null)
      setEditingTitle("")
      setEditingTime("")
      setEditingCategory("")
    }
  }

  // Extrair categorias exclusivas
  const categories = Array.from(
    new Set(
      tasks
        .map(t => parseTaskTitle(t.title).category)
        .filter((c): c is string => !!c && c.trim() !== "")
    )
  ).sort()

  // Filtros de datas
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 })
  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(monthStart)

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: gridStart, end: gridEnd })

  // Filtrar tarefas exibidas de acordo com o período selecionado e a categoria selecionada
  const displayedTasks = tasks.filter(t => {
    // 1. Filtro temporal
    if (viewPeriod === 'day') {
      if (t.due_date !== format(selectedDate, 'yyyy-MM-dd')) return false
    } else if (viewPeriod === 'week') {
      const taskDate = new Date(t.due_date + 'T12:00:00')
      if (taskDate < weekStart || taskDate > weekEnd) return false
    } else if (viewPeriod === 'month') {
      const taskDate = new Date(t.due_date + 'T12:00:00')
      if (taskDate.getMonth() !== selectedDate.getMonth() || taskDate.getFullYear() !== selectedDate.getFullYear()) return false
    }

    // 2. Filtro de categoria
    const { category } = parseTaskTitle(t.title)
    if (selectedCategory === "all") return true
    if (selectedCategory === "none") return !category
    return category === selectedCategory
  })

  // Progresso das tarefas filtradas
  const totalTasksCount = displayedTasks.length
  const completedTasksCount = displayedTasks.filter(t => t.is_completed).length
  const completionPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0

  // Formatador do título do período selecionado
  const getPeriodLabel = () => {
    if (viewPeriod === 'day') {
      return format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    } else if (viewPeriod === 'week') {
      return `Semana de ${format(weekStart, "dd/MM")} a ${format(weekEnd, "dd/MM")}`
    } else {
      return format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="w-8 h-8 text-indigo animate-spin" />
      <p className="text-muted animate-pulse font-medium">Sincronizando suas tarefas...</p>
    </div>
  )

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 pb-20 px-4 md:px-0">
      
      {/* DATALIST PARA AUTOCOMPLETE DE CATEGORIAS */}
      <datalist id="categories-datalist">
        {categories.map(c => <option key={c} value={c} />)}
      </datalist>

      {/* Header com fontes no padrão e mensagens originais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Minhas Tarefas
            <button
              onClick={toggleHideTasks}
              className="p-1 rounded text-muted hover:text-foreground hover:bg-muted/10 transition-colors"
              title={hideTasks ? "Mostrar tarefas" : "Ocultar tarefas"}
            >
              {hideTasks ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </h1>
          <p className="text-sm text-muted mt-1">Mantenha o foco no que realmente importa hoje.</p>
        </div>

        {/* Controles consolidados */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Navegação Rápida de Período */}
          <div className="bg-muted/40 p-0.5 rounded-xl flex border border-border/50">
            <button
              onClick={() => handlePeriodChange('day')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                viewPeriod === 'day' ? "bg-surface text-indigo shadow-sm" : "text-muted hover:text-foreground"
              )}
            >
              Dia
            </button>
            <button
              onClick={() => handlePeriodChange('week')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                viewPeriod === 'week' ? "bg-surface text-indigo shadow-sm" : "text-muted hover:text-foreground"
              )}
            >
              Semana
            </button>
            <button
              onClick={() => handlePeriodChange('month')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                viewPeriod === 'month' ? "bg-surface text-indigo shadow-sm" : "text-muted hover:text-foreground"
              )}
            >
              Mês
            </button>
          </div>

          {/* Sub-visualização de dia (Lista vs Cronograma) */}
          {viewPeriod === 'day' && (
            <div className="bg-muted/40 p-0.5 rounded-xl flex border border-border/50">
              <button
                onClick={() => toggleViewMode('list')}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  viewMode === 'list' ? "bg-surface text-indigo shadow-sm" : "text-muted hover:text-foreground"
                )}
                title="Visualizar em Lista"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => toggleViewMode('timeline')}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  viewMode === 'timeline' ? "bg-surface text-indigo shadow-sm" : "text-muted hover:text-foreground"
                )}
                title="Visualizar em Cronograma"
              >
                <Clock className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Linha Unificada de Controles (Datas, Progresso e Categorias) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface p-3 rounded-2xl border border-border shadow-sm">
        
        {/* Bloco 1: Navegação de Datas */}
        <div className="flex items-center gap-2.5 shrink-0 justify-between sm:justify-start">
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="sm" className="h-8.5 w-8.5 p-0 rounded-lg" onClick={handlePrevDate}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="sm" className="h-8.5 font-bold px-2.5 rounded-lg text-xs" onClick={() => setSelectedDate(new Date())}>
              Hoje
            </Button>
            <Button variant="secondary" size="sm" className="h-8.5 w-8.5 p-0 rounded-lg" onClick={handleNextDate}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <span className="text-xs font-bold text-indigo bg-indigo/5 dark:bg-indigo/10 px-2.5 py-1.5 rounded-xl shrink-0">
            {getPeriodLabel()}
          </span>
        </div>

        {/* Bloco 2: Progresso sutil */}
        <div className="flex items-center gap-2 justify-between sm:justify-start lg:justify-end shrink-0">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider shrink-0">
            Concluído: {completionPercent}%
          </span>
          <div className="w-20 bg-muted/40 h-1.5 rounded-full overflow-hidden shrink-0">
            <div 
              className="bg-indigo h-full rounded-full transition-all duration-300"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>

        {/* Divisor vertical sutil no Desktop */}
        <div className="hidden lg:block h-6 w-px bg-border/80" />

        {/* Bloco 3: Filtro de Categorias (Chips com botão de apagar) */}
        <div className="flex items-center gap-1.5 overflow-x-auto flex-1 scrollbar-none pl-1">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider shrink-0 pr-1 flex items-center gap-1">
            <Folder className="w-3 h-3 text-indigo" />
            Filtro:
          </span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold transition-all border shrink-0",
              selectedCategory === 'all'
                ? "bg-indigo text-white border-indigo shadow-sm"
                : "bg-surface hover:bg-muted/5 text-muted border-border"
            )}
          >
            Todas
          </button>
          <button
            onClick={() => setSelectedCategory('none')}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold transition-all border shrink-0",
              selectedCategory === 'none'
                ? "bg-indigo text-white border-indigo shadow-sm"
                : "bg-surface hover:bg-muted/5 text-muted border-border"
            )}
          >
            Sem Categoria
          </button>
          {categories.map(cat => (
            <div key={cat} className="flex items-center shrink-0">
              <button
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "pl-3 pr-1.5 py-1 rounded-full text-xs font-semibold transition-all border capitalize flex items-center gap-1 shadow-sm",
                  selectedCategory === cat
                    ? "bg-indigo text-white border-indigo"
                    : "bg-surface hover:bg-muted/5 text-muted border-border"
                )}
              >
                <span>{cat}</span>
                <span
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (confirm(`Deseja excluir a categoria "${cat}"? As tarefas serão mantidas, mas sem a categoria.`)) {
                      await handleDeleteCategory(cat)
                    }
                  }}
                  className={cn(
                    "p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors",
                    selectedCategory === cat ? "text-white/80 hover:text-white" : "text-muted hover:text-foreground"
                  )}
                  title={`Excluir categoria ${cat}`}
                >
                  <X className="w-3 h-3" />
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* FORMULÁRIO DE CRIAÇÃO DIRETO */}
      {viewPeriod === 'day' && (
        <form onSubmit={handleAddTask} className="bg-surface border border-border p-4 rounded-2xl shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Adicionar nova tarefa..."
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                required
                className="h-10 text-sm font-medium border-border/80 focus:border-indigo"
              />
            </div>
            
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <div className="w-full sm:w-auto flex items-center gap-1.5 border border-border/80 px-2.5 rounded-xl bg-background/50 h-10">
                <Clock className="w-4 h-4 text-muted shrink-0" />
                <input
                  type="time"
                  value={newTaskTime}
                  onChange={e => setNewTaskTime(e.target.value)}
                  className="bg-transparent border-none text-xs focus:ring-0 w-16 h-full outline-none text-foreground cursor-pointer font-semibold"
                  title="Horário da tarefa"
                />
              </div>

              <div className="w-full sm:w-auto flex items-center gap-1.5 border border-border/80 px-2.5 rounded-xl bg-background/50 h-10">
                <Folder className="w-4 h-4 text-muted shrink-0" />
                <input
                  placeholder="Pasta/Categoria"
                  value={newTaskCategory}
                  onChange={e => setNewTaskCategory(e.target.value)}
                  list="categories-datalist"
                  className="bg-transparent border-none text-xs focus:ring-0 w-24 h-full outline-none text-foreground font-semibold"
                />
              </div>

              <Button 
                type="submit" 
                disabled={adding || !newTaskTitle.trim()} 
                className="w-full sm:w-auto font-bold h-10 px-5 rounded-xl flex items-center justify-center gap-1.5"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>Adicionar</span>
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* RENDERIZAÇÃO DAS VISUALIZAÇÕES */}
      
      {/* 1. VISÃO: DIA */}
      {viewPeriod === 'day' && (
        viewMode === 'list' ? (
          <Card className="shadow-sm border border-border bg-surface overflow-hidden">
            <CardContent className="p-0 divide-y divide-border/60">
              {displayedTasks.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted font-medium italic">
                  Nenhuma tarefa agendada para hoje.
                </div>
              ) : (
                displayedTasks.map(task => {
                  const { time, category, cleanTitle } = parseTaskTitle(task.title)
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center justify-between p-4.5 hover:bg-muted/[0.01] transition-colors group",
                        task.is_completed && "opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <button
                          onClick={() => toggleTask(task)}
                          className="transition-transform active:scale-95 shrink-0"
                          disabled={editingId === task.id}
                        >
                          {task.is_completed ? (
                            <CheckCircle2 className="w-5.5 h-5.5 text-green" />
                          ) : (
                            <Circle className="w-5.5 h-5.5 text-border hover:text-indigo/40" />
                          )}
                        </button>

                        {editingId === task.id ? (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                            <Input
                              value={editingTitle}
                              onChange={e => setEditingTitle(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && saveEdit(task.id)}
                              className="h-9.5 text-sm font-semibold flex-1"
                              placeholder="Nome da tarefa"
                            />
                            <div className="flex gap-1.5 shrink-0">
                              <Input
                                type="time"
                                value={editingTime}
                                onChange={e => setEditingTime(e.target.value)}
                                className="h-9.5 w-20 text-xs cursor-pointer"
                              />
                              <Input
                                placeholder="Categoria"
                                value={editingCategory}
                                onChange={e => setEditingCategory(e.target.value)}
                                list="categories-datalist"
                                className="h-9.5 w-24 text-xs"
                              />
                              <div className="flex gap-1">
                                <Button size="sm" onClick={() => saveEdit(task.id)} className="h-9.5 w-9.5 p-0 rounded-lg">
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-9.5 w-9.5 p-0 rounded-lg">
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span
                              onClick={() => !task.is_completed && startEditing(task)}
                              className={cn(
                                "text-base font-semibold transition-all cursor-text truncate text-slate-700 dark:text-foreground/90",
                                task.is_completed ? "text-muted line-through" : "hover:text-indigo"
                              )}
                            >
                              {hideTasks ? "Tarefa Oculta" : cleanTitle}
                            </span>
                            
                            {/* Badges de horário e categoria */}
                            <div className="flex gap-2 shrink-0">
                              {time && !hideTasks && (
                                <span className="inline-flex items-center gap-0.5 text-xs font-bold bg-indigo/5 text-indigo dark:bg-indigo/10 px-2 py-0.5 rounded border border-indigo/10">
                                  {time}
                                </span>
                              )}
                              {category && !hideTasks && (
                                <span className="inline-flex items-center gap-0.5 text-xs font-bold bg-muted/60 text-muted px-2 py-0.5 rounded capitalize">
                                  {category}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {editingId !== task.id && (
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
                          <button
                            onClick={() => startEditing(task)}
                            className="p-1.5 text-muted hover:text-indigo hover:bg-indigo/5 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        ) : (
          /* DIA -> CRONOGRAMA DE HORAS (TIMELINE) */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            <Card className="lg:col-span-2 shadow-sm border border-border bg-surface p-5">
              <div className="flex items-center justify-between mb-3 border-b border-border/60 pb-2.5">
                <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-slate-700 dark:text-foreground">
                  <Clock className="w-4 h-4 text-indigo" />
                  Linha do Tempo
                </h3>
              </div>
              <div
                ref={timelineContainerRef}
                className="max-h-[450px] overflow-y-auto pr-1 custom-scrollbar space-y-0 relative border-t border-border/40"
              >
                {Array.from({ length: 24 }).map((_, hour) => {
                  const hourStr = String(hour).padStart(2, '0') + ':00'
                  const hourTasks = displayedTasks.filter(task => {
                    const { time } = parseTaskTitle(task.title)
                    if (!time) return false
                    const taskHour = parseInt(time.split(':')[0], 10)
                    return taskHour === hour
                  })

                  const isCurrentHour = isToday(selectedDate) && new Date().getHours() === hour

                  return (
                    <div
                      key={hour}
                      id={`hour-row-${hour}`}
                      className={cn(
                        "flex border-b border-border/40 min-h-[58px] group relative py-2 items-start transition-colors",
                        isCurrentHour && "bg-indigo/[0.02]"
                      )}
                    >
                      <div className="w-14 pr-2 text-right text-sm font-bold text-muted group-hover:text-foreground transition-colors pt-1">
                        {hourStr}
                      </div>
                      <div className="flex-1 space-y-1.5 relative pl-4 border-l border-dashed border-border/60 min-h-[32px]">
                        
                        <button
                          onClick={() => {
                            setNewTaskTime(String(hour).padStart(2, '0') + ':00')
                            const input = document.querySelector('input[placeholder="Adicionar nova tarefa..."]') as HTMLInputElement
                            if (input) input.focus()
                          }}
                          className="absolute right-1 top-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-muted hover:text-indigo hover:bg-indigo/5 rounded"
                          title={`Agendar para as ${hourStr}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        {hourTasks.length === 0 ? (
                          <div className="text-xs text-muted/20 italic font-bold pt-1 select-none">
                            Sem tarefas
                          </div>
                        ) : (
                          <div className="grid gap-1">
                            {hourTasks.map(task => {
                              const { time, category, cleanTitle } = parseTaskTitle(task.title)
                              return (
                                <div
                                  key={task.id}
                                  className={cn(
                                    "flex items-center justify-between p-2.5 rounded-xl border border-border/40 bg-muted/[0.01] hover:bg-indigo/[0.01] transition-all",
                                    task.is_completed && "opacity-50"
                                  )}
                                >
                                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                    <button
                                      onClick={() => toggleTask(task)}
                                      className="transition-transform active:scale-95 shrink-0"
                                    >
                                      {task.is_completed ? (
                                        <CheckCircle2 className="w-4.5 h-4.5 text-green" />
                                      ) : (
                                        <Circle className="w-4.5 h-4.5 text-border hover:text-indigo/40" />
                                      )}
                                    </button>

                                    <div className="min-w-0 flex-1 flex items-center gap-2">
                                      <p className={cn(
                                        "text-sm font-semibold text-slate-700 dark:text-foreground/90 truncate",
                                        task.is_completed && "text-muted line-through"
                                      )}>
                                        {hideTasks ? "Tarefa Oculta" : cleanTitle}
                                      </p>
                                      <div className="flex gap-1.5">
                                        <span className="text-[10px] font-bold text-indigo bg-indigo/5 px-1 py-0.2 rounded">
                                          {time}
                                        </span>
                                        {category && (
                                          <span className="text-[10px] font-bold text-muted bg-muted/60 px-1 py-0.2 rounded capitalize">
                                            {category}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-0.5 shrink-0 ml-1">
                                    <button
                                      onClick={() => startEditing(task)}
                                      className="p-1 text-muted hover:text-indigo rounded"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTask(task.id)}
                                      className="p-1 text-muted hover:text-red-500 rounded"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
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

            {/* Tarefas Sem Horário */}
            <Card className="shadow-sm border border-border bg-surface p-5 self-start">
              <h3 className="font-bold text-sm mb-1 flex items-center gap-2 text-slate-700 dark:text-foreground uppercase tracking-wider border-b border-border/60 pb-2">
                <List className="w-4 h-4 text-indigo" />
                Sem Horário
              </h3>

              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar pt-2.5">
                {displayedTasks.filter(task => !parseTaskTitle(task.title).time).length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted italic font-bold">
                    Nenhuma tarefa sem horário.
                  </div>
                ) : (
                  displayedTasks.filter(task => !parseTaskTitle(task.title).time).map(task => {
                    const { category, cleanTitle } = parseTaskTitle(task.title)
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-indigo/[0.01] transition-all",
                          task.is_completed && "opacity-50"
                        )}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <button
                            onClick={() => toggleTask(task)}
                            className="transition-transform active:scale-95 shrink-0"
                          >
                            {task.is_completed ? (
                              <CheckCircle2 className="w-4.5 h-4.5 text-green" />
                            ) : (
                              <Circle className="w-4.5 h-4.5 text-border hover:text-indigo/40" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0 flex flex-col">
                            <span className={cn(
                              "text-sm font-semibold text-slate-700 dark:text-foreground/90 truncate",
                              task.is_completed && "text-muted line-through"
                            )}>
                              {hideTasks ? "Tarefa Oculta" : cleanTitle}
                            </span>
                            {category && (
                              <span className="text-[10px] font-bold text-muted bg-muted/60 px-1.5 py-0.2 rounded uppercase tracking-wider w-fit mt-0.5 capitalize">
                                {category}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0 ml-1">
                          <button
                            onClick={() => startEditing(task)}
                            className="p-1 text-muted hover:text-indigo rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 text-muted hover:text-red-500 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </Card>
          </div>
        )
      )}

      {/* 2. VISÃO: SEMANA */}
      {viewPeriod === 'week' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {weekDays.map((day, idx) => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const dayTasks = tasks.filter(t => t.due_date === dayStr)
            const filteredDayTasks = dayTasks.filter(t => {
              const { category } = parseTaskTitle(t.title)
              if (selectedCategory === "all") return true
              if (selectedCategory === "none") return !category
              return category === selectedCategory
            })
            const isTodayDay = isToday(day)

            return (
              <Card 
                key={idx} 
                className={cn(
                  "shadow-sm bg-surface border border-border flex flex-col justify-start min-h-[180px] transition-all duration-300 hover:shadow hover:border-indigo/40 hover:-translate-y-0.5",
                  isTodayDay && "ring-1.5 ring-indigo bg-indigo/[0.005] border-indigo/30"
                )}
              >
                <CardHeader className="p-2.5 border-b border-border/60 bg-muted/[0.01] flex flex-row items-center justify-between shrink-0">
                  <div>
                    <h4 className={cn("font-bold text-[10px] sm:text-xs uppercase tracking-wider", isTodayDay ? "text-indigo" : "text-slate-600 dark:text-slate-300")}>
                      {format(day, 'EEEE', { locale: ptBR }).split('-')[0]}
                    </h4>
                    <span className="text-[10px] sm:text-xs text-muted font-bold">
                      {format(day, 'dd/MM')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {isTodayDay && (
                      <span className="text-[8px] font-bold bg-indigo text-white px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm">
                        Hoje
                      </span>
                    )}
                    <button 
                      onClick={() => {
                        setSelectedDate(day)
                        setViewPeriod('day')
                        setTimeout(() => {
                          const input = document.querySelector('input[placeholder="Adicionar nova tarefa..."]') as HTMLInputElement
                          if (input) input.focus()
                        }, 50)
                      }}
                      className="p-1 rounded-md text-muted hover:text-indigo hover:bg-indigo/5 transition-all"
                      title="Adicionar tarefa neste dia"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardHeader>
                
                <CardContent className="p-2 flex-1 overflow-y-auto max-h-[140px] custom-scrollbar">
                  <div className="space-y-1">
                    {filteredDayTasks.length === 0 ? (
                      <div className="text-center py-6 text-[10px] text-muted/30 font-bold italic select-none">
                        Vazio
                      </div>
                    ) : (
                      filteredDayTasks.map(task => {
                        const { time, category, cleanTitle } = parseTaskTitle(task.title)
                        return (
                          <div 
                            key={task.id}
                            className={cn(
                              "p-1.5 rounded-lg border border-border/40 bg-muted/[0.01] hover:bg-indigo/[0.01] transition-all group flex flex-col gap-0.5 relative",
                              task.is_completed && "opacity-50"
                            )}
                          >
                            <div className="flex items-start gap-1 pr-4">
                              <button 
                                onClick={() => toggleTask(task)}
                                className="mt-0.5 shrink-0 transition-transform active:scale-95"
                              >
                                {task.is_completed ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green" />
                                ) : (
                                  <Circle className="w-3.5 h-3.5 text-border hover:text-indigo/40" />
                                )}
                              </button>
                              <span className={cn(
                                "text-[11px] font-semibold truncate text-slate-700 dark:text-foreground/90 flex-1 cursor-text",
                                task.is_completed && "text-muted line-through"
                              )}
                              onClick={() => startEditing(task)}
                              >
                                {hideTasks ? "Tarefa Oculta" : cleanTitle}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1 pl-4.5">
                              {time && !hideTasks && (
                                <span className="text-[9px] font-bold text-indigo/90 bg-indigo/5 px-1 rounded">
                                  {time}
                                </span>
                              )}
                              {category && !hideTasks && (
                                <span className="text-[9px] font-bold text-muted bg-muted/60 px-1 rounded capitalize">
                                  {category}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="absolute right-0.5 top-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-muted hover:text-red-500 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 3. VISÃO: MÊS */}
      {viewPeriod === 'month' && (
        <div className="flex flex-col lg:flex-row gap-5 animate-in fade-in duration-300">
          
          {/* Calendário Mensal Compacto à esquerda */}
          <Card className="w-full lg:w-[320px] shrink-0 shadow-sm border border-border bg-surface p-4.5 self-start">
            <div className="flex justify-between items-center mb-3 border-b border-border/60 pb-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-foreground flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo" />
                Mês
              </h3>
            </div>

            {/* Grid dos Dias da Semana */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1 bg-muted/[0.02] py-1.5 rounded-lg border border-border/40">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, dIdx) => (
                <div key={dIdx} className="text-[10px] font-bold text-muted uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid dos Dias */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                const dayStr = format(day, 'yyyy-MM-dd')
                const isCurrentMonth = isSameMonth(day, selectedDate)
                const isSelected = isSameDay(day, selectedDate)
                const dayTasks = tasks.filter(t => t.due_date === dayStr)
                const filteredDayTasks = dayTasks.filter(t => {
                  const { category } = parseTaskTitle(t.title)
                  if (selectedCategory === "all") return true
                  if (selectedCategory === "none") return !category
                  return category === selectedCategory
                })
                
                const hasPending = filteredDayTasks.some(t => !t.is_completed)
                const hasCompleted = filteredDayTasks.some(t => t.is_completed)

                return (
                  <button 
                    key={idx}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "aspect-square p-0 flex flex-col items-center justify-center rounded-lg transition-all relative border border-transparent cursor-pointer",
                      !isCurrentMonth && "opacity-15",
                      isSelected 
                        ? "bg-indigo text-white shadow-sm font-bold scale-105" 
                        : "hover:bg-indigo/5 text-slate-700 dark:text-slate-200",
                      isToday(day) && !isSelected && "border-indigo text-indigo font-bold"
                    )}
                  >
                    <span className="text-xs font-semibold">{format(day, 'd')}</span>
                    
                    <div className="flex gap-0.5 mt-0.5 absolute bottom-1 justify-center w-full">
                      {hasPending && (
                        <div className={cn("w-1 h-1 rounded-full shrink-0", isSelected ? "bg-white" : "bg-indigo")} />
                      )}
                      {hasCompleted && !hasPending && (
                        <div className={cn("w-1 h-1 rounded-full shrink-0", isSelected ? "bg-white/80" : "bg-green")} />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Foco de Lista Detalhada do Dia Selecionado */}
          <Card className="flex-1 shadow-sm border border-border bg-surface p-4.5">
            <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-3.5">
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold uppercase tracking-wider text-indigo">
                  Foco: {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </h4>
              </div>

              <Button 
                size="sm" 
                variant="outline"
                className="h-8 text-[10px] uppercase tracking-wider font-bold rounded-lg"
                onClick={() => {
                  setViewPeriod('day')
                  setTimeout(() => {
                    const input = document.querySelector('input[placeholder="Adicionar nova tarefa..."]') as HTMLInputElement
                    if (input) input.focus()
                  }, 50)
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Nova Tarefa
              </Button>
            </div>

            {/* Listagem do dia focado */}
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {tasks.filter(t => t.due_date === format(selectedDate, 'yyyy-MM-dd')).length === 0 ? (
                <div className="text-center py-10 text-sm text-muted/50 font-bold select-none italic">
                  Nenhuma tarefa agendada para este dia.
                </div>
              ) : (
                tasks.filter(t => t.due_date === format(selectedDate, 'yyyy-MM-dd')).map(task => {
                  const { time, category, cleanTitle } = parseTaskTitle(task.title)
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-muted/[0.01] hover:bg-indigo/[0.01] transition-all group",
                        task.is_completed && "opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <button
                          onClick={() => toggleTask(task)}
                          className="transition-transform active:scale-95 shrink-0"
                          disabled={editingId === task.id}
                        >
                          {task.is_completed ? (
                            <CheckCircle2 className="w-4.5 h-4.5 text-green" />
                          ) : (
                            <Circle className="w-4.5 h-4.5 text-border hover:text-indigo/40" />
                          )}
                        </button>

                        {editingId === task.id ? (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                            <Input
                              value={editingTitle}
                              onChange={e => setEditingTitle(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && saveEdit(task.id)}
                              className="h-8.5 text-xs font-semibold flex-1"
                              placeholder="Nome da tarefa"
                            />
                            <div className="flex gap-1">
                              <Input
                                type="time"
                                value={editingTime}
                                onChange={e => setEditingTime(e.target.value)}
                                className="h-8 w-20 text-xs cursor-pointer"
                              />
                              <Input
                                placeholder="Categoria"
                                value={editingCategory}
                                onChange={e => setEditingCategory(e.target.value)}
                                list="categories-datalist"
                                className="h-8 w-24 text-xs"
                              />
                              <Button size="sm" onClick={() => saveEdit(task.id)} className="h-8 w-8 p-0 rounded">
                                <Save className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8 p-0 rounded">
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span
                              onClick={() => !task.is_completed && startEditing(task)}
                              className={cn(
                                "text-sm font-semibold text-slate-700 dark:text-foreground/90 truncate cursor-text",
                                task.is_completed && "text-muted line-through"
                              )}
                            >
                              {hideTasks ? "Tarefa Oculta" : cleanTitle}
                            </span>
                            
                            <div className="flex gap-1.5 shrink-0">
                              {time && !hideTasks && (
                                <span className="text-[10px] font-bold text-indigo bg-indigo/5 px-1.5 py-0.2 rounded border border-indigo/10">
                                  {time}
                                </span>
                              )}
                              {category && !hideTasks && (
                                <span className="text-[10px] font-bold text-muted bg-muted/60 px-1.5 py-0.2 rounded capitalize">
                                  {category}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {editingId !== task.id && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                          <button
                            onClick={() => startEditing(task)}
                            className="p-1 text-muted hover:text-indigo hover:bg-indigo/5 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 text-muted hover:text-red-500 hover:bg-red-500/5 rounded"
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
      )}

      {/* MODAL GLOBAL DE EDIÇÃO */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setEditingId(null)}>
          <Card className="w-full max-w-md bg-surface shadow-2xl border-none animate-in scale-in duration-200" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="border-b border-border/60 pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-indigo flex items-center gap-1.5">
                <Edit2 className="w-4 h-4" />
                Editar Tarefa
              </CardTitle>
              <button onClick={() => setEditingId(null)} className="p-1 text-muted hover:text-foreground rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </CardHeader>
            
            <CardContent className="space-y-3 pt-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Título da Tarefa</label>
                <Input
                  value={editingTitle}
                  onChange={e => setEditingTitle(e.target.value)}
                  placeholder="Nome da tarefa"
                  autoFocus
                  required
                  className="h-10 text-sm font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Horário (Opcional)</label>
                  <Input
                    type="time"
                    value={editingTime}
                    onChange={e => setEditingTime(e.target.value)}
                    className="h-10 text-sm font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Categoria (Opcional)</label>
                  <Input
                    value={editingCategory}
                    onChange={e => setEditingCategory(e.target.value)}
                    list="categories-datalist"
                    placeholder="Trabalho, Escola..."
                    className="h-10 text-sm font-medium"
                  />
                </div>
              </div>
            </CardContent>
            
            <div className="flex justify-end gap-2 border-t border-border/60 p-4 bg-muted/[0.01] rounded-b-2xl">
              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
              <Button size="sm" onClick={() => saveEdit(editingId)} disabled={!editingTitle.trim()} className="font-bold">
                Salvar Alterações
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
