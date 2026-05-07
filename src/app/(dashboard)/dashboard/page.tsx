"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Habit, DailyTask } from "@/types/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { CheckCircle2, Circle, Flame, Plus, Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { format, isYesterday, isToday, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import confetti from "canvas-confetti"
import { completeHabit, createHabit } from "@/app/actions/habits"
import { CreateHabitModal } from "@/components/CreateHabitModal"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/Input"

export default function DashboardPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [loading, setLoading] = useState(true)
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: habitsData } = await supabase
      .from('habits')
      .select('*')
      .order('created_at', { ascending: true })
    
    const { data: tasksData } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('due_date', format(new Date(), 'yyyy-MM-dd'))
      .order('priority', { ascending: false })

    if (habitsData) setHabits(habitsData)
    if (tasksData) setTasks(tasksData)
    setLoading(false)
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
      setTasks(tasks.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t))
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
      setTasks([...tasks, data])
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hoje</h1>
          <p className="text-muted">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Agenda
          </Button>
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-xl shadow-indigo/5 bg-surface overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Flame className="w-5 h-5 text-indigo" />
              Micro-Hábitos
            </CardTitle>
            <span className="text-[10px] font-black text-indigo bg-indigo/10 px-3 py-1 rounded-full uppercase tracking-widest">
              {habits.filter(h => h.last_completed_at && isToday(parseISO(h.last_completed_at))).length}/{habits.length} Concluídos
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {habits.map((habit) => {
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
                          <Circle className="w-7 h-7 text-border group-hover:text-indigo/40 transition-colors" />
                        )}
                      </button>
                      <div>
                        <h3 className={cn(
                          "font-bold text-lg transition-all", 
                          completedToday ? "text-muted line-through" : "text-foreground"
                        )}>
                          {habit.name}
                        </h3>
                        <p className="text-sm text-muted font-medium">{habit.goal_description}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-xl transition-all",
                      activeStreak > 0 
                        ? "text-orange bg-orange/10 ring-1 ring-orange/20" 
                        : "text-muted bg-muted/5"
                    )}>
                      <Flame className={cn("w-4 h-4", activeStreak > 0 && "fill-current animate-pulse")} />
                      {activeStreak}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-xl shadow-indigo/5 bg-surface">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo" />
                Foco do Dia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tasks.map((task) => (
                <div 
                  key={task.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl hover:bg-muted/5 transition-colors cursor-pointer group",
                    task.is_completed && "opacity-40"
                  )}
                  onClick={() => toggleTask(task.id, task.is_completed)}
                >
                  <div className="mt-0.5">
                    {task.is_completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green" />
                    ) : (
                      <Circle className="w-5 h-5 text-border group-hover:text-indigo/40" />
                    )}
                  </div>
                  <span className={cn(
                    "text-sm font-bold transition-all",
                    task.is_completed ? "text-muted line-through" : "text-foreground"
                  )}>
                    {task.title}
                  </span>
                </div>
              ))}
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
          </Card>

          <section className="accent-gradient text-white rounded-3xl p-8 relative overflow-hidden shadow-xl shadow-indigo/20">
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

      <CreateHabitModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleCreateHabit}
      />
    </div>
  )
}
