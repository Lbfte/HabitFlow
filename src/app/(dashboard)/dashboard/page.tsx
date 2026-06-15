"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Habit, DailyTask } from "@/types/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { CheckCircle2, Circle, Flame, Plus, Calendar as CalendarIcon, Loader2, Palette, Clock, ChevronDown, ChevronUp } from "lucide-react"
import { format, isYesterday, isToday, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import confetti from "canvas-confetti"
import { completeHabit, createHabit } from "@/app/actions/habits"
import { CreateHabitModal } from "@/components/CreateHabitModal"
import { cn, parseTaskTitle, sortTasks } from "@/lib/utils"
import { Input } from "@/components/ui/Input"
import { StickyNotes } from "@/components/StickyNotes"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { MinimalTimerWidget } from "@/components/MinimalTimerWidget"

export default function DashboardPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [loading, setLoading] = useState(true)
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hideHabits, setHideHabits] = useState(false)
  const [hideTasks, setHideTasks] = useState(false)
  const [habitsCollapsed, setHabitsCollapsed] = useState(false)
  const [focusCollapsed, setFocusCollapsed] = useState(false)
  const [linkedBoards, setLinkedBoards] = useState<Record<string, string>>({})
  const [linkedTasks, setLinkedTasks] = useState<Record<string, string>>({})
  const supabase = createClient()

  useEffect(() => {
    fetchData()
    const savedHideHabits = localStorage.getItem('hideHabits')
    if (savedHideHabits) setHideHabits(savedHideHabits === 'true')
    const savedHideTasks = localStorage.getItem('hideTasks')
    if (savedHideTasks) setHideTasks(savedHideTasks === 'true')
    const savedHabitsCollapsed = localStorage.getItem('dashboard_habitsCollapsed')
    if (savedHabitsCollapsed) setHabitsCollapsed(savedHabitsCollapsed === 'true')
    const savedFocusCollapsed = localStorage.getItem('dashboard_focusCollapsed')
    if (savedFocusCollapsed) setFocusCollapsed(savedFocusCollapsed === 'true')
  }, [])

  const toggleHideHabits = () => {
    const next = !hideHabits
    setHideHabits(next)
    localStorage.setItem('hideHabits', String(next))
  }

  const toggleHabitsCollapsed = () => {
    const next = !habitsCollapsed
    setHabitsCollapsed(next)
    localStorage.setItem('dashboard_habitsCollapsed', String(next))
  }

  const toggleFocusCollapsed = () => {
    const next = !focusCollapsed
    setFocusCollapsed(next)
    localStorage.setItem('dashboard_focusCollapsed', String(next))
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Buscar hábitos
      const { data: habitsData } = await supabase
        .from('habits')
        .select('*')
        .order('created_at', { ascending: true })
      
      // 2. Buscar tarefas do dia
      const { data: tasksData } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('due_date', format(new Date(), 'yyyy-MM-dd'))
        .order('priority', { ascending: false })

      if (habitsData) setHabits(habitsData)
      if (tasksData) setTasks(sortTasks(tasksData))

      // 3. Buscar quadros brancos vinculados
      const { data: boardsData } = await supabase
        .from('habit_boards')
        .select('id, habit_id, task_id')

      if (boardsData) {
        const habitMap: Record<string, string> = {}
        const taskMap: Record<string, string> = {}
        boardsData.forEach(b => {
          if (b.habit_id) habitMap[b.habit_id] = b.id
          if (b.task_id) taskMap[b.task_id] = b.id
        })
        setLinkedBoards(habitMap)
        setLinkedTasks(taskMap)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateHabit = async (name: string, goal: string, interval: number) => {
    const result = await createHabit(name, goal, interval)
    if (result.success && result.habit) {
      setHabits([...habits, result.habit as Habit])
    }
  }

  const handleCompleteHabit = async (habit: Habit) => {
    if (habit.last_completed_at && isToday(parseISO(habit.last_completed_at))) {
      return 
    }

    setCompletingId(habit.id)
    const result = await completeHabit(habit.id)

    if (result.success) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#7B61FF', '#40C057', '#FF922B']
      })
      
      setHabits(habits.map(h => 
        h.id === habit.id 
          ? { ...h, streak_count: result.newStreak ?? h.streak_count, last_completed_at: new Date().toISOString() } 
          : h
      ))
    }
    setCompletingId(null)
  }

  const toggleTask = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('daily_tasks')
      .update({ is_completed: !currentStatus })
      .eq('id', id)

    if (!error) {
      setTasks(sortTasks(tasks.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t)))
    }
  }

  const getActiveStreak = (habit: Habit) => {
    if (!habit.last_completed_at) return 0
    const lastDate = parseISO(habit.last_completed_at)
    if (isToday(lastDate) || isYesterday(lastDate)) {
      return habit.streak_count
    }
    return 0
  }

  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

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
      setTasks(sortTasks([...tasks, data]))
      setNewTaskTitle("")
      setIsAddingTask(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="w-8 h-8 text-indigo animate-spin" />
      <p className="text-muted animate-pulse">Sincronizando seus hábitos...</p>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-28 sm:pb-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-10 sm:pt-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Hoje</h1>
          <p className="text-muted">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" size="sm" className="flex-1 sm:flex-initial">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Agenda
          </Button>
          <Button size="sm" onClick={() => setIsModalOpen(true)} className="flex-1 sm:flex-initial">
            <Plus className="w-4 h-4 mr-2" />
            Novo
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-soft dark:shadow-xl dark:shadow-indigo/5 bg-surface overflow-hidden self-start">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-700 dark:text-foreground">
              <Flame className="w-5 h-5 text-indigo" />
              <span>Micro-Hábitos</span>
              <button 
                onClick={toggleHideHabits} 
                className="ml-1 text-muted hover:text-foreground transition-colors p-1"
                title={hideHabits ? "Mostrar hábitos" : "Ocultar hábitos"}
              >
                {hideHabits ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-indigo bg-indigo/5 dark:bg-indigo/10 px-3 py-1 rounded-full uppercase tracking-widest ring-1 ring-indigo/10 dark:ring-0 w-fit shrink-0">
                {habits.filter(h => h.last_completed_at && isToday(parseISO(h.last_completed_at))).length}/{habits.length} Concluídos
              </span>
              <button
                onClick={toggleHabitsCollapsed}
                className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-muted/10 transition-all shrink-0"
                title={habitsCollapsed ? "Expandir" : "Minimizar"}
              >
                {habitsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </CardHeader>
          {!habitsCollapsed && (
            <CardContent className="p-0">
              <div className="divide-y divide-border">
              {habits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                  <Flame className="w-10 h-10 text-muted/30" />
                  <p className="text-sm text-muted font-medium">Nenhum hábito ainda.<br />Crie seu primeiro hábito!</p>
                </div>
              ) : habits.map((habit) => {
                const completedToday = habit.last_completed_at && isToday(parseISO(habit.last_completed_at))
                const activeStreak = getActiveStreak(habit)
                
                return (
                  <div 
                    key={habit.id}
                    className={cn(
                      "flex items-center justify-between p-6 hover:bg-indigo/[0.02] transition-colors group",
                      completedToday && "opacity-50 grayscale-[0.5]"
                    )}
                  >
                    <div className="flex items-center gap-5">
                      <button 
                        onClick={() => handleCompleteHabit(habit)}
                        disabled={completingId === habit.id || !!completedToday}
                        className={cn(
                          "relative transition-all duration-300 active:scale-90 disabled:opacity-100",
                          completedToday ? "cursor-default" : "cursor-pointer"
                        )}
                      >
                        {completingId === habit.id ? (
                          <Loader2 className="w-7 h-7 text-indigo animate-spin" />
                        ) : completedToday ? (
                          <div className="bg-green/10 p-1 rounded-full">
                            <CheckCircle2 className="w-7 h-7 text-green" />
                          </div>
                        ) : (
                          <Circle className="w-7 h-7 text-slate-300 dark:text-slate-700 group-hover:text-indigo/40 transition-colors" />
                        )}
                      </button>
                      <div>
                        <h3 className={cn(
                          "font-semibold dark:font-bold text-lg transition-all", 
                          completedToday ? "text-muted line-through" : "text-slate-700 dark:text-foreground",
                          hideHabits && "filter blur-[4px] select-none"
                        )}>
                          {hideHabits ? "Nome Oculto" : habit.name}
                        </h3>
                        <p className={cn(
                          "text-sm text-muted font-medium",
                          hideHabits && "filter blur-[3px] select-none"
                        )}>
                          {hideHabits ? "Descrição confidencial" : habit.goal_description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {linkedBoards[habit.id] && (
                        <Link 
                          href={`/whiteboards/board?id=${linkedBoards[habit.id]}`}
                          className="p-2 text-indigo bg-indigo/5 dark:bg-indigo/10 rounded-xl transition-all hover:bg-indigo hover:text-white ring-1 ring-indigo/10 dark:ring-0"
                          title="Abrir Quadro de Estudos"
                        >
                          <Palette className="w-4 h-4 animate-pulse" />
                        </Link>
                      )}
                      <div className={cn(
                        "flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-xl transition-all",
                        activeStreak > 0 
                          ? "text-orange bg-orange/5 dark:bg-orange/10 ring-1 ring-orange/10 dark:ring-orange/20" 
                          : "text-muted bg-muted/5",
                        hideHabits && "filter blur-[3px] select-none"
                      )}>
                        <Flame className={cn("w-4 h-4", activeStreak > 0 && "fill-current animate-pulse")} />
                        {hideHabits ? "••" : activeStreak}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            </CardContent>
          )}
        </Card>

        <div className="space-y-6">
          <MinimalTimerWidget />
          
          <Card className="border-none shadow-soft dark:shadow-xl dark:shadow-indigo/5 bg-surface">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo" />
                Foco do Dia
              </CardTitle>
              <button
                onClick={toggleFocusCollapsed}
                className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-muted/10 transition-all shrink-0"
                title={focusCollapsed ? "Expandir" : "Minimizar"}
              >
                {focusCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </CardHeader>
            {!focusCollapsed && (
            <CardContent className="space-y-4">
              {tasks.map((task) => {
                const { time, cleanTitle } = parseTaskTitle(task.title)
                return (
                  <div 
                    key={task.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl hover:bg-muted/5 transition-colors cursor-pointer group",
                      task.is_completed && "opacity-40"
                    )}
                    onClick={() => toggleTask(task.id, task.is_completed)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {task.is_completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 dark:text-slate-700 group-hover:text-indigo/40" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={cn(
                          "text-sm font-semibold dark:font-bold transition-all text-slate-700 dark:text-foreground truncate",
                          task.is_completed && "text-muted line-through",
                          hideTasks && "filter blur-[4px] select-none"
                        )}>
                          {hideTasks ? "Tarefa Oculta" : cleanTitle}
                        </span>
                        {time && !hideTasks && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-indigo mt-0.5">
                            <Clock className="w-3 h-3" />
                            {time}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Mostrar paleta se houver quadro vinculado a esta tarefa */}
                    {linkedTasks[task.id] && (
                      <Link 
                        href={`/whiteboards/board?id=${linkedTasks[task.id]}`}
                        className="p-1.5 text-indigo bg-indigo/5 dark:bg-indigo/10 rounded-lg hover:bg-indigo hover:text-white transition-all ring-1 ring-indigo/10 dark:ring-0 shrink-0"
                        title="Abrir Quadro de Estudos da Tarefa"
                        onClick={(e) => e.stopPropagation()} // Previne marcar/desmarcar a tarefa ao clicar no quadro!
                      >
                        <Palette className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                )
              })}
              {isAddingTask ? (
                <form onSubmit={handleAddTask} className="mt-2 animate-in slide-in-from-top-2">
                  <Input 
                    autoFocus
                    placeholder="O que precisa ser feito?" 
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    className="text-sm h-9"
                    onBlur={() => !newTaskTitle && setIsAddingTask(false)}
                  />
                  <div className="flex gap-2 mt-2">
                    <Button type="submit" size="sm" className="h-7 text-[10px] uppercase tracking-wider font-bold">Salvar</Button>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] uppercase tracking-wider font-bold" onClick={() => setIsAddingTask(false)}>Cancelar</Button>
                  </div>
                </form>
              ) : (
                <button 
                  onClick={() => setIsAddingTask(true)}
                  className="flex items-center gap-2 text-sm font-bold text-indigo hover:opacity-80 transition-all mt-2 p-2 px-3 rounded-lg hover:bg-indigo/5 w-full text-left"
                >
                  <Plus className="w-4 h-4" />
                  Nova tarefa
                </button>
              )}
            </CardContent>
            )}
          </Card>

          <section className="accent-gradient text-white rounded-3xl p-8 relative overflow-hidden shadow-soft dark:shadow-xl dark:shadow-indigo/20">
            <div className="relative z-10">
              <h3 className="font-black text-xl mb-2 tracking-tight">Dica de hoje</h3>
              <p className="text-white/80 text-sm leading-relaxed italic font-medium">
                "Não quebre a corrente. A cada dia que você marca o X, mais forte o hábito se torna."
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <Flame className="w-32 h-32" />
            </div>
          </section>
        </div>
      </div>

      <StickyNotes />

      <CreateHabitModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleCreateHabit}
      />
    </div>
  )
}
